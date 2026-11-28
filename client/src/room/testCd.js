// Part of: Music: sample CD, not used by the app now.
// A 3-track sample CD (synthesized loops in public/audio/test/). Not used by the app now (real CDs come from the API);
// kept as a handy fixture. A CD has this shape: { title, tracks: [{ title, src }] }.
export const TEST_CD = {
  title: 'Test CD',
  tracks: [
    { title: 'Lamp Light', src: '/audio/test/lamp-light.mp3' },
    { title: 'Slow Tide', src: '/audio/test/slow-tide.mp3' },
    { title: 'Paper Clouds', src: '/audio/test/paper-clouds.mp3' },
  ],
};
