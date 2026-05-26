#!/usr/bin/env python3
"""
gen_sfx.py — Meow Rush / Boss Rush chiptune SFX generator
Generates 36 OGG files to public/audio/sfx/

Usage: python gen_sfx.py
Requires: numpy, ffmpeg in PATH

Audio & SFX Bible compliance:
  - Format: OGG Vorbis, 44100 Hz, mono
  - Peaks: -3 dBFS (game sets volume 0.5-0.7)
  - Style: 8-bit square/pulse waves, light noise for impacts
  - Silence trimmed to < 5 ms lead-in
"""

import os, sys, wave, subprocess
import numpy as np

RATE = 44100
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(SCRIPT_DIR, '..', 'public', 'audio', 'sfx')

# ── MIDI note constants ────────────────────────────────────────────────────────
C2, D2, E2, F2, G2, A2, B2 = 36, 38, 40, 41, 43, 45, 47
C3, D3, E3, F3, G3, A3, B3 = 48, 50, 52, 53, 55, 57, 59
C4, D4, E4, F4, G4, A4, B4 = 60, 62, 64, 65, 67, 69, 71
C5, D5, E5, F5, G5, A5, B5 = 72, 74, 76, 77, 79, 81, 83
C6, D6, E6, F6, G6, A6, B6 = 84, 86, 88, 89, 91, 93, 95
C7 = 96


def hz(midi):
    """MIDI note number → frequency in Hz."""
    return 440.0 * 2.0 ** ((midi - 69) / 12.0)


# ── DSP primitives ─────────────────────────────────────────────────────────────

def n_samp(dur):
    return int(RATE * dur)


def sq(freq, dur, duty=0.5):
    """Square / pulse wave, float32 in [-1, 1]."""
    t = np.linspace(0, dur, n_samp(dur), endpoint=False)
    phase = (t * freq) % 1.0
    return np.where(phase < duty, 1.0, -1.0).astype(np.float32)


def sq_sweep(f0, f1, dur, duty=0.5):
    """Linearly frequency-swept square wave."""
    freqs = np.linspace(f0, f1, n_samp(dur))
    phase = np.cumsum(freqs / RATE) % 1.0
    return np.where(phase < duty, 1.0, -1.0).astype(np.float32)


def wn(dur):
    """White noise burst."""
    return np.random.uniform(-1.0, 1.0, n_samp(dur)).astype(np.float32)


def env(n, a, d, s, r):
    """
    ADSR envelope array of length n.
    a/d/r are in seconds; s is sustain level in [0, 1].
    Clamps segments so they always fit inside n samples.
    """
    ai = min(n_samp(a), n)
    remaining = n - ai
    di = min(n_samp(d), remaining)
    remaining -= di
    ri = min(n_samp(r), remaining)
    si = remaining - ri

    e = np.zeros(n, dtype=np.float32)
    cur = 0
    if ai:
        e[cur:cur + ai] = np.linspace(0.0, 1.0, ai)
        cur += ai
    if di:
        e[cur:cur + di] = np.linspace(1.0, s, di)
        cur += di
    if si:
        e[cur:cur + si] = s
        cur += si
    if ri:
        e[cur:cur + ri] = np.linspace(s, 0.0, ri)
    return e


def adsr(sig, a, d, s, r):
    """Apply ADSR envelope to signal."""
    return sig * env(len(sig), a, d, s, r)


def mix(*arrs):
    """Sum multiple arrays, zero-padding shorter ones."""
    n = max(len(a) for a in arrs)
    out = np.zeros(n, dtype=np.float32)
    for a in arrs:
        out[:len(a)] += a
    return out


def cat(*arrs):
    """Concatenate arrays."""
    return np.concatenate([a.astype(np.float32) for a in arrs])


def sil(dur):
    """Silent gap."""
    return np.zeros(n_samp(dur), dtype=np.float32)


# ── Post-processing ────────────────────────────────────────────────────────────

def normalize(sig, db=-3.0):
    peak = np.max(np.abs(sig))
    if peak < 1e-9:
        return sig
    return sig * (10.0 ** (db / 20.0) / peak)


def trim_silence(sig, db=-40.0):
    thr = 10.0 ** (db / 20.0)
    above = np.where(np.abs(sig) > thr)[0]
    if len(above) == 0:
        return sig
    s = max(0, above[0] - n_samp(0.002))
    e = min(len(sig), above[-1] + n_samp(0.005))
    return sig[s:e]


def add_fades(sig, fi=0.003, fo=0.005):
    sig = sig.copy()
    ni = min(n_samp(fi), len(sig))
    no = min(n_samp(fo), len(sig))
    if ni > 0:
        sig[:ni] *= np.linspace(0.0, 1.0, ni)
    if no > 0:
        sig[-no:] *= np.linspace(1.0, 0.0, no)
    return sig


# ── I/O ────────────────────────────────────────────────────────────────────────

def save_ogg(sfx_id, sig):
    """Normalize → trim → fade → WAV → ffmpeg OGG. Returns True on success."""
    os.makedirs(OUT_DIR, exist_ok=True)
    sig = add_fades(trim_silence(normalize(sig, -3.0)))
    pcm = (np.clip(sig, -1.0, 1.0) * 32767.0).astype(np.int16)

    wav = os.path.join(OUT_DIR, sfx_id + '.wav')
    ogg = os.path.join(OUT_DIR, sfx_id + '.ogg')

    with wave.open(wav, 'w') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(RATE)
        wf.writeframes(pcm.tobytes())

    result = subprocess.run(
        ['ffmpeg', '-y', '-i', wav, '-c:a', 'libvorbis', '-q:a', '5', ogg],
        capture_output=True
    )
    if os.path.exists(wav):
        os.remove(wav)
    return result.returncode == 0


# ── SFX builders ──────────────────────────────────────────────────────────────
# Each function returns a float32 numpy array (unnormalized).

# 4.1 UI / flow ----------------------------------------------------------------

def ui_click():
    """50–80 ms soft blip — menu buttons, skill row."""
    return adsr(sq(hz(C5), 0.065), .001, .015, .0, .049)


def ui_confirm():
    """80–120 ms ascending 2-note — Start, class pick, buy upgrade."""
    n1 = adsr(sq(hz(C5), .050), .001, .010, .6, .039)
    n2 = adsr(sq(hz(G5), .070), .001, .010, .6, .059)
    return cat(n1, sil(.010), n2)


def ui_cancel():
    """60–100 ms descending blip — back, close skills."""
    n1 = adsr(sq(hz(G4), .050), .001, .010, .5, .039)
    n2 = adsr(sq(hz(C4), .060), .001, .010, .4, .049)
    return cat(n1, sil(.008), n2)


def ui_error():
    """100–150 ms buzz — can't afford, can't run from boss."""
    def burst(dur):
        s = adsr(sq(hz(A3), dur, duty=.2), .001, .030, .5, max(.001, dur - .031))
        n = adsr(wn(dur), .001, .020, .3, max(.001, dur - .021)) * .3
        return mix(s * .7, n)
    return cat(burst(.065), sil(.020), burst(.065))


def camp_buy():
    """120–200 ms coin + register ka-ching — shop purchase."""
    notes = [C5, E5, G5, C6]
    parts = []
    for i, m in enumerate(notes):
        d = .10 if i == 3 else .040
        parts.append(adsr(sq(hz(m), d), .001, .010, .7, d * .4))
        if i < 3:
            parts.append(sil(.010))
    return cat(*parts)


# 4.2 Combat — player ----------------------------------------------------------

def fight_hit():
    """100–180 ms physical FIGHT — sword/dagger thwack."""
    dur = .13
    return mix(
        adsr(wn(dur), .001, .040, .2, .089) * .5,
        adsr(sq(hz(G3), dur), .001, .050, .3, .079) * .6,
    )


def fight_hit_crit():
    """150–220 ms backstab / heavy crit — sharper, louder."""
    dur = .17
    hi = adsr(sq(hz(E6), .040, duty=.3), .001, .039, .0, .001) * .4
    base = mix(
        adsr(wn(dur), .001, .030, .3, .139) * .5,
        adsr(sq(hz(B4), dur, duty=.3), .001, .040, .4, .129) * .7,
    )
    base[:len(hi)] += hi
    return base


def defend():
    """100–150 ms shield brace — dull thud + short noise gate."""
    dur = .12
    return mix(
        adsr(wn(dur), .001, .020, .1, .099) * .4,
        adsr(sq(hz(G3), dur), .001, .080, .2, .039) * .7,
    )


def skill_cast():
    """80–120 ms generic skill open — before element layer."""
    s1 = adsr(sq(hz(C5), .040), .001, .039, .0, .001)
    s2 = adsr(sq(hz(E5), .060), .001, .020, .5, .039)
    return cat(s1, s2)


def skill_fire():
    """200–350 ms fire / afterburn prime — noise rise + square sweep."""
    dur = .28
    ramp = np.linspace(.3, 1.0, n_samp(dur), dtype=np.float32)
    n = adsr(wn(dur) * ramp, .010, .050, .6, .15) * .5
    s = adsr(sq_sweep(hz(A3), hz(C5), dur, duty=.3), .010, .050, .5, .15) * .6
    return mix(n, s)


def skill_ice():
    """200–350 ms blizzard / freeze — descending crystalline arp."""
    notes = [E6, C6, G5, E5]
    parts = []
    for i, m in enumerate(notes):
        d = .10 if i == 3 else .060
        parts.append(adsr(sq(hz(m), d), .001, .020, .5, d * .5))
    sig = cat(*parts)
    sh_dur = len(sig) / RATE
    sh = adsr(sq(hz(C7), sh_dur), .050, .100, .3, .1) * .3
    return mix(sig, sh[:len(sig)])


def skill_thunder():
    """250–400 ms thunder nuke — buzz + high zap + crackle."""
    dur = .32
    zap_dur = .20
    zap = adsr(sq_sweep(hz(C7), hz(A3), zap_dur, duty=.3), .001, .050, .4, .1) * .7
    zap_full = np.zeros(n_samp(dur), dtype=np.float32)
    zap_full[:len(zap)] = zap
    return mix(
        adsr(sq(hz(A2), dur, duty=.10), .001, .050, .6, .20) * .5,
        zap_full,
        adsr(wn(dur), .001, .030, .3, .20) * .3,
    )


def skill_heal():
    """150–250 ms mend / heal sparkle — soft ascending major arp."""
    notes = [C5, E5, G5, C6, E6]
    parts = []
    for i, m in enumerate(notes):
        d = .10 if i == 4 else .050
        parts.append(adsr(sq(hz(m), d), .002, .020, .6, d * .4) * .8)
        if i < 4:
            parts.append(sil(.005))
    return cat(*parts)


def skill_holy():
    """200–300 ms Cleric sacred — bell-ish square wave with harmonics."""
    dur = .25
    return mix(
        adsr(sq(hz(C5), dur), .001, .040, .5, .18) * .6,
        adsr(sq(hz(C6), dur), .001, .030, .3, .19) * .3,
        adsr(sq(hz(G5), dur), .001, .020, .25, .20) * .2,
    )


def skill_poison():
    """150–250 ms toxic / poison apply — slimy detuned blip."""
    dur = .20
    f1 = hz(A4)
    return mix(
        adsr(sq(f1, dur, duty=.4), .001, .040, .4, .14) * .5,
        adsr(sq(f1 * 1.015, dur, duty=.6), .001, .040, .4, .14) * .5,
        adsr(wn(dur), .001, .020, .1, .08) * .2,
    )


def skill_war_cry():
    """250–400 ms horn-like chip fanfare — wide duty cycle."""
    notes = [G4, C5, E5, G5]
    parts = []
    for i, m in enumerate(notes):
        d = .16 if i == 3 else .080
        parts.append(adsr(sq(hz(m), d, duty=.25), .005, .020, .7, d * .3))
        if i < 3:
            parts.append(sil(.005))
    return cat(*parts)


def buff_apply():
    """100–150 ms war cry / dodge / guard buff up."""
    s1 = adsr(sq(hz(G4), .040), .001, .039, .0, .001)
    s2 = adsr(sq(hz(C5), .070), .001, .020, .5, .050)
    return cat(s1, s2)


def dodge():
    """80–120 ms whoosh — enemy attack missed."""
    return adsr(sq_sweep(hz(G6), hz(C4), .10), .001, .020, .4, .069)


def reflect():
    """150–220 ms Aegis mirror proc — ascending arp + shimmer."""
    fwd = cat(*[adsr(sq(hz(m), .040), .001, .010, .6, .016) for m in [C5, G5, C6]])
    sh = adsr(sq(hz(E6), .080), .001, .079, .0, .001)
    return cat(fwd, sh)


def lifesteal():
    """120–180 ms small drain + heal sip."""
    drain = adsr(sq_sweep(hz(C5), hz(G3), .080), .001, .020, .4, .059)
    heal = adsr(sq(hz(E5), .090), .005, .020, .5, .065)
    return cat(drain, sil(.020), heal)


# 4.3 Combat — enemy -----------------------------------------------------------

def enemy_hit():
    """100–180 ms player takes damage — lower, rougher."""
    dur = .14
    return mix(
        adsr(wn(dur), .001, .050, .2, .089) * .6,
        adsr(sq(hz(E3), dur, duty=.3), .001, .060, .3, .079) * .5,
    )


def enemy_attack():
    """80–120 ms wind-up before hit — rising sweep."""
    return adsr(sq_sweep(hz(C3), hz(G4), .10, duty=.4), .001, .020, .5, .069)


def poison_tick():
    """60–100 ms quiet toxic tick — detuned short blip."""
    return adsr(sq(hz(A4) * .98, .070, duty=.4), .001, .020, .2, .039) * .5


def freeze_tick():
    """60–100 ms ice crystal tick — high short ping."""
    return adsr(sq(hz(C6), .070), .001, .020, .2, .039) * .6


def afterburn():
    """120–200 ms fire chip on enemy entry — noise crackle."""
    dur = .16
    return mix(
        adsr(wn(dur), .001, .030, .4, .12) * .5,
        adsr(sq(hz(G4), dur, duty=.3), .001, .040, .3, .12) * .4,
    )


# 4.4 Run outcomes -------------------------------------------------------------

def coin_pickup():
    """80–150 ms +coins on kill — high coin ping."""
    s1 = adsr(sq(hz(C6), .050), .001, .010, .6, .039)
    s2 = adsr(sq(hz(E6), .070), .001, .010, .6, .059)
    return cat(s1, s2)


def streak():
    """150–250 ms streak ≥3 — brighter coin arpeggio."""
    notes = [C5, E5, G5, C6, E6]
    parts = []
    for i, m in enumerate(notes):
        d = .09 if i == 4 else .040
        parts.append(adsr(sq(hz(m), d), .001, .010, .7, d * .4))
        if i < 4:
            parts.append(sil(.008))
    return cat(*parts)


def victory():
    """400–800 ms enemy slain — short win jingle (5-note ascending)."""
    notes = [C5, E5, G5, C6, G6]
    parts = []
    for i, m in enumerate(notes):
        d = .30 if i == 4 else .070
        parts.append(adsr(sq(hz(m), d), .002, .010, .7, d * .35))
        if i < 4:
            parts.append(sil(.010))
    return cat(*parts)


def boss_victory():
    """600–1200 ms boss / capstone kill — bigger jingle + triumphant chord."""
    win = victory()
    dur = .50
    chord = mix(
        adsr(sq(hz(C5), dur), .001, .050, .7, .35),
        adsr(sq(hz(E5), dur), .001, .050, .7, .35),
        adsr(sq(hz(G5), dur), .001, .050, .7, .35),
    ) / 3.0
    return cat(win, chord)


def death():
    """500–900 ms player death — descending 4-note, not hopeless."""
    notes = [C5, B4, A4, G3]
    parts = []
    for i, m in enumerate(notes):
        d = .40 if i == 3 else .10
        parts.append(adsr(sq(hz(m), d), .002, .020, .6, d * .40))
        if i < 3:
            parts.append(sil(.015))
    return cat(*parts)


def floor_transition():
    """150–250 ms next floor appear — stair sweep blip."""
    sweep = adsr(sq_sweep(hz(G4), hz(G5), .090), .001, .020, .6, .029)
    top = adsr(sq(hz(G5), .090), .001, .020, .5, .029)
    return cat(sweep, top)


def theme_transition():
    """300–500 ms new theme block — stab + chord sting."""
    stab = cat(
        adsr(sq(hz(G4), .080, duty=.25), .001, .020, .5, .032),
        sil(.010),
        adsr(sq(hz(C5), .080, duty=.25), .001, .020, .5, .032),
        sil(.010),
    )
    chord = mix(
        adsr(sq(hz(C5), .25, duty=.25), .001, .040, .6, .15),
        adsr(sq(hz(E5), .25, duty=.25), .001, .040, .6, .15),
        adsr(sq(hz(G5), .25, duty=.25), .001, .040, .6, .15),
    ) / 3.0
    return cat(stab, chord)


# 4.5 Boss moments -------------------------------------------------------------

def boss_enter():
    """400–700 ms BOSS FLOOR — low brass-like square + descending arp."""
    dur = .55
    bass = adsr(sq(hz(G2), dur, duty=.25), .005, .080, .6, .30) * .5
    mid = adsr(sq(hz(G3), dur, duty=.25), .005, .080, .5, .30) * .4
    notes = [G5, E5, C5, G4]
    arp_parts = [sil(.080)]
    for i, m in enumerate(notes):
        d = .12 if i == 3 else .060
        arp_parts.append(adsr(sq(hz(m), d, duty=.4), .001, .020, .5, d * .4))
    arp = cat(*arp_parts)
    arp_full = np.zeros(n_samp(dur), dtype=np.float32)
    n_copy = min(len(arp), len(arp_full))
    arp_full[:n_copy] = arp[:n_copy]
    return mix(bass, mid, arp_full * .4)


def boss_warning():
    """200–300 ms optional pulse before manual boss — triple blip."""
    blip = adsr(sq(hz(G4), .070, duty=.3), .001, .010, .6, .028)
    return cat(blip, sil(.040), blip, sil(.040), blip)


# 4.6 Optional polish ----------------------------------------------------------

def auto_on():
    """Toggle AUTO on — ascending 2-note."""
    s1 = adsr(sq(hz(C5), .040), .001, .039, .0, .001)
    s2 = adsr(sq(hz(G5), .050), .001, .049, .0, .001)
    return cat(s1, s2)


def auto_off():
    """Toggle AUTO off — descending 2-note."""
    s1 = adsr(sq(hz(G5), .040), .001, .039, .0, .001)
    s2 = adsr(sq(hz(C5), .050), .001, .049, .0, .001)
    return cat(s1, s2)


def run_retreat():
    """Flee to camp — descending sweep + noise."""
    dur = .15
    sweep = adsr(sq_sweep(hz(C5), hz(C3), dur), .001, .030, .5, .10)
    n = adsr(wn(dur), .001, .020, .3, .07) * .3
    return mix(sweep, n)


# ── Manifest & runner ──────────────────────────────────────────────────────────

MANIFEST = [
    # 4.1 UI / flow
    ('ui_click',          ui_click),
    ('ui_confirm',        ui_confirm),
    ('ui_cancel',         ui_cancel),
    ('ui_error',          ui_error),
    ('camp_buy',          camp_buy),
    # 4.2 Combat — player
    ('fight_hit',         fight_hit),
    ('fight_hit_crit',    fight_hit_crit),
    ('defend',            defend),
    ('skill_cast',        skill_cast),
    ('skill_fire',        skill_fire),
    ('skill_ice',         skill_ice),
    ('skill_thunder',     skill_thunder),
    ('skill_heal',        skill_heal),
    ('skill_holy',        skill_holy),
    ('skill_poison',      skill_poison),
    ('skill_war_cry',     skill_war_cry),
    ('buff_apply',        buff_apply),
    ('dodge',             dodge),
    ('reflect',           reflect),
    ('lifesteal',         lifesteal),
    # 4.3 Combat — enemy
    ('enemy_hit',         enemy_hit),
    ('enemy_attack',      enemy_attack),
    ('poison_tick',       poison_tick),
    ('freeze_tick',       freeze_tick),
    ('afterburn',         afterburn),
    # 4.4 Run outcomes
    ('coin_pickup',       coin_pickup),
    ('streak',            streak),
    ('victory',           victory),
    ('boss_victory',      boss_victory),
    ('death',             death),
    ('floor_transition',  floor_transition),
    ('theme_transition',  theme_transition),
    # 4.5 Boss moments
    ('boss_enter',        boss_enter),
    ('boss_warning',      boss_warning),
    # 4.6 Optional polish
    ('auto_on',           auto_on),
    ('auto_off',          auto_off),
    ('run_retreat',       run_retreat),
]


if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    print(f'Meow Rush SFX Generator — {len(MANIFEST)} sounds → {OUT_DIR}')
    print()
    ok, fail = 0, 0
    for sfx_id, fn in MANIFEST:
        print(f'  {sfx_id}...', end='', flush=True)
        try:
            sig = fn()
            if save_ogg(sfx_id, sig):
                print(' ✓')
                ok += 1
            else:
                print(' ✗  (ffmpeg error)')
                fail += 1
        except Exception as exc:
            print(f' ✗  ERROR: {exc}')
            fail += 1

    print()
    print(f'Done: {ok}/{len(MANIFEST)} sounds generated successfully.')
    if fail:
        print(f'      {fail} failed — see errors above.')
    else:
        print('      Drop public/audio/sfx/*.ogg into your repo and wire up playSfx(id).')
