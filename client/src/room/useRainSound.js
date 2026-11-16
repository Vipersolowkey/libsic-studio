import { useEffect, useRef } from 'react';

// A soft rain sound for rooms where the rain is switched on: a real recording of light rain on a window
// (client/public/audio/ambience/rain-on-window.mp3, from the free sound library of Moodist, Pixabay/CC0 licence,
// cut into a 30-second piece whose end flows into its start). It plays as an endless loop far under the music,
// and follows the music's volume. Browsers keep sound off until the visitor has clicked or pressed a key once;
// the sound then starts by itself.
export const RAIN_SRC = '/audio/ambience/rain-on-window.mp3';
export const RAIN_LEVEL = 0.18; // loudness of the rain at full music volume: about 16 dB under the music, a hush in the background
export const ALONE_BOOST = 1.4; // with no music playing, the rain is a little louder, so it can still be heard on its own

export const SOFTEN_HZ = 2200; // sound above this pitch is turned down; lower = softer and duller, higher = crisper

const FADE = 1.2; // seconds the rain takes to fade in and out

// The rain: the recording, looped without a gap through one master volume.
// Returns the master gain node, which starts silent; the recording is fetched and starts as soon as it has arrived.
export function buildRain(ctx, src = RAIN_SRC) {
  const master = ctx.createGain();
  master.gain.value = 0;
  master.connect(ctx.destination);
  fetch(src)
    .then((response) => response.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      if (ctx.state === 'closed') return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      // take the crisp top off the drops, so the rain sounds soft and far away
      const soften = ctx.createBiquadFilter();
      soften.type = 'lowpass';
      soften.frequency.value = SOFTEN_HZ;
      soften.Q.value = 0.5;
      source.connect(soften);
      soften.connect(master);
      source.start(0, Math.random() * buffer.duration); // start somewhere in the loop, so it does not always sound the same
    })
    .catch(() => {}); // no file or no decoder: the rain is only seen
  return master;
}

// on: the rain is switched on in the room. volume: the music volume, 0 to 1. playing: music is playing.
export const rainGain = (volume, playing) => RAIN_LEVEL * volume * (playing ? 1 : ALONE_BOOST);

export function useRainSound(on, volume, playing) {
  const graph = useRef(null); // { ctx, master }
  const stopTimer = useRef(null);
  const levelRef = useRef(0);
  levelRef.current = rainGain(volume, playing);

  useEffect(() => {
    if (!on) return undefined;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return undefined; // no sound support (or a test browser): the rain is only seen
    clearTimeout(stopTimer.current);
    if (!graph.current) {
      try {
        const ctx = new Ctx();
        graph.current = { ctx, master: buildRain(ctx) };
      } catch {
        return undefined;
      }
    }
    const { ctx, master } = graph.current;
    const resume = () => ctx.state === 'suspended' && ctx.resume().catch(() => {});
    resume();
    master.gain.setTargetAtTime(levelRef.current, ctx.currentTime, FADE / 3);
    window.addEventListener('pointerdown', resume);
    window.addEventListener('keydown', resume);
    return () => {
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      master.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
      stopTimer.current = setTimeout(() => ctx.state === 'running' && ctx.suspend().catch(() => {}), FADE * 3000);
    };
  }, [on]);

  // the music volume was changed, or the music started or stopped: the rain follows (and steps back for music)
  useEffect(() => {
    if (!on || !graph.current) return;
    const { ctx, master } = graph.current;
    master.gain.setTargetAtTime(rainGain(volume, playing), ctx.currentTime, 0.4);
  }, [on, volume, playing]);

  useEffect(
    () => () => {
      clearTimeout(stopTimer.current);
      graph.current?.ctx.close().catch(() => {});
      graph.current = null;
    },
    []
  );
}
