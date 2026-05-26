"""
Boss Rush — Improved Dog Boss Sprite Generator
Ports generate-dog-sprites.html to Python (Pillow) with enhanced boss props.
Only writes boss-tier folders: capstone, mini-boss, and planet.
Each folder gets 3 PNGs: combat_healthy.png, combat_alert.png, combat_hurt.png
All sprites: 96×96 px, left-facing side profile, no anti-aliasing.
"""

from PIL import Image
import os, math

# ---------------------------------------------------------------------------
# Palettes  (RGB tuples — exact hex from style guide)
# ---------------------------------------------------------------------------
PALETTES = {
    'human':     {'o':(10,10,18), 'fur':(200,160,112),'hi':(232,200,144),'sh':(138,96,56),  'acc':(85,136,204), 'eye':(26,26,40),  'nose':(58,40,32),  'tongue':(232,88,104)},
    'monster':   {'o':(10,10,18), 'fur':(104,184,72), 'hi':(152,232,120),'sh':(56,136,40),  'acc':(168,72,200), 'eye':(255,64,64),  'nose':(40,72,24),  'tongue':(136,255,136)},
    'hell':      {'o':(10,10,18), 'fur':(138,40,40),  'hi':(200,72,72),  'sh':(74,16,16),   'acc':(255,68,136), 'eye':(255,204,0),  'nose':(42,8,8),    'tongue':(255,96,96)},
    'space':     {'o':(10,10,18), 'fur':(74,104,136), 'hi':(120,168,200),'sh':(40,56,72),   'acc':(136,232,255),'eye':(160,240,255),'nose':(26,48,64),  'tongue':(104,200,232)},
    'alien':     {'o':(10,10,18), 'fur':(104,200,160),'hi':(152,240,200),'sh':(56,136,96),  'acc':(200,120,255),'eye':(16,16,16),  'nose':(32,72,56),  'tongue':(120,255,168)},
    'mirror':    {'o':(10,10,18), 'fur':(122,120,168),'hi':(170,168,216),'sh':(74,72,104),  'acc':(216,208,255),'eye':(232,232,255),'nose':(58,56,88),  'tongue':(184,176,232)},
    'heaven_low':{'o':(10,10,18), 'fur':(240,232,200),'hi':(255,248,224),'sh':(200,184,136),'acc':(255,216,88), 'eye':(64,136,255),'nose':(138,120,88),'tongue':(240,160,160)},
    'olympus':   {'o':(10,10,18), 'fur':(216,192,112),'hi':(255,240,160),'sh':(168,136,64), 'acc':(255,224,64), 'eye':(26,26,40),  'nose':(106,80,32), 'tongue':(232,120,88)},
    'pantheon':  {'o':(10,10,18), 'fur':(232,216,176),'hi':(255,248,232),'sh':(184,160,112),'acc':(200,160,48), 'eye':(96,32,160), 'nose':(122,104,72),'tongue':(208,160,112)},
    'angelic':   {'o':(10,10,18), 'fur':(248,240,255),'hi':(255,255,255),'sh':(208,200,224),'acc':(136,200,255),'eye':(40,64,160), 'nose':(168,152,184),'tongue':(255,176,192)},
}

PLANET_TINT = {
    'mercury':{'fur':(184,176,160),'acc':(255,170,68)},
    'venus':  {'fur':(232,200,120),'acc':(136,204,68)},
    'earth':  {'fur':(106,154,88), 'acc':(68,136,204)},
    'mars':   {'fur':(200,96,72),  'acc':(255,136,68)},
    'jupiter':{'fur':(216,168,104),'acc':(200,120,56)},
    'saturn': {'fur':(232,208,160),'acc':(240,232,200)},
    'uranus': {'fur':(120,216,232),'acc':(168,240,255)},
    'neptune':{'fur':(72,104,200), 'acc':(104,136,255)},
}

# ---------------------------------------------------------------------------
# Pixel canvas  (grid-based rect fills, 24×24 logical cells → 96×96 px)
# ---------------------------------------------------------------------------
SIZE = 96
U    = SIZE // 24   # = 4

class DogCanvas:
    def __init__(self):
        self.img  = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
        self._pix = self.img.load()

    def fill(self, gx, gy, gw, gh, color):
        """Fill a grid rect. color = RGB tuple."""
        x0 = max(0, round(gx * U));  x1 = min(SIZE, round((gx + gw) * U))
        y0 = max(0, round(gy * U));  y1 = min(SIZE, round((gy + gh) * U))
        rgba = color + (255,)
        for y in range(y0, y1):
            for x in range(x0, x1):
                self._pix[x, y] = rgba

    # Convenience alias matching JS px(gx, gy, gw, gh, color)
    def px(self, gx, gy, gw, gh, color):
        self.fill(gx, gy, gw, gh, color)

    def dot(self, gx, gy, color):
        self.fill(gx, gy, 1, 1, color)

    def image(self):
        return self.img

# ---------------------------------------------------------------------------
# Key parser
# ---------------------------------------------------------------------------
def parse_key(key):
    if key == 'angelic_cap_doggod':
        return {'theme': 'angelic', 'tier': 'capstone', 'tag': 'doggod'}
    if key == 'hell_trash_powerpup':
        return {'theme': 'hell', 'tier': 'trash', 'tag': 'powerpup', 'variant': 2}
    if key.startswith('space_planet_'):
        planet = key.replace('space_planet_', '')
        return {'theme': 'space', 'tier': 'planet', 'planet': planet, 'tag': None}
    parts = key.split('_')
    theme = parts[0] if parts[0] in PALETTES else 'human'
    if len(parts) >= 2:
        tier_word = parts[1]
        tag = '_'.join(parts[2:]) if len(parts) > 2 else ''
        if tier_word == 'mini':    return {'theme': theme, 'tier': 'mini',     'tag': tag}
        if tier_word == 'cap':     return {'theme': theme, 'tier': 'capstone', 'tag': tag}
        if tier_word == 'trash':   return {'theme': theme, 'tier': 'trash',    'tag': tag}
    return {'theme': theme, 'tier': 'trash', 'tag': ''}

# ---------------------------------------------------------------------------
# Base dog body  (left-facing side profile)
# ---------------------------------------------------------------------------
def draw_dog_side_profile(cv, pal, bulky=False, snout_long=False,
                          ear_floppy=False, tongue_out=False, collar=True):
    p = cv.px
    y0 = 5 if bulky else 6
    bW = 11 if bulky else 9
    bH =  9 if bulky else 8

    # Haunches / rear
    p(16, y0+4, 5, bH-2, pal['fur'])
    p(17, y0+5, 4, bH-4, pal['hi'])
    p(20, y0+3, 2, 4,    pal['sh'])
    # Extra haunch shading line
    p(16, y0+4, 1, bH-2, pal['sh'])

    # Chest + belly
    p(9,  y0+5, bW,   bH-1, pal['fur'])
    p(10, y0+6, bW-2, bH-3, pal['hi'])
    p(9,  y0+5, 1,    bH,   pal['sh'])

    # Neck
    p(8, y0+3, 4, 5, pal['fur'])
    p(8, y0+3, 1, 5, pal['sh'])

    # Head block
    p(5, y0+1, 5, 6, pal['fur'])
    p(6, y0+2, 4, 4, pal['hi'])
    # Head top shade
    p(5, y0+1, 5, 1, pal['sh'])

    # Snout
    sl = 5 if snout_long else 4
    p(2, y0+3, sl, 3, pal['hi'])
    p(1, y0+4, 2,  2, pal['sh'])
    p(0, y0+4, 1,  2, pal['nose'])
    # Snout top highlight
    p(2, y0+3, sl, 1, pal['fur'])
    # Jaw underline
    p(3, y0+5, sl, 1, pal['sh'])

    # Ear
    if ear_floppy:
        p(7, y0,   3, 3, pal['fur'])
        p(8, y0+1, 2, 2, pal['sh'])
    else:
        p(8, y0,   2, 4, pal['fur'])
        p(8, y0,   1, 4, pal['sh'])
        # Ear inner highlight
        p(9, y0+1, 1, 2, pal['hi'])

    # Eye (side profile — one eye)
    p(6, y0+3, 2, 2, pal['eye'])
    cv.dot(6, y0+3, (248, 248, 255))   # eye highlight pixel

    # Legs (three visible in profile)
    p(10, y0+bH+3, 2, 4, pal['sh'])
    p(14, y0+bH+3, 2, 4, pal['sh'])
    p(18, y0+bH+2, 2, 4, pal['sh'])
    # Leg fur highlights
    p(11, y0+bH+4, 1, 2, pal['fur'])
    p(15, y0+bH+4, 1, 2, pal['fur'])
    # Paw tips
    p(10, y0+bH+6, 2, 1, pal['fur'])
    p(14, y0+bH+6, 2, 1, pal['fur'])
    p(18, y0+bH+5, 2, 1, pal['fur'])

    # Tail (curves up behind)
    p(19, y0+1, 2, 2, pal['fur'])
    p(20, y0,   2, 3, pal['acc'])
    p(21, y0-1, 1, 2, pal['acc'])
    # Tail highlight
    cv.dot(20, y0, pal['hi'])

    if collar:
        p(8, y0+6, 4, 1, pal['acc'])
        # Collar tag
        cv.dot(10, y0+6, pal['hi'])

    if tongue_out:
        p(1, y0+5, 2, 2, pal['tongue'])
        cv.dot(1, y0+5, (255,255,255))  # tongue highlight

    # Outline accents
    cv.dot(5,  y0,       pal['o'])
    cv.dot(0,  y0+3,     pal['o'])
    p(16, y0+bH+6, 5, 1, pal['o'])  # feet baseline

# ---------------------------------------------------------------------------
# Boss-unique prop layers
# ---------------------------------------------------------------------------
def draw_boss_unique(key, info, cv, pal):
    p   = cv.px
    dot = cv.dot
    tier  = info.get('tier')
    tag   = info.get('tag', '')
    theme = info.get('theme', 'human')
    planet = info.get('planet')

    # ---- PLANET props ----
    if planet and planet in PLANET_TINT:
        t = PLANET_TINT[planet]
        # Planet orb behind dog
        p(1, 2, 4, 4, t['acc'])
        dot(2, 3, (255,255,255))  # orb glint
        if planet == 'saturn':
            # Ring across body
            p(12, 11, 10, 1, t['acc'])
            p(10, 10,  1, 3, t['acc'])
            p(22, 10,  1, 3, t['acc'])
            dot(16, 11, (255,255,255))
        elif planet == 'jupiter':
            # Storm band on body
            p(11,  9, 8, 2, t['acc'])
            p(12, 10, 6, 1, (200,120,56))
            dot(14, 9, (255,240,200))
        elif planet == 'earth':
            # Blue/green globe patch
            p(14, 8, 4, 4, (68,136,204))
            p(15, 9, 2, 2, (106,154,88))
            dot(14, 8, (255,255,255))
        elif planet == 'mars':
            # Red dust puff at snout
            p(0, 8, 3, 3, (255,68,34))
            dot(1, 9, (255,136,68))
        elif planet == 'neptune':
            # Deep tail cloud
            p(18, 14, 4, 3, (40,64,168))
            dot(19,14, (104,136,255))
        elif planet == 'mercury':
            p(1, 2, 4, 4, t['acc'])
        elif planet == 'uranus':
            # Pale ring hint
            p(10, 0, 6, 1, t['acc'])
        return

    # ---- CAPSTONE tags ----
    if tag == 'guy_dog' or (tier == 'capstone' and theme == 'human'):
        # Human legs + shirt behind dog
        p(14, 4, 4, 10, (106,138,154))   # jeans
        p(15, 5, 2,  8, (136,170,136))   # shirt
        p(16, 3, 2,  2, (232,200,160))   # face peek
        dot(16, 3, (255,220,180))         # face hi
        p(7,  14, 3, 1, pal['acc'])       # shoe tip
        return

    if tag == 'chimera':
        # Extra horns
        p(2, 0, 5, 2, pal['acc'])
        p(3, 1, 3, 2, pal['hi'])
        dot(3, 0, (255,255,255))
        # Snake tail (green)
        p(20, 12, 4, 2, pal['acc'])
        p(21, 13, 3, 5, (104,200,72))
        p(22, 15, 2, 4, pal['sh'])
        dot(22, 13, (136,255,136))
        return

    if tag == 'devil_pair':
        # Pink devil blob
        p(16, 2, 5, 9, (255,68,136))
        p(17, 3, 3, 7, (204,34,102))
        p(18, 1, 2, 2, pal['acc'])
        p(19, 0, 2, 2, pal['acc'])
        dot(17, 3, (255,136,170))         # devil hi
        return

    if tag == 'solar':
        # 8 sun rays around center
        cx, cy = 12, 10
        for i in range(8):
            ang = (i / 8) * math.pi * 2
            sx = cx + round(math.cos(ang) * 9)
            sy = cy + round(math.sin(ang) * 7)
            p(sx, sy, 2, 2, (255,224,64))
        # Sun core
        p(10, 6, 8, 8, (255,184,48))
        p(11, 7, 6, 6, (255,240,160))
        dot(13, 8, (255,255,255))
        return

    if tag == 'galaxy_apex':
        # Antenna
        p(17, 1, 4, 3, pal['acc'])
        p(18, 0, 2, 5, pal['acc'])
        dot(18, 0, (255,255,255))
        # Star specks
        p(5,  2, 2, 1, (200,120,255))
        p(7,  4, 2, 1, (200,120,255))
        dot(4, 6, (136,255,136))
        dot(21, 3, (255,255,255))
        return

    if tag == 'inverted':
        # Mirror accents
        p(2, 16, 3, 2, pal['acc'])
        p(18, 4, 2, 2, pal['hi'])
        p(12,  0, 6, 1, (216,208,255))
        dot(15, 0, (255,255,255))
        return

    if tag == 'seraph':
        # Wings (halo + wing panels)
        p(10, 0, 8, 2, (255,248,192))    # halo band
        p(8,  1, 2, 5, (255,248,232))    # left wing
        p(18, 1, 2, 5, (255,248,232))    # right wing
        p(11, 0, 6, 1, pal['acc'])       # halo highlight
        dot(14, 0, (255,255,255))
        # Wing feather detail
        p(8, 3, 2, 1, pal['acc'])
        p(18,3, 2, 1, pal['acc'])
        return

    if tag == 'zeusion':
        # Lightning bolt crown
        p(11, 0, 2, 6, (255,240,160))
        p(12, 0, 1, 8, (255,224,64))
        p(13, 1, 3, 2, (255,255,255))
        p(10, 2, 1, 4, (255,224,64))
        dot(12, 0, (255,255,255))
        return

    if tag == 'unnamed':
        # Void cloak — dominant dark mass
        p(8,  0, 10,  3, (26, 16, 48))
        p(9,  1,  8, 14, (42, 24, 72))
        p(10, 4,  6,  8, (64, 32, 96))
        p(12, 6,  2,  4, pal['acc'])
        dot(4,  3, (255,248,224))         # void eye glint L
        dot(20, 5, (255,248,224))         # void eye glint R
        return

    if tag == 'doggod':
        # All-seeing divine fluff — covers most of frame
        p(2,  4, 14, 14, (240,232,255))  # outer white fluff
        p(4,  6, 10, 10, (255,255,255))  # bright core
        p(6,  8,  6,  6, pal['eye'])     # eye glow
        p(7,  9,  4,  4, (16, 32,160))   # deep eye
        p(8, 10,  2,  2, (0,   0,  0))   # pupil
        dot(5,  7, pal['acc'])            # acc glint L
        dot(11, 7, pal['acc'])            # acc glint R
        # Gold horns
        p(3,  5, 2, 1, (255,216,88))
        p(13, 5, 2, 1, (255,216,88))
        dot(3,  4, (255,255,200))
        dot(14, 4, (255,255,200))
        return

    # ---- Generic capstone fallback per theme ----
    if tier == 'capstone':
        if theme == 'monster':
            p(1,  1, 4, 3, pal['acc'])
            dot(2, 1, (255,255,255))
            p(20, 2, 3, 4, (104,200,72))
            p(21, 6, 2, 5, pal['sh'])
        elif theme == 'hell':
            p(0,  10, 3, 4, (255,34,0))
            p(22,  8, 2, 5, (255,102,34))
            p(12,  0, 4, 2, pal['acc'])
            dot(13, 0, (255,255,255))
        elif theme == 'space':
            p(0,  4, 3, 3, (136,204,255))
            p(21, 5, 3, 3, (255,224,64))
            p(10, 0, 6, 2, (200,216,255))
            dot(13, 0, (255,255,255))
        elif theme == 'alien':
            p(3,  0, 2, 2, (200,120,255))
            p(19, 1, 3, 2, (136,255,136))
            p(11, 14, 4, 2, pal['acc'])
            dot(3, 0, (255,255,255))
        elif theme == 'mirror':
            p(1,  3, 2, 2, (216,208,255))
            p(20, 12, 3, 2, pal['hi'])
            p(8,  0, 10, 1, (144,128,192))
            dot(13, 0, (255,255,255))
        elif theme == 'heaven_low':
            p(9,  0, 8, 2, (255,248,192))
            p(7,  1, 2, 4, (255,248,232))
            p(17, 1, 2, 4, (255,248,232))
            dot(13, 0, (255,255,255))
        elif theme == 'olympus':
            p(10, 0, 4, 5, (255,240,160))
            p(14, 0, 2, 6, (255,224,64))
            p(12, 6, 2, 2, (255,255,255))
            dot(11, 0, (255,255,255))
        elif theme == 'pantheon':
            p(7,  0, 12,  3, (26, 16, 48))
            p(9,  2,  8, 12, (64, 32, 96))
            p(11, 5,  4,  6, pal['acc'])
            dot(12, 5, (255,255,255))
        elif theme == 'angelic':
            p(8,  0, 10, 2, (255,248,232))
            p(6,  1,  2, 5, (255,248,192))
            p(18, 1,  2, 5, (255,248,192))
            dot(13, 0, (255,255,255))
        elif theme == 'human':
            p(14, 3, 5, 9, (106,138,154))
            p(16, 4, 2, 2, (232,200,160))
        return

    # ---- MINI-BOSS props ----
    if tier == 'mini':
        if tag == 'hoa_chair':
            # Brown gavel
            p(15, 8, 5, 4, (106,80,64))
            p(17, 6, 2, 3, (138,104,80))
            dot(17, 6, (200,160,120))
        elif tag == 'lair_keeper':
            # Acc crate / torch
            p(18, 10, 4, 5, pal['acc'])
            p(19, 9,  2, 2, (255,200,64))
            dot(19, 9, (255,255,200))
        elif tag == 'pit_captain':
            # Horn
            p(16, 2, 3, 3, (255,102,34))
            p(17, 1, 2, 2, (255,136,68))
            dot(17, 1, (255,220,180))
        elif tag == 'hive_alpha':
            # Crown nub
            p(17, 0, 3, 4, pal['acc'])
            p(18, 0, 1, 3, pal['hi'])
            dot(18, 0, (255,255,255))
        elif tag == 'gate_guard':
            # Halo band
            p(9,  0, 8, 2, (255,248,192))
            p(11, 0, 4, 1, pal['acc'])
            dot(13, 0, (255,255,255))
        elif tag == 'hero_hound':
            # Laurel wreath
            p(10, 0, 4, 3, (255,224,64))
            p(11, 0, 2, 2, (255,240,120))
            dot(12, 0, (255,255,200))
        elif tag == 'high_priest':
            # Staff stripe
            p(8, 0, 2, 5, pal['acc'])
            p(9, 0, 1, 4, pal['hi'])
            dot(9, 0, (255,255,255))
        elif tag == 'arch_pup':
            # Wing nub
            p(10, 0, 6, 2, pal['acc'])
            p(11, 0, 4, 1, pal['hi'])
            dot(13, 0, (255,255,255))
        elif tag == 'reflection':
            # Mirror theme mini — echo/shimmer accents
            p(1,  3, 2, 2, (216,208,255))
            p(20,12, 3, 2, pal['hi'])
            p(8,  0, 8, 1, (144,128,192))
            dot(12, 0, (255,255,255))

# ---------------------------------------------------------------------------
# Pose overlay (applied on top of base image)
# ---------------------------------------------------------------------------
def apply_pose_overlay(cv, pal, pose):
    p = cv.px
    if pose == 'alert':
        # White eye-flash near snout
        p(3, 1, 2, 2, (255,255,255))
        # Sweat drop
        p(7, 2, 1, 3, (136,187,238))
        dot_f = cv.dot
        dot_f(7, 2, (255,255,255))
        # Tension line on body
        p(10, 8, 6, 1, pal['sh'])
    elif pose == 'hurt':
        # Head bandage
        p(5,  3, 4, 2, (232,232,240))
        p(6,  4, 2, 1, (208,48,48))
        # Hurt splats
        p(12, 10, 3, 2, (208,48,48))
        p(9,  14, 2, 1, (208,48,48))
        cv.dot(11, 10, (255,80,80))

# ---------------------------------------------------------------------------
# Top-level sprite builder
# ---------------------------------------------------------------------------
def draw_dog_combat(key, pose):
    info  = parse_key(key)
    theme = info.get('theme', 'human')
    pal   = dict(PALETTES.get(theme, PALETTES['human']))

    # Apply planet fur/acc tint
    planet = info.get('planet')
    if planet and planet in PLANET_TINT:
        pal['fur'] = PLANET_TINT[planet]['fur']
        pal['acc'] = PLANET_TINT[planet]['acc']

    tier  = info.get('tier', 'trash')
    tag   = info.get('tag', '')
    is_boss = tier in ('capstone', 'planet')
    is_mini = tier == 'mini'

    cv = DogCanvas()
    p  = cv.px

    # Draw boss-unique layer FIRST (behind dog body)
    draw_boss_unique(key, info, cv, pal)

    # Draw dog body on top
    if is_boss:
        draw_dog_side_profile(cv, pal,
            bulky=True, snout_long=True,
            ear_floppy=(tag == 'guy_dog'),
            tongue_out=False,
            collar=(tag != 'doggod'))
    elif is_mini:
        draw_dog_side_profile(cv, pal,
            bulky=True, snout_long=False,
            ear_floppy=False, tongue_out=False, collar=True)
    else:
        draw_dog_side_profile(cv, pal,
            bulky=False, snout_long=False,
            ear_floppy=False, tongue_out=False, collar=True)

    # Pose overlay last
    apply_pose_overlay(cv, pal, pose)

    return cv.image()

# ---------------------------------------------------------------------------
# Boss sprite keys to generate
# ---------------------------------------------------------------------------
BOSS_KEYS = [
    # Capstones
    'human_cap_guy_dog',
    'monster_cap_chimera',
    'hell_cap_devil_pair',
    'space_cap_solar',
    'alien_cap_galaxy_apex',
    'mirror_cap_inverted',
    'heaven_low_cap_seraph',
    'olympus_cap_zeusion',
    'pantheon_cap_unnamed',
    'angelic_cap_doggod',
    # Mini-bosses
    'human_mini_hoa_chair',
    'monster_mini_lair_keeper',
    'hell_mini_pit_captain',
    'alien_mini_hive_alpha',
    'heaven_low_mini_gate_guard',
    'olympus_mini_hero_hound',
    'pantheon_mini_high_priest',
    'angelic_mini_arch_pup',
    'mirror_mini_reflection',
    # Planet bosses
    'space_planet_mercury',
    'space_planet_venus',
    'space_planet_earth',
    'space_planet_mars',
    'space_planet_jupiter',
    'space_planet_saturn',
    'space_planet_uranus',
    'space_planet_neptune',
]

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
BASE = '/sessions/compassionate-jolly-cannon/mnt/Boss Rush/public/sprites/dogs'

total = 0
for key in BOSS_KEYS:
    d = f'{BASE}/{key}'
    os.makedirs(d, exist_ok=True)
    for pose in ('healthy', 'alert', 'hurt'):
        img = draw_dog_combat(key, pose)
        assert img.size == (96, 96)
        path = f'{d}/combat_{pose}.png'
        img.save(path)
        total += 1
    print(f'  ✓  {key}')

print(f'\nDone — {total} PNGs written.')
