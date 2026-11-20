"""Build the 12 CC0 music files. Requires Python/numpy and ffmpeg on PATH.

Usage: python docs/art-tools/make_music_tracks.py client/public/audio/music
The three original pieces reuse the team's tone generator. Nine new arrangements
use different chord voicings, tempi and random seeds; no samples are used.
"""
from pathlib import Path
import sys

out = Path(sys.argv[1]).resolve()
out.mkdir(parents=True, exist_ok=True)
source = Path(__file__).with_name('make_test_tracks.py').read_text(encoding='utf-8')
source = source[:source.index("track('lamp-light'")]
# A slightly early pluck at time zero must be clipped at the start of the buffer.
source = source.replace('i = int(at * SR);', 'i = max(0, int(at * SR));')
exec(compile(source, 'make_test_tracks.py', 'exec'))

pieces = [
    ('lamp-light', 6, 1, 0), ('paper-clouds', 5, 3, 3),
    ('quiet-pages', 6, 11, 2), ('midnight-ink', 6.5, 12, -3),
    ('slow-tide', 7, 2, -7), ('pearl-drift', 7, 13, 5),
    ('blue-current', 8, 14, -2), ('coral-dream', 7.5, 15, -5),
    ('amber-window', 5.5, 16, 4), ('soft-horizon', 6, 17, 7),
    ('sunday-haze', 6.5, 18, 1), ('last-sunbeam', 7, 19, -1),
]
base = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 64]]
for name, bar, seed, transpose in pieces:
    chords = [[n + transpose for n in chord] for chord in base]
    scale = [n + transpose for n in [69, 72, 74, 76, 79]]
    track(name, chords, bar, scale, seed, bar / 8)
    (out / f'{name}.wav').unlink()
    print(name, flush=True)
