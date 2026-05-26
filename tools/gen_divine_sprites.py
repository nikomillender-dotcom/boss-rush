"""
Boss Rush — Divine Paired Sprite Generator
Redesigns Olympus (Greek gods), Pantheon (world deities), and Doggod (biblical ophanim).

Each sprite: left-facing side-profile dog + a deity figure drawn behind/around it.
Doggod: ophanim wheel + seraphim wings covering the dog form.
"""

from PIL import Image
import os, math

# ---------------------------------------------------------------------------
# Palettes
# ---------------------------------------------------------------------------
PALETTES = {
    'olympus':  {'o':(10,10,18),'fur':(216,192,112),'hi':(255,240,160),'sh':(168,136,64), 'acc':(255,224,64), 'eye':(26,26,40),  'nose':(106,80,32), 'tongue':(232,120,88)},
    'pantheon': {'o':(10,10,18),'fur':(232,216,176),'hi':(255,248,232),'sh':(184,160,112),'acc':(200,160,48), 'eye':(96,32,160),  'nose':(122,104,72),'tongue':(208,160,112)},
    'angelic':  {'o':(10,10,18),'fur':(248,240,255),'hi':(255,255,255),'sh':(208,200,224),'acc':(136,200,255),'eye':(40,64,160),  'nose':(168,152,184),'tongue':(255,176,192)},
}

# Shared figure colors
GOD_SKIN   = (240,210,175)
GOD_ROBE   = (255,252,240)
GOD_GOLD   = (255,220,60)
GOD_LGOLD  = (255,245,180)
GOD_SILVER = (210,220,235)
GOD_BEARD  = (240,240,230)
LIGHTNING  = (255,240,80)
LIGHTNING2 = (255,200,40)
TRIDENT    = (180,200,220)
OLIVE      = (140,180,80)
OLIVE_D    = (80,120,40)
LAUREL     = (100,160,60)
LYRE_GOLD  = (220,190,60)
OWL_BR     = (140,110,70)
WING_W     = (255,250,235)
WING_A     = (255,220,150)
CADUCEUS   = (180,200,160)
TOGA       = (255,252,245)
LION_FUR   = (200,160,80)
CLUB_BR    = (140,100,60)
ANVIL_GR   = (120,130,140)
FIRE_O     = (255,120,40)
FIRE_Y     = (255,220,60)
ANKH_GOLD  = (220,180,60)
ANKH_BLUE  = (60,100,180)
FEATHER_R  = (200,60,40)
FEATHER_G  = (60,160,80)
JADE       = (60,160,100)
JADE_D     = (30,100,60)
RUNE_BL    = (80,100,180)
LOTUS_PK   = (240,160,180)
LOTUS_W    = (255,240,245)
SAFFRON    = (240,160,40)
ELEPHANT   = (160,150,150)
ANTLER_BR  = (140,100,50)
VOID_PU    = (40,20,60)
VOID_LI    = (120,60,180)
VOID_EY    = (180,120,255)
TOTEM_BR   = (160,120,70)
TOTEM_RD   = (200,80,40)
SPIRAL_GD  = (220,180,60)

SIZE = 96
U    = SIZE // 24

# ---------------------------------------------------------------------------
# Canvas
# ---------------------------------------------------------------------------
class C:
    def __init__(self):
        self.img  = Image.new('RGBA',(SIZE,SIZE),(0,0,0,0))
        self._pix = self.img.load()

    def p(self, gx,gy,gw,gh, col):
        x0,x1 = max(0,round(gx*U)), min(SIZE,round((gx+gw)*U))
        y0,y1 = max(0,round(gy*U)), min(SIZE,round((gy+gh)*U))
        rgba  = col+(255,)
        for y in range(y0,y1):
            for x in range(x0,x1):
                self._pix[x,y] = rgba

    def d(self,gx,gy,col): self.p(gx,gy,1,1,col)
    def img_(self): return self.img

# ---------------------------------------------------------------------------
# Dog body (left-facing side profile, lean trash-style)
# ---------------------------------------------------------------------------
def draw_dog(cv, pal, bulky=False, snout_long=False,
             ear_floppy=False, tongue_out=False, collar=True):
    p = cv.p; d = cv.d
    y0 = 5 if bulky else 6
    bW = 11 if bulky else 9
    bH =  9 if bulky else 8

    p(16,y0+4,5,bH-2,pal['fur']); p(17,y0+5,4,bH-4,pal['hi'])
    p(20,y0+3,2,4,pal['sh']);     p(16,y0+4,1,bH-2,pal['sh'])
    p(9,y0+5,bW,bH-1,pal['fur']); p(10,y0+6,bW-2,bH-3,pal['hi'])
    p(9,y0+5,1,bH,pal['sh'])
    p(8,y0+3,4,5,pal['fur']);     p(8,y0+3,1,5,pal['sh'])
    p(5,y0+1,5,6,pal['fur']);     p(6,y0+2,4,4,pal['hi']); p(5,y0+1,5,1,pal['sh'])
    sl = 5 if snout_long else 4
    p(2,y0+3,sl,3,pal['hi']); p(1,y0+4,2,2,pal['sh']); p(0,y0+4,1,2,pal['nose'])
    p(2,y0+3,sl,1,pal['fur']); p(3,y0+5,sl,1,pal['sh'])
    if ear_floppy:
        p(7,y0,3,3,pal['fur']); p(8,y0+1,2,2,pal['sh'])
    else:
        p(8,y0,2,4,pal['fur']); p(8,y0,1,4,pal['sh']); d(9,y0+1,pal['hi'])
    p(6,y0+3,2,2,pal['eye']); d(6,y0+3,(248,248,255))
    p(10,y0+bH+3,2,4,pal['sh']); p(14,y0+bH+3,2,4,pal['sh']); p(18,y0+bH+2,2,4,pal['sh'])
    p(11,y0+bH+4,1,2,pal['fur']); p(15,y0+bH+4,1,2,pal['fur'])
    p(10,y0+bH+6,2,1,pal['fur']); p(14,y0+bH+6,2,1,pal['fur']); p(18,y0+bH+5,2,1,pal['fur'])
    p(19,y0+1,2,2,pal['fur']); p(20,y0,2,3,pal['acc']); p(21,y0-1,1,2,pal['acc'])
    d(20,y0,pal['hi'])
    if collar: p(8,y0+6,4,1,pal['acc']); d(10,y0+6,pal['hi'])
    if tongue_out: p(1,y0+5,2,2,pal['tongue']); d(1,y0+5,(255,255,255))
    d(5,y0,pal['o']); d(0,y0+3,pal['o']); p(16,y0+bH+6,5,1,pal['o'])

# ---------------------------------------------------------------------------
# Pose overlay
# ---------------------------------------------------------------------------
def pose(cv, pal, state):
    p = cv.p; d = cv.d
    if state == 'alert':
        p(3,1,2,2,(255,255,255)); p(7,2,1,3,(136,187,238)); d(7,2,(255,255,255))
        p(10,8,6,1,pal['sh'])
    elif state == 'hurt':
        p(5,3,4,2,(232,232,240)); p(6,4,2,1,(208,48,48))
        p(12,10,3,2,(208,48,48)); p(9,14,2,1,(208,48,48)); d(11,10,(255,80,80))

# ---------------------------------------------------------------------------
# Helper — small humanoid figure (x0,y0 = top-left of head on 24x24 grid)
# ---------------------------------------------------------------------------
def fig_base(cv, x0, y0, skin, robe, beard=False):
    """Draw a simplified 2×2 head + 3×5 body figure."""
    p = cv.p; d = cv.d
    p(x0, y0,   2, 2, skin)          # head
    d(x0, y0,   (max(0,skin[0]-30),)*3)  # eye shadow pixel
    if beard:
        p(x0, y0+2, 2, 2, GOD_BEARD)
    p(x0-1, y0+2, 4, 6, robe)        # robe/body
    d(x0,   y0+2, skin)              # neck
    d(x0,   y0+7, (180,180,180))     # foot hint

# ---------------------------------------------------------------------------
# OLYMPUS DEITY FIGURES
# ---------------------------------------------------------------------------

def olympus_nymph(cv):
    """0 — Nymph Nibbler: water nymph with flower crown, pale dress."""
    p,d = cv.p, cv.d
    # Nymph figure right side, visible above dog
    p(16, 1, 3, 2, (200,240,220))    # flower crown
    d(17, 0, (255,220,180))          # flower center
    d(16, 1, (255,200,160)); d(18,1,(255,200,160))
    p(15, 3, 4, 2, (200,220,255))    # face / upper body
    d(16, 3, GOD_SKIN); d(17,3,GOD_SKIN)
    p(14, 5, 5, 8, (180,210,255))    # flowing dress
    p(15, 5, 3, 6, (210,230,255))    # dress highlight
    d(14, 12,(140,180,220))          # dress hem
    # Water droplets beside dog
    d(1,  3, (136,200,255)); d(3,1,(136,200,255)); d(0,5,(170,220,255))

def olympus_pan(cv):
    """1 — Satyr Spaniel: Pan with goat legs, pan flute, horns."""
    p,d = cv.p, cv.d
    # Pan figure right side
    p(17, 1, 2, 2, GOD_SKIN)         # face
    p(16, 1, 1, 2, (160,130,90))     # left horn
    p(19, 1, 1, 2, (160,130,90))     # right horn
    d(16, 0, (140,110,70)); d(19,0,(140,110,70))  # horn tips
    p(15, 3, 4, 4, (200,160,100))    # torso (satyr brown)
    p(15, 7, 2, 5, (150,110,70))     # left goat leg
    p(17, 7, 2, 5, (150,110,70))     # right goat leg
    d(15,11,(120,80,40)); d(17,11,(120,80,40))  # hooves
    # Pan flute at mouth of dog (left side)
    p(0,  3, 4, 1, (200,170,110))    # flute pipes top
    p(0,  4, 1, 2, (200,170,110))    # flute pipe 1
    p(1,  4, 1, 3, (200,170,110))    # pipe 2
    p(2,  4, 1, 4, (180,150,90))     # pipe 3
    p(3,  4, 1, 5, (180,150,90))     # pipe 4

def olympus_hermes(cv):
    """2 — Marble Mutt: Hermes with winged caduceus, herald of gods."""
    p,d = cv.p, cv.d
    # Caduceus staff — tall, behind dog on right
    p(21, 0, 1,14, CADUCEUS)         # staff pole
    p(19, 0, 4, 1, WING_A)          # top wings
    p(20, 1, 2, 1, WING_A)
    p(19, 3, 3, 1, WING_A)          # second wing pair
    # Winged sandal hint at dog feet area
    d(10,21,(200,190,150)); d(15,21,(200,190,150))
    d(9, 21, WING_A); d(14,21, WING_A)
    # Hermes figure (small, mostly behind dog)
    p(17, 2, 3, 2, GOD_SKIN)        # face peeking
    d(17, 1, (200,190,150))         # winged helm
    d(18, 0, WING_A); d(20,0,WING_A) # helm wings
    p(16, 4, 4, 6, TOGA)            # toga body
    d(20, 2, GOD_GOLD)              # acc

def olympus_apollo(cv):
    """3 — Laurel Licker: Apollo with sun rays and lyre."""
    p,d = cv.p, cv.d
    # Sun rays behind dog (right side, upper)
    for i,angle in enumerate([0, 30, 60, 90, 120, 150]):
        rad = math.radians(angle)
        sx = 20 + round(math.cos(rad)*8)
        sy = 4  + round(math.sin(rad)*6)
        d(min(23,max(0,sx)), min(23,max(0,sy)), GOD_GOLD)
    # Apollo figure
    p(17, 2, 3, 2, GOD_SKIN)        # face
    p(16, 4, 4, 6, (255,240,200))   # golden robe
    d(18, 2, (255,230,150))         # laurel on head
    d(17, 2, LAUREL); d(19,2,LAUREL)
    # Lyre at right
    p(20, 5, 3, 6, LYRE_GOLD)       # lyre body
    p(21, 4, 1, 7, GOD_GOLD)        # lyre strings area
    d(20, 4, GOD_LGOLD); d(22,4,GOD_LGOLD)  # lyre horns

def olympus_zeus(cv):
    """4 — Thunder Puplet: Zeus with lightning bolt and beard."""
    p,d = cv.p, cv.d
    # Large Zeus figure behind dog
    p(16, 1, 4, 2, GOD_SKIN)        # head
    p(15, 3, 5, 3, GOD_BEARD)       # majestic white beard
    d(17, 1, (200,190,180))         # beard top
    p(14, 4, 6, 7, TOGA)            # grand toga body
    p(15, 4, 4, 2, (240,235,230))   # toga highlight
    # Raised arm with lightning
    p(20, 2, 2, 3, GOD_SKIN)        # arm raised
    p(21, 0, 3, 4, LIGHTNING)       # lightning bolt
    p(22, 1, 2, 3, LIGHTNING2)
    d(23, 0, (255,255,220))         # bolt tip
    d(21, 4, LIGHTNING); d(22,5,LIGHTNING); d(20,6,LIGHTNING)  # bolt zigzag

def olympus_athena(cv):
    """5 — Oracle Hound: Athena with crested helm and spear."""
    p,d = cv.p, cv.d
    # Athena figure
    p(16, 2, 3, 2, GOD_SKIN)        # face
    p(15, 1, 4, 3, GOD_SILVER)      # helm
    p(16, 0, 2, 2, (180,60,60))     # helm crest (red plume)
    p(14, 4, 5, 8, (180,195,210))   # armor/chiton
    d(15, 4, GOD_SILVER)
    # Spear
    p(21, 0, 1,13, GOD_SILVER)      # spear shaft
    d(21, 0, GOD_GOLD)              # spear tip gold
    p(20, 0, 3, 1, GOD_GOLD)        # spear head
    # Owl suggestion (right of frame)
    d(22, 5, OWL_BR); d(23,4,OWL_BR)
    d(22, 4, (255,200,100))         # owl eye

def olympus_poseidon(cv):
    """6 — Titan Terrier: Poseidon with trident and sea waves."""
    p,d = cv.p, cv.d
    # Poseidon — large imposing figure
    p(15, 1, 4, 2, GOD_SKIN)        # broad head
    p(14, 3, 5, 3, (180,200,180))   # green-grey beard (sea deity)
    p(13, 5, 6, 8, (80,140,200))    # blue sea-robe
    d(15, 5, (120,180,220))
    # Trident raised behind/over dog
    p(21, 0, 1,12, TRIDENT)         # trident shaft
    p(19, 0, 5, 1, TRIDENT)         # trident prongs
    p(19, 1, 1, 2, TRIDENT)         # left prong
    p(23, 1, 1, 2, TRIDENT)         # right prong
    d(20, 0, (200,230,255)); d(21,0,(220,245,255)); d(22,0,(200,230,255))
    # Sea waves at base
    p(9, 21, 6, 2, (80,140,200))
    p(14, 20, 5, 2, (100,170,220))
    d(11,21,(180,220,255)); d(16,20,(180,220,255))

def olympus_hephaestus(cv):
    """7 — Ichor Retriever: Hephaestus with forge hammer and fire."""
    p,d = cv.p, cv.d
    # Hephaestus figure — stocky, forge-blackened
    p(16, 2, 3, 2, (180,140,110))   # face (ash-smudged)
    p(15, 4, 4, 7, (80,80,90))      # dark forge apron
    d(16, 4, (120,120,130))
    # Hammer raised
    p(20, 3, 3, 4, ANVIL_GR)        # hammer head
    d(20, 3, (180,190,200)); d(22,3,(180,190,200))  # hammer highlights
    p(21, 6, 1, 7, CLUB_BR)         # hammer haft
    # Forge fire / coals behind
    p(1, 19, 4, 3, (60,40,30))      # anvil block at base
    d(2, 19, ANVIL_GR)
    p(1, 17, 3, 2, FIRE_O)          # flames
    p(2, 16, 2, 2, FIRE_Y)
    d(3, 15, FIRE_Y)                # flame tip

def olympus_heracles(cv, mini=False):
    """mini — Hero's Hound: Heracles with lion-skin cape and club."""
    p,d = cv.p, cv.d
    # Heracles — muscular hero figure
    p(15, 1, 4, 2, GOD_SKIN)        # face
    p(14, 3, 5, 2, LION_FUR)        # lion skin mantle on shoulders
    p(13, 5, 6, 8, GOD_SKIN)        # muscular body (bare)
    d(14, 5, (220,190,160)); d(18,5,(220,190,160))  # shoulder highlights
    # Lion head over own head
    p(15, 0, 4, 3, LION_FUR)        # lion mane framing
    d(16, 1, (200,150,70)); d(17,1,(200,150,70))
    # Club (massive)
    p(20, 2, 3, 3, CLUB_BR)         # club head (heavy)
    d(20, 2, (180,140,80)); d(22,2,(160,120,60))
    p(21, 4, 2, 9, CLUB_BR)         # club haft

def olympus_zeus_cap(cv):
    """cap — Zeusion: Zeus enthroned, full commanding presence."""
    p,d = cv.p, cv.d
    # Throne hints (stone base)
    p(13,15, 8, 5, (160,150,140))   # throne back
    p(14,13, 6, 8, (180,170,160))   # throne seat
    d(15,13,(210,200,190))
    # Massive Zeus figure
    p(14, 2, 6, 2, GOD_SKIN)        # broad head
    p(13, 4, 7, 4, GOD_BEARD)       # legendary beard
    d(15, 3, (220,210,200)); d(18,3,(220,210,200))
    p(12, 6, 8, 8, TOGA)            # grand imperial toga
    p(13, 6, 6, 4, (245,242,235))   # toga highlight
    # Giant lightning bolt (fills upper right)
    p(20, 0, 4, 3, LIGHTNING)
    p(21, 1, 3, 2, LIGHTNING2)
    p(19, 3, 4, 3, LIGHTNING)
    p(20, 4, 3, 2, LIGHTNING2)
    p(18, 6, 4, 2, LIGHTNING)
    d(23, 0,(255,255,230)); d(17,7,LIGHTNING)

# ---------------------------------------------------------------------------
# PANTHEON DEITY FIGURES
# ---------------------------------------------------------------------------

def pantheon_anubis(cv):
    """0 — Myth Mutt: Anubis (Egyptian jackal-headed god) — a dog god meeting a dog."""
    p,d = cv.p, cv.d
    # Anubis figure — tall, elegant Egyptian deity
    p(16, 0, 3, 3, (50,50,50))      # black jackal head
    p(15, 0, 2, 2, (50,50,50))      # left ear
    p(19, 0, 2, 2, (50,50,50))      # right ear
    d(16, 2, (80,80,80)); d(18,2,(80,80,80))  # muzzle detail
    p(14, 3, 5, 7, ANKH_BLUE)       # blue-gold Egyptian linen
    p(15, 3, 3, 5, (80,120,200))    # linen highlight
    # Collar / necklace (usekh)
    p(14, 3, 5, 1, ANKH_GOLD)
    d(16, 3,(255,240,160))
    # Ankh in hand (right side, raised)
    p(21, 2, 2, 7, ANKH_GOLD)       # ankh cross
    p(19, 3, 5, 1, ANKH_GOLD)       # ankh top bar
    p(20, 1, 3, 3, ANKH_GOLD)       # ankh circle top (head)
    d(21, 2,(255,245,160))          # ankh gold glint
    # Hieroglyph hint on ground
    d(9, 22,(200,180,100)); d(12,22,(200,180,100)); d(15,22,(200,180,100))

def pantheon_coyote(cv):
    """1 — Totem Terrier: Coyote spirit (Trickster, Native American)."""
    p,d = cv.p, cv.d
    # Totem pole (right side, tall)
    p(21, 0, 3,18, TOTEM_BR)        # pole
    p(21, 1, 3, 3, TOTEM_RD)        # top face on totem
    d(22, 1,(255,200,100))          # totem eye
    p(21, 4, 3, 3, (80,140,60))     # second totem face (green)
    d(22, 5,(200,60,40))            # totem eye 2
    p(21, 8, 3, 3, TOTEM_RD)        # third face
    d(22, 9,(255,180,40))
    # Feather headdress (above dog head area)
    p(7,  0, 3, 4, FEATHER_R)       # left feathers (red)
    p(10, 0, 2, 3, (255,240,80))    # center feather (yellow)
    p(12, 0, 2, 4, FEATHER_G)       # right feather (green)
    d(8,  0,(255,120,60)); d(11,0,(255,255,120))
    # Coyote trickster mark (spiral on ground)
    d(3,21, SPIRAL_GD); d(4,22,SPIRAL_GD); d(5,21,SPIRAL_GD); d(4,20,SPIRAL_GD)

def pantheon_ganesha(cv):
    """2 — Incense Hound: Ganesha (Hindu, elephant-headed remover of obstacles)."""
    p,d = cv.p, cv.d
    # Ganesha — elephant head large, behind dog
    p(13, 0, 7, 5, ELEPHANT)        # elephant head (grey)
    p(14, 1, 5, 3, (180,170,170))   # head highlight
    # Trunk curling down
    p(12, 3, 2, 5, ELEPHANT)        # trunk left curve
    p(12, 7, 4, 2, ELEPHANT)        # trunk tip
    d(12, 3,(190,180,180))
    # Ears (large)
    p(12, 0, 2, 5, (180,170,165))   # left ear
    p(20, 0, 3, 5, (180,170,165))   # right ear
    # Gold crown / headdress
    p(14, 0, 5, 1, GOD_GOLD)        # crown base
    d(16, 0,(255,255,200))          # crown gem
    # Multiple arms suggestion
    p(11, 5, 2, 3, SAFFRON)         # left arm (saffron robe)
    p(20, 5, 3, 3, SAFFRON)         # right arm
    # Lotus flower before dog
    d(3, 18, LOTUS_PK); d(4,17,LOTUS_PK); d(4,19,LOTUS_PK); d(5,18,LOTUS_W)
    # Incense smoke wisps
    d(1, 2,(200,180,160)); d(2,0,(220,200,180)); d(3,3,(200,180,160))

def pantheon_odin(cv):
    """3 — Cosmic Collar: Odin (Norse All-Father) with ravens and spear."""
    p,d = cv.p, cv.d
    # Odin figure — cloaked, one eye
    p(16, 1, 3, 2, GOD_SKIN)        # face
    p(15, 3, 4, 3, GOD_BEARD)       # long Norse beard
    p(14, 3, 6, 8, (60,70,90))      # dark blue-grey cloak (wide)
    p(15, 3, 4, 6, (80,90,110))     # cloak highlight
    d(18, 1,(60,50,40))             # eye patch (right eye covered)
    d(16, 1,(40,80,160))            # one blue eye visible
    # Gungnir spear
    p(22, 0, 2,14, (140,150,160))   # spear shaft (rune-etched)
    p(20, 0, 4, 1, (180,190,200))   # spear head
    d(22, 0,(220,230,240))          # spear tip glint
    # Two ravens (Huginn & Muninn)
    d(1,  2,(30,30,35))             # raven 1 (left, black)
    d(2,  1,(30,30,35))
    d(0,  3,(30,30,35))
    d(20, 3,(30,30,35))             # raven 2 (right)
    d(21, 2,(30,30,35))
    d(22, 4,(30,30,35))
    # Rune marks on ground
    p(9, 22, 2, 1, RUNE_BL); p(13,22,2,1,RUNE_BL); p(17,22,2,1,RUNE_BL)

def pantheon_guanyin(cv):
    """4 — Prayer Paws: Guanyin/Kannon (Buddhist bodhisattva of compassion)."""
    p,d = cv.p, cv.d
    # Guanyin — flowing white robes, many arms
    p(16, 1, 3, 2, GOD_SKIN)        # serene face
    p(15, 3, 4, 9, GOD_ROBE)        # white flowing robe
    p(16, 3, 2, 7, (255,255,255))   # robe bright center
    # Halo ring behind head
    p(14, 0, 6, 1, LOTUS_PK)        # halo top arc
    p(13, 1, 1, 3, LOTUS_PK)        # halo left
    p(20, 1, 1, 3, LOTUS_PK)        # halo right
    d(14,0,(255,255,200)); d(19,0,(255,255,200))
    # Multiple arms radiating
    p(11, 5, 3, 1, GOD_SKIN)        # left arm 1
    p(11, 7, 3, 1, GOD_SKIN)        # left arm 2
    p(21, 5, 3, 1, GOD_SKIN)        # right arm 1
    p(21, 7, 3, 1, GOD_SKIN)        # right arm 2
    # Lotuses in hands
    d(11, 5, LOTUS_PK); d(11,7,LOTUS_W)
    d(23, 5, LOTUS_PK); d(23,7,LOTUS_W)
    # Lotus on ground (peace)
    p(8, 20, 4, 2, LOTUS_PK); p(9,19,2,1,LOTUS_W)
    d(10,20,(255,240,250))

def pantheon_huitzilopochtli(cv):
    """5 — Temple Guard: Huitzilopochtli (Aztec sun/war god), hummingbird of the south."""
    p,d = cv.p, cv.d
    # Aztec deity — dramatic feathers, jade, eagle
    # Massive feather headdress
    p(8,  0, 3, 5, FEATHER_R)       # red feathers
    p(11, 0, 3, 4, FEATHER_G)       # green feathers (quetzal)
    p(14, 0, 4, 5, FEATHER_R)       # more red
    d(9,0,(255,80,40)); d(12,0,(80,200,80)); d(15,0,(255,100,40))
    # Figure body
    p(15, 5, 4, 2, GOD_SKIN)        # face visible below headdress
    p(14, 7, 5, 6, JADE)            # jade-green armor
    p(15, 7, 3, 4, (80,200,120))    # armor highlight
    # Serpent weapon (huehuetl)
    p(20, 6, 3, 8, (180,80,40))     # serpent body
    d(20, 5,(255,140,60))           # serpent head fang
    p(19, 4, 3, 2, (255,100,40))    # serpent head
    # Sun disc behind
    d(2, 2,(255,180,40)); d(1,4,(255,200,60)); d(0,1,(255,220,80))
    d(3, 0,(255,180,40))

def pantheon_cernunnos(cv):
    """6 — Ritual Rover: Cernunnos (Celtic lord of wild things, antlered god)."""
    p,d = cv.p, cv.d
    # Cernunnos — antlers dominate top of frame
    # Left antler
    p(8,  0, 2,6, ANTLER_BR)        # main left beam
    p(6,  2, 2,3, ANTLER_BR)        # left tine
    p(10, 1, 2,3, ANTLER_BR)        # second tine
    d(8,0,(180,140,80)); d(6,2,(180,140,80))
    # Right antler
    p(14, 0, 2,6, ANTLER_BR)        # main right beam
    p(16, 2, 2,3, ANTLER_BR)        # right tine
    d(14,0,(180,140,80)); d(16,2,(180,140,80))
    # Figure body (mostly below antlers)
    p(14, 6, 4, 2, GOD_SKIN)        # face
    p(13, 8, 5, 7, (80,120,60))     # forest-green robe
    p(14, 8, 3, 5, (100,150,70))    # robe highlight
    # Spiral markings (Celtic)
    d(1, 18, SPIRAL_GD); d(2,17,SPIRAL_GD); d(3,18,SPIRAL_GD); d(2,19,SPIRAL_GD)
    d(1, 21, SPIRAL_GD); d(2,20,SPIRAL_GD)
    # Accompanying animals (snake)
    p(18,17, 4,1, (100,160,80))     # snake body
    d(18,17,(140,200,80))           # snake head

def pantheon_brahma(cv):
    """7 — Ascended Mutt: Brahma (Hindu creator god, four-headed, cosmic)."""
    p,d = cv.p, cv.d
    # Brahma — four heads (one visible per side), massive divine presence
    p(15, 1, 4, 3, GOD_SKIN)        # front head
    p(12, 2, 2, 2, GOD_SKIN)        # left head (partial)
    p(20, 2, 2, 2, GOD_SKIN)        # right head (partial)
    # Crowns on all heads
    p(15, 0, 4, 1, GOD_GOLD)        # main crown
    d(17, 0,(255,255,200))          # crown gem
    d(12, 1, GOD_GOLD); d(20,1,GOD_GOLD)  # side crown hints
    # Saffron robes (four arms)
    p(13, 4, 8, 8, SAFFRON)         # main body/robes
    p(14, 4, 6, 6, (255,180,60))    # robe highlight
    # Four arms
    p(10, 5, 3, 1, GOD_SKIN)        # far left arm
    p(11, 7, 3, 1, GOD_SKIN)        # near left arm
    p(21, 5, 3, 1, GOD_SKIN)        # near right arm
    p(21, 7, 3, 1, GOD_SKIN)        # far right arm
    # Lotus in each hand
    d(10,5, LOTUS_PK); d(11,7,LOTUS_W); d(23,5,LOTUS_PK); d(23,7,LOTUS_W)
    # Divine aura glow
    d(1, 2,(255,220,100)); d(0,5,(255,200,80))
    d(22,1,(255,230,120)); d(23,4,(255,210,80))
    p(9, 0, 4, 1, (255,240,180))    # top aura bar
    d(11,0,(255,255,220))

def pantheon_high_priest(cv):
    """mini — High Priest Pup: grand high priest of the pantheon."""
    p,d = cv.p, cv.d
    # Tall ceremonial mitre hat + elaborate robes
    p(15, 0, 4, 2, GOD_GOLD)        # mitre base (gold)
    p(16, 0, 2, 4, (240,230,200))   # mitre spire (tall)
    d(17, 0,(255,255,220))          # gem at top
    # Priest face
    p(15, 4, 4, 2, GOD_SKIN)
    p(14, 6,12, 8, (200,160,80))    # ornate robes (rich gold-brown)
    p(15, 6, 4, 6, (220,185,100))   # robe center panel
    p(16, 7, 2, 5, GOD_GOLD)        # embroidered center stripe
    d(17, 8,(255,240,160))          # rune/sigil
    # Staff of the pantheon
    p(22, 1, 1,12, (160,130,80))    # staff
    p(20, 0, 4, 2, GOD_GOLD)        # staff head (elaborate)
    d(21, 0,(255,255,200))

def pantheon_unnamed_cap(cv):
    """cap — The Unnamed Walker: cosmic horror deity. Cannot be spoken."""
    p,d = cv.p, cv.d
    # Void cloak — fills the frame with unknowable dark matter
    p(7,  0,12, 3, VOID_PU)         # upper void
    p(8,  1,10,14, (42,24,72))      # void body
    p(10, 4, 6, 8, (64,32,96))      # lighter inner void
    p(11, 6, 4, 5, VOID_LI)         # glowing inner core
    d(13, 8,(220,180,255))          # inner bright point
    # Void eyes (several floating)
    d(4,  3, VOID_EY); d(5,2,(255,255,255))   # eye 1
    d(20, 5, VOID_EY); d(21,4,(255,255,255))  # eye 2
    d(2,  8, VOID_EY); d(3,7,(255,255,255))   # eye 3
    d(22,10, VOID_EY); d(23,9,(255,255,255))  # eye 4
    # Tentacular void tendrils
    p(2,  12, 2, 5, VOID_PU)
    p(3,  14, 2, 6, (42,24,72))
    p(21, 11, 3, 6, VOID_PU)
    p(20, 13, 2, 5, (42,24,72))
    # Void text / impossible geometry on ground
    d(9, 22,(120,60,180)); d(12,22,(120,60,180)); d(15,22,(120,60,180))

# ---------------------------------------------------------------------------
# DOGGOD — Biblical Ophanim / Seraphim
# ---------------------------------------------------------------------------

def draw_doggod(state):
    """
    Angelic_cap_doggod — biblical ophanim (Ezekiel's wheel) + seraphim (six wings).
    The dog is still there at center-left facing left, but the whole frame is
    dominated by a divine wheel covered in eyes and six sweeping wings.
    """
    pal = PALETTES['angelic']
    cv  = C()
    p,d = cv.p, cv.d

    WHEEL   = (255,240,200)   # ophanim ring (warm gold)
    WHEEL2  = (255,200,80)    # ring inner
    RIM     = (200,160,60)    # ring shadow
    EYE_WH  = (255,255,255)
    EYE_BL  = (40,64,160)
    EYE_PU  = (136,200,255)
    WING1   = (255,252,240)   # primary wing (bright white)
    WING2   = (255,240,200)   # wing mid
    WING3   = (220,200,160)   # wing shadow
    WING_EY = (100,150,255)   # small eye on wings
    INNER   = (255,248,220)   # inner ring glow

    # ── WINGS (seraphim — six total) ──────────────────────────────────────
    # Upper pair (pointing up, wide spread)
    p(2,  0, 9, 2, WING1)            # upper-left wing
    p(2,  2, 7, 2, WING2)
    p(2,  4, 5, 1, WING3)
    p(13, 0, 9, 2, WING1)            # upper-right wing
    p(14, 2, 7, 2, WING2)
    p(15, 4, 5, 1, WING3)
    # Eye on upper wings
    d(5, 1, EYE_WH); d(5,1,EYE_BL)   # left wing eye
    d(5, 2, EYE_WH)
    d(18,1, EYE_WH); d(18,1,EYE_BL)  # right wing eye
    d(18,2, EYE_WH)

    # Middle pair (sweeping outward at mid-height)
    p(0,  8, 4, 5, WING1)            # left sweep
    p(0,  9, 3, 3, WING2)
    p(20, 8, 4, 5, WING1)            # right sweep
    p(21, 9, 3, 3, WING2)
    d(1,  10, EYE_BL); d(0,10,(255,255,255))  # mid eye L
    d(22, 10, EYE_BL); d(23,10,(255,255,255)) # mid eye R

    # Lower pair (drooping down behind feet)
    p(3, 19, 8, 4, WING2)            # lower-left
    p(4, 21, 6, 2, WING3)
    p(13,19, 8, 4, WING2)            # lower-right
    p(13,21, 6, 2, WING3)
    d(6, 21, EYE_WH); d(17,21,EYE_WH)

    # ── OPHANIM WHEEL (ring surrounding dog body) ─────────────────────────
    # Outer ring — top arc
    p(4,  3, 16, 2, WHEEL)
    # Outer ring — sides
    p(2,  5,  2,14, WHEEL)
    p(20, 5,  2,14, WHEEL)
    # Outer ring — bottom arc
    p(4, 19, 16, 2, WHEEL)
    # Inner ring detail
    p(5,  4, 14, 1, WHEEL2)          # top inner rim
    p(3,  5,  1,13, WHEEL2)          # left inner rim
    p(20, 5,  1,13, WHEEL2)          # right inner rim
    p(5, 19, 14, 1, WHEEL2)          # bottom inner rim
    # Ring shadow/depth
    p(5,  5,  1,13, RIM)
    p(18, 5,  1,13, RIM)

    # Spokes of the wheel
    p(4,  11,16, 1, (240,220,160))   # horizontal spoke
    p(11,  4, 1,16, (240,220,160))   # vertical spoke

    # Eyes covering the ring (Ezekiel: the rings were full of eyes)
    for ex,ey in [(5,4),(9,4),(13,4),(17,4),         # top ring eyes
                  (5,19),(9,19),(13,19),(17,19),       # bottom ring eyes
                  (2,7),(2,11),(2,15),                 # left ring eyes
                  (21,7),(21,11),(21,15)]:              # right ring eyes
        d(ex,ey, EYE_WH)
        d(ex,ey, EYE_BL)

    # ── DOG BODY (center of the wheel, left-facing) ───────────────────────
    draw_dog(cv, pal, bulky=True, snout_long=True, ear_floppy=False,
             tongue_out=False, collar=False)

    # Override collar area with divine glow (no collar on doggod)
    p(8,11, 4,1, (255,248,220))      # neck divine light instead

    # ── DIVINE CENTER GLOW ────────────────────────────────────────────────
    d(11, 5, INNER); d(12,4,INNER)   # glow above dog
    d(10, 4,(255,255,255)); d(13,4,(255,255,255))

    # ── ALL-SEEING EYE (primary — large, on the wheel's face) ─────────────
    # This is the central eye that is "Doggod: All Seeing Eye"
    p(6,  8, 8, 6, (255,248,230))    # outer eye white (sclera)
    p(7,  9, 6, 4, EYE_WH)          # bright sclera
    p(8, 10, 4, 2, EYE_PU)          # iris (blue-purple)
    p(9, 10, 2, 2, EYE_BL)          # deep iris
    d(9, 10, (20,30,120))            # pupil
    d(8,  9, (255,255,255))          # eye highlight top-left
    d(10,11, (200,220,255))          # iris rim glow

    # Gold eyelashes / eye rays
    d(5,  8, WHEEL2); d(6,7,WHEEL2)
    d(13, 8, WHEEL2); d(14,7,WHEEL2)
    d(5, 13, WHEEL2); d(6,14,WHEEL2)
    d(13,13, WHEEL2); d(14,14,WHEEL2)

    # ── ADDITIONAL FLOATING EYES on wings ─────────────────────────────────
    for wx,wy in [(4,1),(16,1),(1,9),(22,9),(6,21),(17,21)]:
        d(wx,wy, EYE_WH)

    # ── POSE OVERLAY ──────────────────────────────────────────────────────
    pose(cv, pal, state)

    return cv.img_()

# ---------------------------------------------------------------------------
# Main builder for Olympus / Pantheon
# ---------------------------------------------------------------------------

OLYMPUS_VARIANTS = {
    # (draw_deity_fn, bulky, snout_long, ear_floppy, tongue_out, collar)
    0: (olympus_nymph,        False, False, True,  True,  True),
    1: (olympus_pan,          False, True,  False, True,  True),
    2: (olympus_hermes,       False, False, False, False, True),
    3: (olympus_apollo,       False, False, False, False, True),
    4: (olympus_zeus,         False, False, True,  False, True),
    5: (olympus_athena,       False, True,  False, False, True),
    6: (olympus_poseidon,     True,  True,  False, True,  True),
    7: (olympus_hephaestus,   True,  False, True,  False, True),
}

PANTHEON_VARIANTS = {
    0: (pantheon_anubis,         False, True,  False, False, True),
    1: (pantheon_coyote,         False, False, False, True,  True),
    2: (pantheon_ganesha,        True,  False, True,  False, True),
    3: (pantheon_odin,           False, True,  False, False, True),
    4: (pantheon_guanyin,        False, False, True,  False, True),
    5: (pantheon_huitzilopochtli,True,  False, False, True,  True),
    6: (pantheon_cernunnos,      False, True,  False, False, True),
    7: (pantheon_brahma,         True,  False, True,  False, True),
}

def build_sprite(deity_fn, pal, bulky, snout_long, ear_floppy, tongue_out, collar, state):
    cv = C()
    deity_fn(cv)
    draw_dog(cv, pal, bulky=bulky, snout_long=snout_long,
             ear_floppy=ear_floppy, tongue_out=tongue_out, collar=collar)
    pose(cv, pal, state)
    return cv.img_()


# ---------------------------------------------------------------------------
# Write all sprites
# ---------------------------------------------------------------------------
BASE = '/sessions/compassionate-jolly-cannon/mnt/Boss Rush/public/sprites/dogs'

TARGETS = []

# Olympus trash
for v,(fn,bk,sl,ef,to,co) in OLYMPUS_VARIANTS.items():
    TARGETS.append(('olympus', f'olympus_trash_{v}', fn, PALETTES['olympus'], bk,sl,ef,to,co))
# Olympus mini (Heracles)
TARGETS.append(('olympus','olympus_mini_hero_hound',
    lambda cv: olympus_heracles(cv,mini=True),
    PALETTES['olympus'], True,False,True,False,True))
# Olympus cap (Zeus enthroned)
TARGETS.append(('olympus','olympus_cap_zeusion',
    olympus_zeus_cap, PALETTES['olympus'], True,True,False,False,True))

# Pantheon trash
for v,(fn,bk,sl,ef,to,co) in PANTHEON_VARIANTS.items():
    TARGETS.append(('pantheon', f'pantheon_trash_{v}', fn, PALETTES['pantheon'], bk,sl,ef,to,co))
# Pantheon mini
TARGETS.append(('pantheon','pantheon_mini_high_priest',
    pantheon_high_priest, PALETTES['pantheon'], True,False,False,False,True))
# Pantheon cap
TARGETS.append(('pantheon','pantheon_cap_unnamed',
    pantheon_unnamed_cap, PALETTES['pantheon'], True,True,False,False,False))

total = 0
for entry in TARGETS:
    _theme, key, deity_fn, pal, bk,sl,ef,to,co = entry
    d = f'{BASE}/{key}'
    os.makedirs(d, exist_ok=True)
    for state in ('healthy','alert','hurt'):
        img = build_sprite(deity_fn, pal, bk,sl,ef,to,co, state)
        img.save(f'{d}/combat_{state}.png')
        total += 1
    print(f'  ✓  {key}')

# Doggod (special)
d = f'{BASE}/angelic_cap_doggod'
os.makedirs(d, exist_ok=True)
for state in ('healthy','alert','hurt'):
    img = draw_doggod(state)
    img.save(f'{d}/combat_{state}.png')
    total += 1
print(f'  ✓  angelic_cap_doggod (biblical)')

print(f'\nDone — {total} PNGs written.')
                                                                                