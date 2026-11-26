// Part of: Our own music: data of the 12 tracks and 3 official CDs.
// Used by: seedMusic.js.
// The 12 tracks and 3 official CDs. Tracks are our own synthesized pieces (CC0, made by docs/art-tools/make_music_tracks.py),
// the mp3s live in client/public/audio/music/<id>.mp3. Each official CD takes 4 tracks, in play order.
// names = [id, title, length in seconds]: the length is typed by hand, so keep it equal to the real file.
const names = [
  ['lamp-light', 'Lamp Light', 51], ['paper-clouds', 'Paper Clouds', 43],
  ['quiet-pages', 'Quiet Pages', 51], ['midnight-ink', 'Midnight Ink', 55],
  ['slow-tide', 'Slow Tide', 59], ['pearl-drift', 'Pearl Drift', 59],
  ['blue-current', 'Blue Current', 67], ['coral-dream', 'Coral Dream', 63],
  ['amber-window', 'Amber Window', 47], ['soft-horizon', 'Soft Horizon', 51],
  ['sunday-haze', 'Sunday Haze', 55], ['last-sunbeam', 'Last Sunbeam', 59],
];
const tracks = names.map(([id, title, duration]) => ({
  _id: id, title, duration, artist: 'Libsic Studio',
  src: `/audio/music/${id}.mp3`, license: 'CC0-1.0',
}));
const cds = [
  { code: 'night-study', title: 'Quiet Pages', trackIds: names.slice(0, 4).map(([id]) => id), official: true },
  { code: 'clam-cove', title: 'Below the Tide', trackIds: names.slice(4, 8).map(([id]) => id), official: true },
  { code: 'golden-loft', title: 'Golden Hours', trackIds: names.slice(8, 12).map(([id]) => id), official: true },
];
module.exports = { tracks, cds };
