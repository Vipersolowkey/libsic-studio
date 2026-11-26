// Part of: Music: loads the SoundCloud, Spotify and YouTube player scripts.
// Used by: ExternalMusic.jsx.
// Loads a provider's official player script (SoundCloud, Spotify, YouTube) once and caches the promise.
// Rejects after 18 s or on a load error so the UI can show "could not connect" instead of waiting forever.
const pending = new Map();
const urls = {
  soundcloud: 'https://w.soundcloud.com/player/api.js',
  spotify: 'https://open.spotify.com/embed/iframe-api/v1',
  youtube: 'https://www.youtube.com/iframe_api',
};
let spotifyApi;

// Resolves with the SDK object (SC / spotify api / YT). Each provider announces readiness differently, hence the branches.
export function loadProviderSdk(provider) {
  const current = provider === 'soundcloud' ? window.SC : provider === 'youtube' ? window.YT : spotifyApi;
  if (provider === 'soundcloud' && current?.Widget || provider === 'youtube' && current?.Player || provider === 'spotify' && current) return Promise.resolve(current);
  if (pending.has(provider)) return pending.get(provider);
  const promise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = urls[provider];
    script.async = true;
    let settled = false;
    const finish = (api) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(api);
    };
    const fail = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.remove();
      pending.delete(provider);
      reject(new Error(`Could not connect to ${provider}. Check your connection or try another source.`));
    };
    const timer = setTimeout(fail, 18000);
    script.onerror = fail;
    if (provider === 'soundcloud') script.onload = () => window.SC?.Widget ? finish(window.SC) : fail();
    if (provider === 'spotify') {
      const previous = window.onSpotifyIframeApiReady;
      window.onSpotifyIframeApiReady = (api) => {
        spotifyApi = api;
        finish(api);
        if (typeof previous === 'function') previous(api);
      };
    }
    if (provider === 'youtube') {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        finish(window.YT);
        if (typeof previous === 'function') previous();
      };
    }
    document.head.appendChild(script);
  });
  pending.set(provider, promise);
  return promise;
}
