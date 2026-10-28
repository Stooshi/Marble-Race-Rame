#!/usr/bin/env python3
"""Cuts a decoded tune (raw float32 stereo, 48 kHz, on stdin) so it loops without a click: it starts
at the first rising zero crossing in its first 5 ms and ends at the rising zero crossing nearest its
end (in the last 30 ms), so the end runs straight into the start (scripts/convert-audio.sh)."""
import sys
import numpy as np

RATE = 48000
x = np.frombuffer(sys.stdin.buffer.read(), dtype=np.float32).reshape(-1, 2)
m = x.mean(axis=1)
rise = np.nonzero((m[:-1] <= 0) & (m[1:] > 0))[0] + 1
start = next((i for i in rise if i < RATE * 0.005), 0)
tail = [i for i in rise if i > len(m) - RATE * 0.03]
end = tail[-1] if tail else len(m)
sys.stdout.buffer.write(np.ascontiguousarray(x[start:end]).tobytes())
sys.stderr.write(f"loop-cut: from {start / RATE * 1000:.1f} ms, {(len(m) - end) / RATE * 1000:.1f} ms off the end\n")
