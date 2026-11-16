# Makes three short calm test tracks from plain sine waves (no samples, so there is nothing to license).
import numpy as np, wave, subprocess, sys
SR = 32000
OUT = sys.argv[1]
def note(n): return 440.0 * 2 ** ((n - 69) / 12)
def pad(freq, dur, rng):
    t = np.arange(int(dur * SR)) / SR
    y = sum(np.sin(2 * np.pi * freq * k * (1 + d) * t + rng.uniform(0, 6.28)) / k ** 1.6 for k in (1, 2, 3) for d in (-0.003, 0.003))
    env = np.minimum(1, t / 1.8) * np.minimum(1, (dur - t) / 2.2)
    return y * env * (0.85 + 0.15 * np.sin(2 * np.pi * 0.23 * t))
def pluck(freq, dur=2.6):
    t = np.arange(int(dur * SR)) / SR
    y = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) * np.exp(-t * 5) + 0.12 * np.sin(6 * np.pi * freq * t) * np.exp(-t * 9)
    return y * np.exp(-t * 2.1) * np.minimum(1, t / 0.006)
def add(buf, y, at, gain):
    i = int(at * SR); y = y[: max(0, len(buf) - i)]; buf[i : i + len(y)] += y * gain
def track(name, chords, bar, scale, seed, beat):
    rng = np.random.default_rng(seed)
    total = bar * len(chords) * 2 + 3
    buf = np.zeros(int(total * SR))
    for rep in range(2):
        for ci, chord in enumerate(chords):
            at = (rep * len(chords) + ci) * bar
            for n in chord: add(buf, pad(note(n), bar + 2.5, rng), at, 0.05)
            add(buf, pad(note(chord[0] - 12), bar + 2.5, rng), at, 0.07)
            steps = int(bar / beat)
            for s in range(steps):
                if rng.random() < 0.55:
                    n = rng.choice(chord) + 12 if rng.random() < 0.6 else rng.choice(scale)
                    add(buf, pluck(note(int(n))), at + s * beat + rng.uniform(-0.02, 0.02), rng.uniform(0.07, 0.13))
    # a simple echo, then gentle fade in and out
    d = int(0.42 * SR); echo = buf.copy()
    for k in (1, 2, 3): echo[d * k :] += buf[: -d * k] * 0.38 ** k
    t = np.arange(len(echo)) / SR
    echo *= np.minimum(1, t / 1.5) * np.minimum(1, (total - t) / 3)
    echo = echo / np.abs(echo).max() * 0.8
    with wave.open(f'{OUT}/{name}.wav', 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((echo * 32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/{name}.wav', '-ac', '1', '-b:a', '56k', f'{OUT}/{name}.mp3'], check=True)
track('lamp-light', [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]], 6.0, [69, 72, 74, 76, 79], 1, 0.75)
track('slow-tide', [[50, 54, 57, 61], [47, 50, 54, 57], [43, 47, 50, 54], [45, 49, 52, 57]], 7.0, [66, 69, 73, 74, 78], 2, 0.875)
track('paper-clouds', [[60, 64, 67, 71], [57, 60, 64, 67], [53, 57, 60, 64], [55, 59, 62, 65]], 5.0, [72, 74, 76, 79, 83], 3, 0.625)
