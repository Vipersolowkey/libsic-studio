// A small built-in CD so the player can be tried out before the real CDs arrive from the API (the music side).
// The three tracks are short calm loops we generated ourselves from plain tones, so they are free to use.
// A CD from the API can replace this later as long as it has the same shape: { title, tracks: [{ title, src }] }.
export const TEST_CD = {
  title: 'Test CD',
  tracks: [
    { title: 'Lamp Light', src: '/audio/test/lamp-light.mp3' },
    { title: 'Slow Tide', src: '/audio/test/slow-tide.mp3' },
    { title: 'Paper Clouds', src: '/audio/test/paper-clouds.mp3' },
  ],
};
