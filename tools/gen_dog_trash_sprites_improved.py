"""
Boss Rush — Trash Dog Sprite Generator (Character-Matched)
Each of the 71 trash sprite keys gets a silhouette + props drawn from their name/lore.

Silhouette map (variant → body type):
  0 stubby    1 longsnout  2 tallEars  3 spotted
  4 floppy    5 lean       6 chubby    7 spiky
"""

from PIL import Image
import os

# ---------------------------------------------------------------------------
# Palettes
# ---------------------------------------------------------------------------
PALETTES = {
    'human':     {'o':(10,10,18),'fur':(200,160,112),'hi':(232,200,144),'sh':(138,96,56), 'acc':(85,136,204), 'eye':(26,26,40),  'nose':(58,40,32),  'tongue':(232,88,104)},
    'monster':   {'o':(10,10,18),'fur':(104,184,72), 'hi':(152,232,120),'sh':(56,136,40), 'acc':(168,72,200), 'eye':(255,64,64),  'nose':(40,72,24),  'tongue':(136,255,136)},
    'hell':      {'o':(10,10,18),'fur':(138,40,40),  'hi':(200,72,72),  'sh':(74,16,16),  'acc':(255,68,136), 'eye':(255,204,0),  'nose':(42,8,8),    'tongue':(255,96,96)},
    'space':     {'o':(10,10,18),'fur':(74,104,136), 'hi':(120,168,200),'sh':(40,56,72),  'acc':(136,232,255),'eye':(160,240,255),'nose':(26,48,64),  'tongue':(104,200,232)},
    'alien':     {'o':(10,10,18),'fur':(104,200,160),'hi':(152,240,200),'sh':(56,136,96), 'acc':(200,120,255),'eye':(16,16,16),   'nose':(32,72,56),  'tongue':(120,255,168)},
    'heaven_low':{'o':(10,10,18),'fur':(240,232,200),'hi':(255,248,224),'sh':(200,184,136),'acc':(255,216,88),'eye':(64,136,255), 'nose':(138,120,88),'tongue':(240,160,160)},
    'olympus':   {'o':(10,10,18),'fur':(216,192,112),'hi':(255,240,160),'sh':(168,136,64),'acc':(255,224,64), 'eye':(26,26,40),   'nose':(106,80,32), 'tongue':(232,120,88)},
    'pantheon':  {'o':(10,10,18),'fur':(232,216,176),'hi':(255,248,232),'sh':(184,160,112),'acc':(200,160,48),'eye':(96,32,160),  'nose':(122,104,72),'tongue':(208,160,112)},
    'angelic':   {'o':(10,10,18),'fur':(248,240,255),'hi':(255,255,255),'sh':(208,200,224),'acc':(136,200,255),'eye':(40,64,160), 'nose':(168,152,184),'tongue':(255,176,192)},
}

SIZE = 96
U    = SIZE // 24  # 4

# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------
class DogCanvas:
    def __init__(self):
        self.img  = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
        self._pix = self.img.load()

    def px(self, gx, gy, gw, gh, color):
        x0,x1 = max(0,round(gx*U)), min(SIZE,round((gx+gw)*U))
        y0,y1 = max(0,round(gy*U)), min(SIZE,round((gy+gh)*U))
        rgba = color+(255,)
        for y in range(y0,y1):
            for x in range(x0,x1):
                self._pix[x,y] = rgba

    def dot(self, gx, gy, color):
        self.px(gx, gy, 1, 1, color)

    def image(self): return self.img

# ---------------------------------------------------------------------------
# Base dog body — left-facing side profile
# ---------------------------------------------------------------------------
def draw_dog(cv, pal, bulky=False, snout_long=False,
             ear_floppy=False, tongue_out=False, collar=True):
    p   = cv.px
    dot = cv.dot
    y0  = 5 if bulky else 6
    bW  = 11 if bulky else 9
    bH  =  9 if bulky else 8

    # Haunches
    p(16,y0+4, 5,bH-2, pal['fur']); p(17,y0+5, 4,bH-4, pal['hi'])
    p(20,y0+3, 2,4,    pal['sh']);   p(16,y0+4, 1,bH-2, pal['sh'])
    # Body
    p(9, y0+5, bW,bH-1, pal['fur']); p(10,y0+6, bW-2,bH-3, pal['hi'])
    p(9, y0+5, 1,bH,    pal['sh'])
    # Neck
    p(8,y0+3, 4,5, pal['fur']); p(8,y0+3, 1,5, pal['sh'])
    # Head
    p(5,y0+1, 5,6, pal['fur']); p(6,y0+2, 4,4, pal['hi']); p(5,y0+1, 5,1, pal['sh'])
    # Snout
    sl = 5 if snout_long else 4
    p(2,y0+3, sl,3, pal['hi']); p(1,y0+4, 2,2, pal['sh']); p(0,y0+4, 1,2, pal['nose'])
    p(2,y0+3, sl,1, pal['fur']); p(3,y0+5, sl,1, pal['sh'])
    # Ear
    if ear_floppy:
        p(7,y0, 3,3, pal['fur']); p(8,y0+1, 2,2, pal['sh'])
    else:
        p(8,y0, 2,4, pal['fur']); p(8,y0, 1,4, pal['sh']); dot(9,y0+1, pal['hi'])
    # Eye
    p(6,y0+3, 2,2, pal['eye']); dot(6,y0+3, (248,248,255))
    # Paws
    p(10,y0+bH+3, 2,4, pal['sh']); p(14,y0+bH+3, 2,4, pal['sh']); p(18,y0+bH+2, 2,4, pal['sh'])
    p(11,y0+bH+4, 1,2, pal['fur']); p(15,y0+bH+4, 1,2, pal['fur'])
    p(10,y0+bH+6, 2,1, pal['fur']); p(14,y0+bH+6, 2,1, pal['fur']); p(18,y0+bH+5, 2,1, pal['fur'])
    # Tail
    p(19,y0+1, 2,2, pal['fur']); p(20,y0, 2,3, pal['acc']); p(21,y0-1, 1,2, pal['acc'])
    dot(20,y0, pal['hi'])
    # Collar
    if collar:
        p(8,y0+6, 4,1, pal['acc']); dot(10,y0+6, pal['hi'])
    # Tongue
    if tongue_out:
        p(1,y0+5, 2,2, pal['tongue']); dot(1,y0+5, (255,255,255))
    # Outline accents
    dot(5,y0, pal['o']); dot(0,y0+3, pal['o'])
    p(16,y0+bH+6, 5,1, pal['o'])

# ---------------------------------------------------------------------------
# Silhouette variants (variant 0-7)
# ---------------------------------------------------------------------------
def draw_silhouette(cv, pal, variant):
    v = variant
    funcs = [
        # 0 stubby
        lambda: draw_dog(cv,pal, bulky=True, ear_floppy=True, tongue_out=(v%2==0), collar=True),
        # 1 longsnout
        lambda: draw_dog(cv,pal, snout_long=True, tongue_out=True, collar=(v%2==1)),
        # 2 tallEars
        lambda: (_draw_tall_ears(cv,pal)),
        # 3 spotted
        lambda: (_draw_spotted(cv,pal,v)),
        # 4 floppy
        lambda: (_draw_floppy(cv,pal,v)),
        # 5 lean
        lambda: (_draw_lean(cv,pal)),
        # 6 chubby
        lambda: (_draw_chubby(cv,pal,v)),
        # 7 spiky
        lambda: (_draw_spiky(cv,pal,v)),
    ]
    funcs[v % 8]()

def _draw_tall_ears(cv, pal):
    draw_dog(cv, pal, bulky=False, collar=True)
    cv.px(8,0, 2,6, pal['fur']); cv.px(9,0, 1,5, pal['sh']); cv.px(7,1, 1,4, pal['hi'])

def _draw_spotted(cv, pal, v):
    draw_dog(cv, pal, bulky=(v%2==0), ear_floppy=(v%3==0), collar=False)
    cv.px(11,7, 2,2, pal['sh']); cv.px(14,9, 2,2, pal['sh']); cv.dot(9,10, pal['sh'])

def _draw_floppy(cv, pal, v):
    draw_dog(cv, pal, ear_floppy=True, tongue_out=(v%2==0), collar=True)
    cv.px(6,0, 4,4, pal['fur']); cv.px(7,1, 3,3, pal['sh'])

def _draw_lean(cv, pal):
    draw_dog(cv, pal, snout_long=True, collar=True)
    cv.px(17,6, 4,3, pal['fur']); cv.px(18,7, 2,2, pal['hi'])
    cv.px(19,5, 1,3, pal['sh']); cv.px(20,2, 3,4, pal['acc'])

def _draw_chubby(cv, pal, v):
    draw_dog(cv, pal, bulky=True, ear_floppy=(v%2==1), tongue_out=True, collar=True)
    cv.px(8,11, 8,3, pal['hi']); cv.px(9,12, 6,2, pal['fur'])

def _draw_spiky(cv, pal, v):
    draw_dog(cv, pal, tongue_out=(v%3!=0), collar=True)
    cv.px(8,0, 2,2, pal['acc']); cv.px(10,0, 2,2, pal['acc'])
    cv.px(12,1, 2,2, pal['acc']); cv.px(19,0, 2,3, pal['acc']); cv.px(20,1, 1,2, pal['sh'])

# ---------------------------------------------------------------------------
# Theme-wide extras (horns, glow, etc.)
# ---------------------------------------------------------------------------
def draw_theme_extras(cv, pal, theme, variant):
    p, dot = cv.px, cv.dot
    if theme == 'monster':
        if variant % 2 == 1:
            p(20,12, 2,4, pal['acc'])    # extra limb stub
    elif theme == 'hell':
        p(7,1, 2,2, pal['acc'])          # horn nubs
        dot(7,1, (255,200,200))
    elif theme == 'alien':
        p(8,0, 2,2, pal['acc'])          # antenna nubs
        dot(9,0, (255,255,255))

# ---------------------------------------------------------------------------
# Per-character props (name / lore -matched)
# ---------------------------------------------------------------------------
def draw_char_props(cv, pal, theme, variant):
    p, dot = cv.px, cv.dot

    # ---- HUMAN ----
    if theme == 'human':
        if variant == 0:   # Yard Terrier — neighbor's fence
            p(22,4, 2,14, (160,110,70))    # fence post
            p(22,7, 2,1,  (200,150,100))   # fence rail
            p(22,11,2,1,  (200,150,100))
        elif variant == 1: # Mail Carrier's Foe — still mad about Tuesday
            p(18,8, 4,3,  (248,240,200))   # envelope white
            p(18,8, 4,1,  (220,180,100))   # envelope flap
            dot(20,9, (180,140,80))
        elif variant == 2: # HOA Enforcer — lawn flair insufficient
            p(20,7, 3,5,  (160,130,90))    # clipboard
            p(21,8, 1,3,  (50,50,50))      # text lines on clipboard
            dot(21,8, (10,10,18))
        elif variant == 3: # Sock Thief — justice is a chew toy
            p(0,3,  3,2,  (220,80,80))     # red sock dangling from mouth
            p(1,4,  2,3,  (220,80,80))
            dot(0,3, (255,120,120))
        elif variant == 4: # Barbecue Bandit — burgers already gone
            p(20,5, 3,2,  (255,140,40))    # BBQ glow / flames
            p(21,4, 2,3,  (255,80,20))
            dot(21,4, (255,220,100))
        elif variant == 5: # Leash Law Phantom — off-leash energy
            p(8,4,  5,1,  (180,140,80))    # broken leash stub
            dot(12,4, (240,200,100))
            p(13,3, 2,1,  (180,140,80))
        elif variant == 6: # Porch Gremlin — sits in judgment
            p(9,18, 8,3,  (140,100,70))    # porch step plank
            p(9,18, 8,1,  (180,140,100))   # step highlight
        elif variant == 7: # Suburban Alpha — cul-de-sac trembles
            p(19,2, 3,2,  (232,200,56))    # gold crown spikes
            p(20,1, 1,3,  (255,240,100))
            dot(20,1, (255,255,200))

    # ---- MONSTER ----
    elif theme == 'monster':
        if variant == 0:   # Slime Pup — drippy, bitey
            p(4,8,  2,3,  (104,184,72))    # slime drip
            dot(5,10, (152,232,120))
            p(10,19,2,3,  (104,184,72))    # floor slime puddle
        elif variant == 1: # Fang Slime — acid paw prints
            p(10,19,2,1,  (56,200,56))     # acid paw print
            p(15,20,2,1,  (56,200,56))
            dot(12,19, (136,255,136))
        elif variant == 2: # Crate Mimic — good boy? uncertain
            p(8,8,  8,6,  (160,120,80))    # crate boards overlay
            p(8,8,  8,1,  (200,160,100))   # crate top board
            p(12,8, 1,6,  (200,160,100))   # crate slat
        elif variant == 3: # Tentacle Mutt — too many limbs
            p(20,10,3,5,  pal['acc'])      # extra acc limb stub
            p(21,11,2,3,  pal['sh'])
            dot(20,10, (255,200,255))
        elif variant == 4: # Bone Stack — rattles when it runs
            p(19,3, 3,2,  (230,220,200))   # bone on tail
            p(20,3, 1,4,  (230,220,200))
            dot(19,3, (255,255,255))
        elif variant == 5: # Eye Wolf — always watching
            p(12,9, 2,2,  (255,64,64))     # extra eye on body
            dot(12,9, (255,200,200))
            p(15,6, 2,2,  (255,64,64))     # second eye
            dot(16,7, (255,255,255))
        elif variant == 6: # Moss Hound — smells like dungeon
            p(10,8, 5,2,  (56,136,40))     # moss patch on back
            p(15,10,3,2,  (56,136,40))
            dot(12,8, (104,200,72))
        elif variant == 7: # Howl Bat — sonar barking
            p(7,0,  2,3,  pal['acc'])      # bat wing ear left
            p(10,0, 2,3,  pal['acc'])      # bat wing ear right
            p(8,1,  2,2,  pal['sh'])

    # ---- HELL ----
    elif theme == 'hell':
        if variant == 0:   # Imp Pup — tiny horns, big attitude
            p(6,0,  2,3,  (255,68,136))    # left horn
            p(9,0,  2,3,  (255,68,136))    # right horn
            dot(7,0, (255,180,180))
        elif variant == 1: # Ash Terrier — tracks soot on soul
            p(10,20,2,1,  (60,60,60))      # soot paw print
            p(15,20,2,1,  (60,60,60))
            dot(11,20, (100,100,100))
        # variant 2 = powerpup, handled separately
        elif variant == 3: # Lava Spaniel — hot tongue, cold heart
            p(2,8,  2,3,  (255,80,20))     # lava drip from snout
            dot(2,8, (255,200,80))
            p(10,12,3,2,  (255,80,20))     # lava pool under belly
        elif variant == 4: # Brimstone Beagle — sniffs out mistakes
            p(11,8, 3,3,  (200,160,40))    # sulphur yellow spot
            p(15,10,2,2,  (200,160,40))
            dot(12,8, (255,240,100))
        elif variant == 5: # Pit Gremlin — laughs in fire
            p(2,3,  3,4,  (255,80,20))     # flame above head
            p(3,2,  2,3,  (255,140,40))
            dot(3,2, (255,240,160))
        elif variant == 6: # Charred Collie — still wants belly rubs
            p(10,10,5,2,  (40,30,30))      # char marks on body
            p(15,8, 3,1,  (40,30,30))
            dot(12,10, (80,60,60))
        elif variant == 7: # Doom Pug — squished face of fate
            p(2,4,  4,2,  pal['sh'])       # squish wrinkle
            p(1,5,  3,1,  (200,72,72))     # doom blush marks
            dot(0,5, (255,68,68))

    # ---- SPACE ----
    elif theme == 'space':
        if variant == 0:   # Vacuum Pup — barks in zero atmosphere
            p(1,2,  3,3,  (136,232,255))   # space bubble / helmet ring
            dot(2,2, (255,255,255))
            p(20,2, 2,2,  (136,232,255))   # floating debris
        elif variant == 1: # Comet Hound — ice trail on tail
            p(20,0, 4,2,  (200,240,255))   # ice comet trail
            p(21,1, 3,4,  (160,220,255))
            dot(21,0, (255,255,255))
        elif variant == 2: # Orbit Terrier — circles you forever
            p(19,3, 5,1,  (136,232,255))   # orbit ring horizontal
            p(21,1, 1,5,  (136,232,255))   # orbit ring vertical
            dot(21,3, (255,255,255))
        elif variant == 3: # Meteor Mutt — fetch ends in craters
            p(1,3,  3,3,  (168,160,160))   # incoming meteor
            dot(2,3, (255,255,255))
            p(10,21,4,1,  (100,90,90))     # crater impression
        elif variant == 4: # Satellite Setter — beeping aggressively
            p(20,4, 4,3,  (136,232,255))   # satellite dish
            p(21,3, 2,1,  (255,240,160))   # dish blink light
            p(22,5, 2,4,  (120,160,200))   # antenna arm
        elif variant == 5: # Nebula Nose — sniffs stardust
            dot(1,2, (200,120,255))        # stardust specks
            dot(3,4, (255,200,255))
            dot(0,6, (136,200,255))
            dot(2,1, (255,255,200))
        elif variant == 6: # Rocket Retriever — NASA denied
            p(20,4, 3,6,  (200,80,80))     # rocket booster (behind dog)
            p(21,3, 2,2,  (255,160,80))    # exhaust glow
            dot(21,3, (255,240,200))
        elif variant == 7: # Lunar Bark — one small step
            p(9,21, 6,2,  (180,175,175))   # moon dust footprints
            p(14,20,3,1,  (200,195,195))
            dot(10,21, (255,255,255))

    # ---- ALIEN ----
    elif theme == 'alien':
        if variant == 0:   # Probe Pup — abduction-ready
            p(20,2, 3,4,  pal['acc'])      # alien probe device
            p(21,1, 1,2,  (255,255,255))   # probe tip glow
            dot(21,1, (255,240,255))
        elif variant == 1: # Galaxy Gnasher — bites in another dimension
            p(0,4,  2,3,  pal['acc'])      # dimensional rift at mouth
            dot(0,4, (255,255,255))
            dot(1,6, (200,120,255))
        elif variant == 2: # Cosmic Collie — herding stars poorly
            dot(1,2, (255,240,160))        # stray star pixels
            dot(3,0, (255,255,200))
            dot(0,5, (200,160,255))
            p(20,0, 2,2,  (255,240,160))   # star clump
        elif variant == 3: # Void Whippet — fast, unsettling
            p(16,5, 5,2,  pal['sh'])       # speed blur on haunches
            p(18,4, 3,1,  pal['sh'])
            dot(19,4, pal['acc'])
        elif variant == 4: # UFO Urger — beam me a biscuit
            p(8,0,  8,2,  pal['acc'])      # UFO underside
            p(10,0, 4,1,  pal['hi'])       # UFO glow
            p(11,2, 2,3,  (200,240,255))   # tractor beam
        elif variant == 5: # Star Slime Dog — translucent loyalty
            p(9,7,  7,5,  (180,220,200))   # pale ghostly body tint
            dot(12,9, (255,255,255))
        elif variant == 6: # Nebula Nomad — lost in spiral arm
            dot(0,1, (200,120,255))        # nebula pixel cloud
            dot(2,0, (136,200,255))
            dot(1,3, (255,200,255))
            p(20,1, 3,3,  pal['acc'])      # star cluster
            dot(21,1, (255,255,255))
        elif variant == 7: # Xeno Bark — language: yap
            p(8,0,  2,3,  pal['acc'])      # alien crest spikes
            p(11,0, 2,2,  pal['acc'])
            dot(8,0, (255,255,255)); dot(11,0, (255,255,255))

    # ---- HEAVEN_LOW ----
    elif theme == 'heaven_low':
        if variant == 0:   # Cloud Pup — soft, judgmental
            p(9,20, 8,3,  (240,240,255))   # cloud underfoot
            p(10,19,6,1,  (255,255,255))
            dot(13,20, (220,220,255))
        elif variant == 1: # Halo Hound — ring slightly crooked
            p(6,0,  8,1,  (255,216,88))    # halo (crooked — offset)
            p(5,1,  3,1,  (255,216,88))    # gap
            dot(9,0, (255,255,200))
        elif variant == 2: # Cherub Chewer — tiny wings, big teeth
            p(20,6, 3,3,  (255,248,232))   # right wing nub
            p(20,8, 2,2,  (255,216,88))    # wing accent
            dot(20,6, (255,255,255))
        elif variant == 3: # Pearly Paws — gatekeeper's pet
            cv.dot(10,20, (255,255,255))   # pearl spots on paws
            cv.dot(15,20, (255,255,255))
            cv.dot(12,11, (255,248,220))   # pearl on body
        elif variant == 4: # Feather Fang — down floats upward
            dot(3,2,  (255,255,255))       # floating feathers
            dot(5,0,  (240,235,220))
            dot(1,4,  (255,255,255))
            dot(7,0,  (240,235,220))
        elif variant == 5: # Saint Bernard Angel — rescues then reviews
            p(8,6,  4,3,  (180,100,60))    # barrel keg on collar
            p(9,7,  2,2,  (200,120,80))
            dot(10,7, (255,200,100))
        elif variant == 6: # Trumpet Terrier — announces your flaws
            p(0,3,  4,3,  (255,216,88))    # trumpet bell at mouth
            p(1,4,  2,2,  (255,240,160))
            dot(0,3, (255,255,200))
        elif variant == 7: # Low Choir Mutt — harmonizes in growls
            dot(1,1,  (255,216,88))        # music notes
            dot(3,0,  (255,216,88))
            dot(0,3,  (255,240,160))
            p(20,1, 2,2,  (255,216,88))

    # ---- OLYMPUS ----
    elif theme == 'olympus':
        if variant == 0:   # Nymph Nibbler — lives in a fountain
            p(9,19, 7,3,  (100,160,220))   # fountain water
            dot(12,19, (160,220,255))
        elif variant == 1: # Satyr Spaniel — pan-flute adjacent
            p(0,5,  4,2,  (200,160,80))    # pan flute pipes at mouth
            p(1,4,  3,1,  (180,140,60))
            dot(1,4, (255,240,200))
        elif variant == 2: # Marble Mutt — statue when convenient
            p(10,8, 7,6,  pal['hi'])       # marble texture highlight bands
            p(11,9, 5,1,  pal['sh'])
            p(11,12,5,1,  pal['sh'])
        elif variant == 3: # Laurel Licker — victory tastes like slobber
            p(7,0,  6,2,  (104,160,56))    # laurel wreath
            p(8,0,  4,1,  (136,200,72))
            dot(10,0, (200,255,100))
        elif variant == 4: # Thunder Puplet — static on every pet
            dot(1,2,  (255,240,80))        # electric sparks
            dot(3,4,  (255,220,40))
            dot(20,3, (255,240,80))
            p(19,1, 2,2, (255,240,80))
        elif variant == 5: # Oracle Hound — foretells your defeat
            p(20,6, 3,6,  (200,160,48))    # scroll / prophecy tablet
            p(21,7, 1,4,  (240,200,80))
            dot(21,7, (255,255,200))
        elif variant == 6: # Titan Terrier — small dog, big myth
            p(9,20, 8,3,  pal['sh'])       # enormous shadow on ground
            p(8,19, 10,1, pal['sh'])
        elif variant == 7: # Ichor Retriever — fetches divine drama
            p(4,8,  2,4,  (255,224,64))    # ichor drip (golden)
            dot(4,8, (255,255,200))
            p(10,19,3,2,  (255,200,40))    # ichor puddle

    # ---- PANTHEON ----
    elif theme == 'pantheon':
        if variant == 0:   # Myth Mutt — worshipped incorrectly
            p(20,5, 3,4,  pal['acc'])      # carved rune block
            p(21,6, 1,2,  (255,255,200))
            dot(21,5, (255,240,160))
        elif variant == 1: # Totem Terrier — carved from bark
            p(20,4, 3,8,  (160,130,80))    # totem post behind
            p(21,5, 1,6,  (200,170,110))
            dot(21,4, (255,200,100))
        elif variant == 2: # Incense Hound — smells like destiny
            dot(5,0,  (200,180,160))       # incense smoke wisps
            dot(4,2,  (220,200,180))
            dot(6,1,  (240,220,200))
            dot(7,0,  (200,180,160))
        elif variant == 3: # Cosmic Collar — leash to the infinite
            p(8,6,  4,1,  pal['acc'])      # glowing cosmic collar
            p(7,6,  6,1,  pal['hi'])
            dot(9,6, (255,255,200))
        elif variant == 4: # Prayer Paws — answers with bites
            p(10,19,2,2,  pal['acc'])      # prayer mark on ground
            p(14,19,2,2,  pal['acc'])
            dot(11,19, (255,240,160))
        elif variant == 5: # Temple Guard — no shoes, many teeth
            p(20,8, 4,8,  (180,160,120))   # temple column behind
            p(21,8, 2,8,  (210,190,150))
            dot(21,8, (255,248,220))
        elif variant == 6: # Ritual Rover — circles the altar
            p(9,20, 8,2,  pal['acc'])      # altar circle on ground
            p(10,19,6,1,  pal['hi'])
            dot(13,20, (255,255,200))
        elif variant == 7: # Ascended Mutt — almost too holy
            dot(2,2,  pal['acc'])          # ascending aura glow
            dot(1,4,  pal['hi'])
            dot(20,2, pal['acc'])
            p(6,0,  3,1,  pal['hi'])       # head glow bar
            dot(7,0, (255,255,255))

    # ---- ANGELIC ----
    elif theme == 'angelic':
        if variant == 0:   # Seraph Snout — six wings, one nose
            p(20,4, 3,3,  pal['acc'])      # right wing pair
            p(20,8, 3,2,  pal['acc'])      # second wing pair
            p(20,12,3,2,  pal['acc'])      # third wing pair
            dot(20,4, (255,255,255)); dot(20,8, (255,255,255)); dot(20,12,(255,255,255))
        elif variant == 1: # Radiant Rover — glows on command
            dot(1,2,  (255,255,200))       # radiance glow corona
            dot(3,0,  (255,255,220))
            dot(0,5,  (255,255,200))
            dot(20,2, (255,255,200))
            p(7,0,  3,1,  (255,248,200))
        elif variant == 2: # Prism Pup — splits light and ankles
            dot(20,4, (255,80,80))         # prism rainbow output
            dot(21,5, (255,200,80))
            dot(22,6, (80,255,80))
            dot(21,7, (80,80,255))
            dot(20,8, (200,80,255))
        elif variant == 3: # Throne Terrier — sits above reason
            p(9,20, 8,3,  (180,160,100))   # throne base under dog
            p(10,18,6,2,  (220,200,140))
            dot(13,18, (255,255,200))
        elif variant == 4: # Ocular Hound — watches everything
            p(11,9, 2,2,  pal['eye'])      # eye on body
            dot(11,9, (255,255,255))
            p(15,7, 2,2,  pal['eye'])      # second eye
            dot(16,8, (255,255,255))
        elif variant == 5: # Wing Spaniel — flaps intimidation
            p(19,5, 4,5,  pal['acc'])      # large wing behind
            p(20,5, 3,5,  pal['hi'])
            dot(19,5, (255,255,255))
        elif variant == 6: # Lumen Licker — light tastes crunchy
            p(0,3,  3,3,  (255,248,200))   # light burst from mouth
            p(1,2,  2,2,  (255,255,240))
            dot(0,3, (255,255,255))
        elif variant == 7: # All-Seer Pup — almost doggod
            p(9,7,  5,4,  pal['eye'])      # large eye on body (like doggod)
            p(10,8, 3,2,  (40,64,160))
            dot(11,8, (255,255,255))
            dot(19,3, pal['acc'])          # extra eye top
            dot(2,5,  pal['acc'])

# ---------------------------------------------------------------------------
# Pose overlay
# ---------------------------------------------------------------------------
def apply_pose(cv, pal, pose):
    p = cv.px
    if pose == 'alert':
        p(3,1, 2,2, (255,255,255))
        p(7,2, 1,3, (136,187,238)); cv.dot(7,2, (255,255,255))
        p(10,8,6,1, pal['sh'])
    elif pose == 'hurt':
        p(5,3, 4,2, (232,232,240))
        p(6,4, 2,1, (208,48,48))
        p(12,10,3,2,(208,48,48))
        p(9,14,2,1, (208,48,48))
        cv.dot(11,10,(255,80,80))

# ---------------------------------------------------------------------------
# Build a single sprite
# ---------------------------------------------------------------------------
def draw_trash_dog(theme, variant, pose):
    pal = dict(PALETTES[theme])
    cv  = DogCanvas()

    draw_silhouette(cv, pal, variant)
    draw_theme_extras(cv, pal, theme, variant)
    draw_char_props(cv, pal, theme, variant)
    apply_pose(cv, pal, pose)
    return cv.image()

# hell_trash_powerpup silhouette (same as hell_trash_2 but with pink devil onesie)
def draw_powerpup(pose):
    pal = dict(PALETTES['hell'])
    cv  = DogCanvas()
    draw_silhouette(cv, pal, 2)   # tallEars base for powerpup
    # Pink devil onesie
    cv.px(4,5, 10,7, (255,136,170)); cv.px(6,7, 6,4, (255,68,136))
    cv.px(7,2, 2,2,  pal['acc'])   # devil horns
    cv.dot(7,2, (255,200,200))
    apply_pose(cv, pal, pose)
    return cv.image()

# ---------------------------------------------------------------------------
# Keys to generate  (no mirror_trash_* — they reuse capstone keys)
# ---------------------------------------------------------------------------
TRASH_KEYS = []
for theme in ['human','monster','space','alien','heaven_low','olympus','pantheon','angelic']:
    for v in range(8):
        TRASH_KEYS.append((theme, v, f'{theme}_trash_{v}'))

# Hell: 0,1,3,4,5,6,7 (2 = powerpup, already done in boss generator but re-generate here for safety)
for v in [0,1,3,4,5,6,7]:
    TRASH_KEYS.append(('hell', v, f'hell_trash_{v}'))
TRASH_KEYS.append(('hell', 2, 'hell_trash_powerpup'))   # special case

BASE = '/sessions/compassionate-jolly-cannon/mnt/Boss Rush/public/sprites/dogs'

total = 0
for theme, variant, key in TRASH_KEYS:
    d = f'{BASE}/{key}'
    os.makedirs(d, exist_ok=True)
    for pose in ('healthy','alert','hurt'):
        if key == 'hell_trash_powerpup':
            img = draw_powerpup(pose)
        else:
            img = draw_trash_dog(theme, variant, pose)
        img.save(f'{d}/combat_{pose}.png')
        total += 1
    print(f'  ✓  {key}')

print(f'\nDone — {total} PNGs written.')
                                                                                            