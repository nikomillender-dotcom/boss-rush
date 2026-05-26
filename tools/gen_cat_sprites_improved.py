"""
Boss Rush — Improved Cat Sprite Generator
Ports generate-cat-sprites.html to Python (Pillow) with enhanced detail passes.
Outputs 40 PNGs: 10 classes × (box 48×48 + 3 combat 96×96).
"""

from PIL import Image
import os, sys

# ---------------------------------------------------------------------------
# Palette  (RGB tuples — same hex as style guide / JS source)
# ---------------------------------------------------------------------------
P = {
    'outline':  (10,  10,  18),
    'fur':      (30,  30,  40),
    'furHi':    (58,  58,  72),
    'furSh':    (18,  18,  24),
    'chest':    (90,  90, 104),
    'eye':      (90, 232,  72),
    'eyeHi':   (154, 255, 120),
    'fang':    (248, 248, 248),
    'nose':    (232,  88,  72),
    'mage':    (107,  63, 168),
    'mageHi':  (154, 111, 212),
    'mageSh':   (74,  40, 120),
    'band':    (106,  68,  40),
    'gold':    (232, 200,  56),
    'goldHi':  (255, 240, 160),
    'silver':  (138, 152, 168),
    'silverHi':(200, 216, 232),
    'silverSh': (90, 104, 120),
    'rogue':    (42,  40,  56),
    'rogueHi':  (74,  72,  96),
    'rogueSh':  (20,  18,  32),
    'teal':     (56, 184, 176),
    'tealHi':  (104, 232, 224),
    'leather':  (106, 68,  32),
    'sweat':   (136, 187, 238),
    'hurt':    (208,  48,  48),
    'bandage': (232, 232, 240),
    'sparkle':  (10,  10,  18),
    'holy':    (200, 168,  48),
    'holyHi':  (240, 224, 112),
    'holySh':  (138, 112,  32),
    'clerical':(232, 232, 248),
    'sun':     (255, 176,  64),
    'sunHi':   (255, 224, 128),
    'plague':  (104, 200,  72),
    'plagueSh': (56, 136,  40),
    'white':   (255, 255, 255),
    'bg':       (8,    8,  16),
}

CLASS_GEAR = {
    'warrior':    {'cape': P['silver'],  'capeHi': P['silverHi'], 'capeSh': P['silverSh'], 'hat': P['silver'],  'accent': P['gold']},
    'mage':       {'cape': P['mage'],    'capeHi': P['mageHi'],   'capeSh': P['mageSh'],   'hat': P['mage'],    'accent': P['gold']},
    'rogue':      {'cape': P['rogue'],   'capeHi': P['rogueHi'],  'capeSh': P['rogueSh'],  'hat': P['rogue'],   'accent': P['leather']},
    'cleric':     {'cape': P['holySh'],  'capeHi': P['holy'],     'capeSh': P['holySh'],   'hat': P['clerical'],'accent': P['holyHi']},
    'mage_knight':{'cape': P['mage'],    'capeHi': P['mageHi'],   'capeSh': P['mageSh'],   'hat': P['mage'],    'accent': P['teal']},
    'sage':       {'cape': P['mage'],    'capeHi': P['mageHi'],   'capeSh': P['mageSh'],   'hat': P['mage'],    'accent': P['holy']},
    'templar':    {'cape': P['silver'],  'capeHi': P['silverHi'], 'capeSh': P['silverSh'], 'hat': P['silver'],  'accent': P['sun']},
    'duelist':    {'cape': P['rogue'],   'capeHi': P['rogueHi'],  'capeSh': P['rogueSh'],  'hat': P['silver'],  'accent': P['leather']},
    'arcanist':   {'cape': P['rogue'],   'capeHi': P['rogueHi'],  'capeSh': P['rogueSh'],  'hat': P['mage'],    'accent': P['teal']},
    'plaguecat':  {'cape': P['rogue'],   'capeHi': P['rogueHi'],  'capeSh': P['rogueSh'],  'hat': P['plagueSh'],'accent': P['plague']},
}

CLASSES = ['warrior','mage','rogue','cleric','mage_knight','sage','templar','duelist','arcanist','plaguecat']
SPARKLE_GRID = [(2,8),(20,6),(21,14),(1,15)]

# ---------------------------------------------------------------------------
# Grid buffer  (24×24 logical pixels)
# ---------------------------------------------------------------------------
class GridBuffer:
    def __init__(self):
        self.px = {}

    def set(self, x, y, c):
        if x < 0 or y < 0 or x >= 24 or y >= 24 or c is None:
            return
        self.px[(x, y)] = c

    def rect(self, x, y, w, h, c):
        for dy in range(h):
            for dx in range(w):
                self.set(x+dx, y+dy, c)

    def line(self, x0, y0, x1, y0_or_y1, c):
        """Horizontal or vertical line helper."""
        if y0 == y0_or_y1:                        # horizontal
            for x in range(min(x0,x1), max(x0,x1)+1):
                self.set(x, y0, c)
        else:                                       # vertical
            for y in range(min(y0,y0_or_y1), max(y0,y0_or_y1)+1):
                self.set(x0, y, c)

    def outline(self):
        filled = dict(self.px)
        for (x, y) in list(filled.keys()):
            for nx, ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if (nx, ny) not in filled:
                    self.set(nx, ny, P['outline'])

    def to_image(self, size):
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        pix = img.load()
        u = size // 24
        for (gx, gy), color in self.px.items():
            for py in range(gy*u, min((gy+1)*u, size)):
                for px in range(gx*u, min((gx+1)*u, size)):
                    pix[px, py] = color + (255,)
        return img

# ---------------------------------------------------------------------------
# Helper: overlay fills directly on a PIL image
# ---------------------------------------------------------------------------
def fill_img(img, gx, gy, gw, gh, color, size=96):
    u = size // 24
    pix = img.load()
    rgba = color + (255,)
    for py in range(gy*u, min((gy+gh)*u, size)):
        for px in range(gx*u, min((gx+gw)*u, size)):
            if 0 <= px < size and 0 <= py < size:
                pix[px, py] = rgba

# ---------------------------------------------------------------------------
# Front-box class props  (improved vs JS original)
# ---------------------------------------------------------------------------
def draw_front_class_props(cls, gear, buf):
    s, r = buf.set, buf.rect

    if cls == 'warrior':
        # Broad silver helm with gold visor band
        r(5, 0, 14, 5, gear['hat'])
        r(6, 1, 12, 3, P['silverHi'])     # helm highlight dome
        r(7, 0, 10, 1, gear['accent'])    # gold brow band
        r(8, 3,  8, 1, P['silverSh'])     # visor shadow line
        # Shield on left side — cross detail
        r(1, 13, 3, 7, P['silver'])
        r(2, 12, 1, 1, P['silverHi'])
        r(2, 14, 1, 3, P['gold'])         # shield cross vertical
        r(1, 15, 3, 1, P['gold'])         # shield cross horizontal

    elif cls == 'mage':
        # Tall wizard hat — brim + cone with star
        r(7,  2, 10, 1, P['mageHi'])      # brim highlight
        r(8,  0,  8, 6, gear['hat'])
        r(10, 0,  4, 2, gear['capeHi'])   # hat sheen
        s(11, 1, P['goldHi'])             # star pixel
        s(12, 2, P['gold'])               # star pixel
        # Staff on right with glowing orb
        r(19, 8,  2, 10, gear['hat'])
        r(19, 6,  2,  2, P['goldHi'])     # orb glow
        s(19, 7, P['gold'])

    elif cls == 'rogue':
        # Wide hood with shadow flaps
        r(4,  1, 16, 5, gear['hat'])
        r(4,  2,  2, 8, gear['hat'])      # left flap
        r(18, 2,  2, 8, gear['hat'])      # right flap
        r(5,  2, 14, 2, P['rogueHi'])     # hood inner highlight
        # Dagger on right hip
        r(21, 13, 2, 6, P['leather'])
        s(22, 13, P['silverHi'])          # blade gleam
        s(21, 18, P['gold'])              # pommel

    elif cls == 'cleric':
        # White mitre hat
        r(8, 1, 8, 4, P['clerical'])
        r(9, 1, 6, 1, P['white'])         # mitre highlight
        r(11,1, 2, 3, P['holy'])          # gold cross on hat
        # Holy tabard with prominent cross
        r(9,  13, 6, 4, P['holy'])
        r(11, 12, 2, 6, P['holyHi'])      # vertical cross bar
        r(9,  14, 6, 2, P['holyHi'])      # horizontal cross bar
        r(11, 13, 2, 1, P['white'])       # bright cross center

    elif cls == 'mage_knight':
        # Silver helm (warrior) + teal mage accent
        r(5, 0, 14, 4, P['silver'])
        r(6, 0, 12, 2, P['silverHi'])
        r(7, 3, 10, 1, P['gold'])         # gold brow band
        # Shield on left (silver)
        r(1, 13, 3, 7, P['silver'])
        r(2, 14, 1, 3, P['teal'])         # teal cross on shield
        r(1, 15, 3, 1, P['teal'])
        # Teal mage staff on right
        r(19, 8, 2, 10, P['teal'])
        s(19, 7, P['tealHi'])
        # Mage emblem on chest
        r(10, 13, 4, 2, P['mage'])
        s(11, 13, P['tealHi'])

    elif cls == 'sage':
        # Mage hat with holy gold accent
        r(8, 0, 8, 6, P['mage'])
        r(10,0, 4, 2, P['mageHi'])
        s(11, 1, P['holyHi'])             # holy star
        # Staff with holy orb
        r(19, 8, 2, 10, P['mageHi'])
        s(19, 7, P['holyHi'])
        # Holy tabard on chest
        r(9, 13, 6, 3, P['holy'])
        r(11,14, 2, 1, P['holyHi'])
        s(12, 14, P['white'])

    elif cls == 'templar':
        # Silver helm with radiant sun brow
        r(5, 0, 14, 5, P['silver'])
        r(6, 0, 12, 3, P['silverHi'])
        r(7, 3, 10, 1, P['sun'])          # sun brow band
        # Shield on left with sun emblem
        r(1, 13, 3, 7, P['silver'])
        r(2, 14, 1, 3, P['sun'])
        r(1, 15, 3, 1, P['sun'])
        s(2, 15, P['sunHi'])              # sun center
        # Tabard sun symbol
        r(9,  13, 6, 3, P['sun'])
        r(11, 14, 2, 1, P['sunHi'])

    elif cls == 'duelist':
        # Silver helm + rogue hood flaps (combo visual)
        r(5,  0, 14, 4, P['silver'])
        r(6,  0, 12, 2, P['silverHi'])
        r(4,  2,  2, 7, P['rogue'])       # left hood flap
        r(18, 2,  2, 7, P['rogue'])       # right hood flap
        # Dual weapons: dagger right + short sword left
        r(21, 13, 2, 6, P['leather'])
        s(22, 13, P['silverHi'])
        r(1,  14, 2, 6, P['silver'])
        s(1,  14, P['silverHi'])
        s(2,  19, P['gold'])              # left sword pommel

    elif cls == 'arcanist':
        # Rogue hood + mage hat layered
        r(4, 1, 16, 5, P['rogue'])
        r(8, 0,  8, 5, P['mage'])
        r(10,0,  4, 2, P['mageHi'])
        s(11, 1, P['tealHi'])             # teal star
        # Teal-tipped staff + rogue dagger
        r(19, 8, 2, 10, P['mage'])
        s(19, 7, P['tealHi'])
        r(21, 13, 2, 5, P['rogueHi'])
        s(22, 13, P['tealHi'])

    elif cls == 'plaguecat':
        # Rogue hood with plague green tinge
        r(4,  1, 16, 5, P['rogue'])
        r(5,  2, 14, 2, P['rogueHi'])
        # Plague mask patch on face
        r(10, 5,  4, 2, P['plague'])
        s(11, 5, P['plagueSh'])
        # Toxic vial on chest / hip
        r(8,  12, 8, 6, P['plagueSh'])
        r(9,  13, 6, 3, P['plague'])
        s(12, 13, P['white'])             # vial glint
        r(21, 13, 2, 6, P['plagueSh'])
        s(21, 13, P['plague'])

# ---------------------------------------------------------------------------
# Back-combat class props  (improved)
# ---------------------------------------------------------------------------
def draw_back_class_props(cls, g, buf):
    s, r = buf.set, buf.rect

    if cls == 'warrior':
        # Sword on left side of cape
        r(2, 11, 3, 7, P['silver'])
        r(2, 11, 1, 5, P['silverHi'])     # blade edge gleam
        s(2, 17, P['gold'])               # cross-guard
        s(4, 17, P['gold'])
        # Helmet crest on back
        r(9, 10, 6, 4, g['hat'])
        r(10,10, 4, 2, P['silverHi'])

    elif cls == 'mage':
        # Staff on right, taller
        r(17, 8, 3, 11, g['hat'])
        r(18, 8, 1,  9, P['mageHi'])      # staff highlight
        # Orb at top of staff
        r(17, 6, 3,  3, P['goldHi'])
        r(18, 6, 1,  1, P['white'])       # orb core
        # Tall hat from behind
        r(8, 0, 8, 3, g['hat'])
        r(9, 0, 6, 1, P['mageHi'])

    elif cls == 'rogue':
        # Hood from behind (wide)
        r(4,  1, 16, 6, g['hat'])
        r(5,  2, 14, 3, P['rogueHi'])     # hood inner lining
        # Dagger sheath on right
        r(17, 12, 3, 6, P['rogue'])
        r(18, 12, 1, 5, P['leather'])
        s(18, 17, P['silverHi'])

    elif cls == 'cleric':
        # Holy aura bar on upper cape
        r(8,  10, 8, 5, P['holy'])
        r(9,  11, 6, 2, P['holyHi'])
        s(11, 12, P['white'])
        # Mitre from behind
        r(10,  0, 4, 3, P['clerical'])
        r(11,  0, 2, 1, P['white'])

    elif cls == 'mage_knight':
        # Sword on left (warrior heritage)
        r(2,  11, 3, 7, P['silver'])
        r(2,  11, 1, 5, P['silverHi'])
        s(2, 17, P['teal'])
        s(4, 17, P['teal'])
        # Teal staff on right (mage heritage)
        r(17,  8, 3, 11, P['teal'])
        r(18,  8, 1,  9, P['tealHi'])
        # Mage emblem on center cape
        r(9,  11, 6, 3, P['mage'])
        s(11, 12, P['tealHi'])

    elif cls == 'sage':
        # Staff right with holy glow
        r(17, 8, 3, 11, P['mage'])
        r(18, 8, 1,  9, P['mageHi'])
        r(17, 6, 3,  2, P['holyHi'])
        s(18, 6, P['white'])
        # Holy cross on cape center
        r(9,  11, 6, 3, P['holy'])
        s(11, 12, P['holyHi'])

    elif cls == 'templar':
        # Sword left (silver + sun accent)
        r(2, 11, 3, 7, P['silver'])
        r(2, 11, 1, 5, P['silverHi'])
        s(2, 17, P['sun'])
        s(4, 17, P['sun'])
        # Sun symbol on cape
        r(9, 11, 6, 3, P['sun'])
        s(11,12, P['sunHi'])
        s(12, 12, P['white'])
        # Sun rays hint on hat
        r(10,  0, 4, 2, P['sunHi'])

    elif cls == 'duelist':
        # Sword left + dagger right sheath (combo)
        r(2,  11, 3, 7, P['silver'])
        r(2,  11, 1, 5, P['silverHi'])
        s(2,  17, P['gold'])
        r(17, 12, 3, 6, P['rogue'])
        r(18, 12, 1, 5, P['leather'])
        # Rogue hood flaps from behind
        r(4,   1, 16, 5, g['hat'])
        r(5,   2, 14, 2, P['rogueHi'])

    elif cls == 'arcanist':
        # Rogue hood back
        r(4,   1, 16, 5, P['rogue'])
        r(5,   2, 14, 2, P['rogueHi'])
        # Mage staff right with teal orb
        r(17,  8, 3, 11, P['mage'])
        r(18,  8, 1,  9, P['mageHi'])
        r(17,  6, 3,  2, P['tealHi'])
        s(18,  6, P['white'])
        # Left dagger sheath
        r(3,  13, 2, 5, P['rogue'])
        s(3,  13, P['tealHi'])

    elif cls == 'plaguecat':
        # Hood from behind
        r(4,   1, 16, 5, P['rogue'])
        r(5,   2, 14, 2, P['rogueHi'])
        # Plague vial on right
        r(17, 12, 3, 5, P['plague'])
        r(18, 12, 1, 4, P['plagueSh'])
        s(17, 11, P['plague'])            # stopper
        # Plague stain on cape center
        r(8,  11, 8, 6, P['plagueSh'])
        r(9,  12, 6, 3, P['plague'])
        s(11, 13, P['white'])             # vial glint

# ---------------------------------------------------------------------------
# Front-facing box sprite (48×48)
# ---------------------------------------------------------------------------
def draw_front_box(cls):
    gear = CLASS_GEAR[cls]
    buf  = GridBuffer()
    s, r = buf.set, buf.rect

    # Tail (left curl)
    r(3, 16, 2, 2, P['fur'])
    r(2, 14, 2, 2, P['fur'])
    r(1, 12, 2, 2, P['furSh'])
    # Paws
    r(8,  20, 3, 2, P['fur'])
    r(13, 20, 3, 2, P['fur'])
    # Body fur under cape
    r(7,  12, 10, 9, P['fur'])
    r(9,  14,  6, 6, P['chest'])
    r(7,  12,  1, 8, P['furHi'])
    # Cape
    r(5,  11,  2, 10, gear['cape'])
    r(17, 11,  2, 10, gear['cape'])
    r(7,  11, 10,  9, gear['cape'])
    r(8,  12,  8,  2, gear['capeHi'])
    r(10, 13,  4,  1, gear['capeSh'])
    # Cape side fold highlights
    r(6,  13,  1,  6, gear['capeHi'])
    r(17, 13,  1,  6, gear['capeHi'])
    # Head
    r(7, 5, 10, 7, P['fur'])
    r(8, 5,  8, 1, P['furHi'])
    # Inner head shading
    r(8, 9,  8, 2, P['furSh'])
    # Ears
    r(7,  3, 2, 3, P['fur'])
    r(15, 3, 2, 3, P['fur'])
    s(8,  4, P['furSh'])
    s(15, 4, P['furSh'])
    # Inner ear accent
    s(7,  3, P['furHi'])
    s(15, 3, P['furHi'])

    # Class props (drawn before face so face is always on top)
    draw_front_class_props(cls, gear, buf)

    # Eyes (2×2 green + highlight)
    r(9,  7, 2, 2, P['eye'])
    r(13, 7, 2, 2, P['eye'])
    s(10, 8, P['furSh'])
    s(14, 8, P['furSh'])
    s(9,  7, P['eyeHi'])
    s(13, 7, P['eyeHi'])
    # Nose
    s(11, 9, P['nose'])
    s(12, 9, P['nose'])
    # Fangs
    s(10, 10, P['fang'])
    s(13, 10, P['fang'])

    buf.outline()
    return buf.to_image(48)

# ---------------------------------------------------------------------------
# Back-facing combat sprite (96×96)
# ---------------------------------------------------------------------------
def draw_back_combat_base(cls, with_sparkles):
    g   = CLASS_GEAR[cls]
    buf = GridBuffer()
    s, r = buf.set, buf.rect

    if with_sparkles:
        for sx, sy in SPARKLE_GRID:
            r(sx, sy, 2, 2, P['sparkle'])

    # Tail (right side from back)
    r(19, 14, 2, 2, P['fur'])
    r(20, 12, 2, 2, P['fur'])
    r(21, 10, 1, 2, P['furSh'])
    # Tail tip highlight
    s(20, 14, P['furHi'])

    # Paws
    r(8,  20, 3, 2, P['fur'])
    r(13, 20, 3, 2, P['fur'])
    r(8,  21, 3, 1, P['furSh'])
    r(13, 21, 3, 1, P['furSh'])
    # Paw toe details
    s(9,  20, P['furHi'])
    s(14, 20, P['furHi'])

    # Cape spread
    r(4,  10, 16, 10, g['cape'])
    r(6,  11, 12,  8, g['capeHi'])
    r(8,  14,  8,  4, g['capeSh'])
    r(5,  18, 14,  1, g['capeHi'])        # hem highlight
    # Cape fold lines (depth)
    r(6,  12,  1,  6, g['capeSh'])
    r(17, 12,  1,  6, g['capeSh'])
    r(9,  16,  6,  1, g['capeSh'])

    # Shoulders / upper back
    r(7,  10, 10, 4, P['fur'])
    r(8,  10,  8, 1, P['furHi'])
    r(8,  13,  8, 1, P['furSh'])          # shoulder crease

    # Head (back view, toward y=0)
    r(8, 4, 8, 6, P['fur'])
    r(9, 4, 6, 1, P['furSh'])
    r(9, 9, 6, 1, P['furSh'])             # neck crease

    # Hat (domed, from behind)
    r(7, 1, 10, 4, g['hat'])
    r(8, 0,  8, 2, g['hat'])
    r(8, 0,  8, 1, g['capeHi'])           # hat top sheen
    if cls == 'warrior':
        r(7, 3, 10, 1, g['accent'])
    elif cls != 'rogue':
        r(7, 3, 10, 1, P['band'])
        s(11, 3, P['gold'])

    # Ears (tips peek out from shoulders)
    r(6,  4, 2, 2, P['fur'])
    r(16, 4, 2, 2, P['fur'])
    s(6,  4, P['furHi'])
    s(16, 4, P['furHi'])

    # Class-specific back props
    draw_back_class_props(cls, g, buf)

    buf.outline()
    return buf.to_image(96)

# ---------------------------------------------------------------------------
# Pose overlays on top of base combat image
# ---------------------------------------------------------------------------
def apply_back_pose_overlay(base_img, cls, pose):
    img = base_img.copy()
    f = lambda gx,gy,gw,gh,c: fill_img(img, gx, gy, gw, gh, c, 96)

    if pose == 'alert':
        # Replace sparkles with mageSh (tension)
        for sx, sy in SPARKLE_GRID:
            f(sx, sy, 2, 2, P['mageSh'])
        # Tense brow line under hat
        f(7, 1, 10, 1, P['furSh'])
        # Sweat drop (left side)
        f(3, 5, 1, 3, P['sweat'])
        f(3, 5, 1, 1, P['white'])          # sweat highlight
        # Shoulder tension
        f(8, 9, 8, 1, P['furSh'])
        # Class-specific extra tells
        if cls == 'mage':
            f(5, 2, 2, 1, P['furSh'])
            f(16, 2, 2, 1, P['furSh'])

    elif pose == 'hurt':
        # Remove sparkles
        for sx, sy in SPARKLE_GRID:
            f(sx, sy, 2, 2, P['mageSh'])
        # Head bandage
        f(6, 1, 5, 2, P['bandage'])
        f(7, 1, 3, 1, P['hurt'])
        # Blood / hurt splats
        f(14, 2, 4, 2, P['hurt'])
        f(9, 12, 6, 1, P['hurt'])
        f(2,  7, 1, 1, P['hurt'])
        f(21, 8, 1, 1, P['hurt'])
        # Slumped shoulders
        f(6,  11, 2, 1, P['furSh'])
        f(16, 11, 2, 1, P['furSh'])

    return img

# ---------------------------------------------------------------------------
# Top-level builder
# ---------------------------------------------------------------------------
def draw_combat_sprite(cls, pose):
    base = draw_back_combat_base(cls, True)
    if pose == 'healthy':
        return base
    return apply_back_pose_overlay(base, cls, pose)

# ---------------------------------------------------------------------------
# Main — write all 40 PNGs
# ---------------------------------------------------------------------------
BASE = '/sessions/compassionate-jolly-cannon/mnt/Boss Rush/public/sprites/cats'

total = 0
for cls in CLASSES:
    d = f'{BASE}/{cls}'
    os.makedirs(d, exist_ok=True)

    box = draw_front_box(cls)
    box.save(f'{d}/box.png')
    print(f'  [box]    {cls}/box.png  {box.size}')

    for pose in ('healthy', 'alert', 'hurt'):
        img = draw_combat_sprite(cls, pose)
        img.save(f'{d}/combat_{pose}.png')
        print(f'  [{pose:7s}] {cls}/combat_{pose}.png  {img.size}')

    total += 4

print(f'\n✓ Done — {total} sprites written to {BASE}')
