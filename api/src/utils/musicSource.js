// Store canonical provider URLs, never iframe HTML or expiring audio stream tokens.
// No request to the submitted URL is made by the API.
function parseMusicSource(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Paste a supported music link');
  let value = input.trim();
  const uri = value.match(/^spotify:(track|album|playlist|artist|episode|show):([A-Za-z0-9]{22})$/);
  if (uri) value = `https://open.spotify.com/${uri[1]}/${uri[2]}`;
  let url;
  try { url = new URL(value); } catch { throw new Error('Paste the full https link to a track or playlist'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port) throw new Error('Use an https music link without credentials or a port');
  const host = url.hostname.toLowerCase();
  if (['soundcloud.com', 'www.soundcloud.com', 'm.soundcloud.com'].includes(host)) {
    if (!/^\/[A-Za-z0-9_-]+\/(?:[A-Za-z0-9_-]+|sets\/[A-Za-z0-9_-]+)\/?$/.test(url.pathname)) throw new Error('Use a SoundCloud track or playlist link');
    return { provider: 'soundcloud', url: `https://soundcloud.com${url.pathname.replace(/\/$/, '')}` };
  }
  if (host === 'open.spotify.com') {
    const match = url.pathname.match(/^\/(?:intl-[a-zA-Z-]+\/)?(track|album|playlist|artist|episode|show)\/([A-Za-z0-9]{22})\/?$/);
    if (!match) throw new Error('Use a Spotify track, album or playlist link');
    return { provider: 'spotify', url: `https://open.spotify.com/${match[1]}/${match[2]}` };
  }
  if (['youtube.com', 'www.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be'].includes(host)) {
    const short = host.endsWith('youtu.be');
    const video = short ? url.pathname.slice(1) : url.searchParams.get('v') || url.pathname.match(/^\/(?:shorts|embed)\/([A-Za-z0-9_-]{11})\/?$/)?.[1];
    const playlist = url.searchParams.get('list');
    if (video && !/^[A-Za-z0-9_-]{11}$/.test(video)) throw new Error('This YouTube video link is not valid');
    if (playlist && !/^[A-Za-z0-9_-]{10,100}$/.test(playlist)) throw new Error('This YouTube playlist link is not valid');
    if (!video && (!playlist || url.pathname !== '/playlist')) throw new Error('Use a YouTube video or playlist link');
    const query = new URLSearchParams();
    if (video) query.set('v', video);
    if (playlist) query.set('list', playlist);
    return { provider: 'youtube', url: `https://www.youtube.com/${video ? 'watch' : 'playlist'}?${query}` };
  }
  const publicHost = host.includes('.') && !host.startsWith('[') && !/^\d+(?:\.\d+){0,3}$/.test(host) && !/\.(?:local|internal|localhost|test|invalid)$/.test(host);
  if (publicHost && /\.(?:mp3|m4a|ogg|wav|aac)$/i.test(url.pathname)) {
    url.hash = '';
    return { provider: 'audio', url: url.href };
  }
  throw new Error('Use SoundCloud, Spotify, YouTube or a direct https audio file link');
}

function validateMusicFields(fields) {
  if (fields.musicSource === undefined || fields.musicSource === null) return null;
  const source = fields.musicSource;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return 'The music source must contain a provider and URL';
  try {
    const normalized = parseMusicSource(source.url);
    if (normalized.provider !== source.provider) return 'The provider does not match the music link';
    fields.musicSource = normalized;
    if (fields.cdCode) return 'Choose either a CD or an online music source';
    fields.cdCode = null;
    return null;
  } catch (err) { return err.message; }
}

module.exports = { parseMusicSource, validateMusicFields };
