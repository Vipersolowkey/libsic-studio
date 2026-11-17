const express = require('express');
const { parseMusicSource } = require('../utils/musicSource');

const shortHosts = { 'on.soundcloud.com': 'soundcloud', 'spotify.link': 'spotify' };
const metadataCache = new Map();

async function soundcloudMetadata(ids, fetcher = fetch) {
  if (!Array.isArray(ids) || !ids.length || ids.length > 50 || ids.some((id) => typeof id !== 'string' || !/^\d{1,20}$/.test(id))) throw new Error('Send 1 to 50 SoundCloud track ids');
  const unique = [...new Set(ids)];
  const results = new Array(unique.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(4, unique.length) }, async () => {
    while (cursor < unique.length) {
      const at = cursor++;
      const id = unique[at];
      let cached = metadataCache.get(id);
      if (!cached || cached.expires < Date.now()) {
        if (metadataCache.size >= 500) metadataCache.delete(metadataCache.keys().next().value);
        const promise = (async () => {
          try {
            const endpoint = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(`https://api.soundcloud.com/tracks/${id}`)}`;
            const response = await fetcher(endpoint, { redirect: 'error', signal: AbortSignal.timeout(6000) });
            if (!response.ok) return null;
            const data = await response.json();
            if (typeof data.title !== 'string') return null;
            const artist = typeof data.author_name === 'string' ? data.author_name : 'SoundCloud';
            const suffix = ` by ${artist}`;
            const title = data.title.endsWith(suffix) ? data.title.slice(0, -suffix.length) : data.title;
            return { id, title: title.slice(0, 240), artist: artist.slice(0, 120) };
          } catch { return null; }
        })();
        cached = { expires: Date.now() + 15 * 60 * 1000, promise };
        metadataCache.set(id, cached);
      }
      results[at] = await cached.promise;
      if (!results[at] && metadataCache.get(id) === cached) metadataCache.delete(id);
    }
  }));
  return results.filter(Boolean);
}

// Follow only the provider's own shortener. Redirect targets are checked before
// requesting another URL; final provider pages and arbitrary hosts are never fetched.
async function resolveMusicLink(input, fetcher = fetch) {
  try { return parseMusicSource(input); } catch (original) {
    let link;
    try { link = new URL(input); } catch { throw original; }
    const provider = shortHosts[link.hostname];
    if (!provider || link.protocol !== 'https:' || link.port || link.username || link.password || input.length > 2048) throw original;
    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await fetcher(link.href, { redirect: 'manual', signal: AbortSignal.timeout(5000) });
      await response.body?.cancel().catch(() => {});
      const location = response.headers.get('location');
      if (![301, 302, 303, 307, 308].includes(response.status) || !location) throw new Error('Open the short link in its service and copy the full track or playlist URL');
      const next = new URL(location, link);
      if (next.protocol !== 'https:' || next.username || next.password || next.port) throw new Error('The short link did not lead to a supported music source');
      if (next.hostname === link.hostname) { link = next; continue; }
      const source = parseMusicSource(next.href);
      if (source.provider !== provider) throw new Error('The short link did not lead to its music service');
      return source;
    }
    throw new Error('This music short link redirects too many times');
  }
}

function musicRouter() {
  const router = express.Router();
  router.post('/soundcloud/metadata', async (req, res) => {
    try { res.json(await soundcloudMetadata(req.body?.ids)); }
    catch (error) { res.status(400).json({ error: error.message }); }
  });
  router.post('/resolve', async (req, res) => {
    try { res.json(await resolveMusicLink(req.body?.url)); }
    catch (error) {
      const message = ['TimeoutError', 'TypeError'].includes(error.name) ? 'Could not resolve this music link. Try the full provider URL.' : error.message;
      res.status(400).json({ error: message });
    }
  });
  return router;
}
module.exports = { musicRouter, resolveMusicLink, soundcloudMetadata };
