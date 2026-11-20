// Full playlists load their current track list from SoundCloud's Widget API.
// These are provider links, not copies of their audio files.
export const DISCOVERY_PLAYLISTS = [
  { title: 'Chillhop Essentials · Fall', caption: 'Warm lo-fi and jazz beats', provider: 'soundcloud', url: 'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-fall-2024' },
  { title: 'Chillhop Essentials · Summer', caption: 'Laid-back instrumental beats', provider: 'soundcloud', url: 'https://soundcloud.com/chillhopdotcom/sets/chillhop-essentials-summer-2026' },
];
export const DEFAULT_MUSIC_SOURCE = { provider: DISCOVERY_PLAYLISTS[0].provider, url: DISCOVERY_PLAYLISTS[0].url };
export const PROVIDER_NAMES = { soundcloud: 'SoundCloud', spotify: 'Spotify', youtube: 'YouTube', audio: 'Audio link' };
export const sourceName = (source) => DISCOVERY_PLAYLISTS.find((p) => p.url === source?.url)?.title || PROVIDER_NAMES[source?.provider] || 'Online music';

export function embedUrl(source) {
  if (source.provider === 'soundcloud') {
    return `https://w.soundcloud.com/player/?${new URLSearchParams({ url: source.url, auto_play: 'false', show_artwork: 'true', show_user: 'true', show_comments: 'false', visual: 'false', color: '#e8b86a' })}`;
  }
  if (source.provider === 'youtube') {
    const url = new URL(source.url);
    const query = new URLSearchParams({ enablejsapi: '1', origin: window.location.origin, playsinline: '1', autoplay: '0' });
    if (url.searchParams.has('list')) query.set('list', url.searchParams.get('list'));
    return `https://www.youtube-nocookie.com/embed/${url.searchParams.get('v') || 'videoseries'}?${query}`;
  }
  return '';
}
