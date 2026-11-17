# Online music sources

The room's **Discover music** section loads full SoundCloud playlists automatically.
New rooms start with Chillhop Essentials Fall. Pick Summer to load its current track list.
Search filters the loaded playlist, and each song button plays that song through SoundCloud.
This is a selection of complete playlists, not a global SoundCloud search engine.

**Or paste a music link** recognizes:

| Source | Accepted links | Playback |
| --- | --- | --- |
| SoundCloud | Public track or playlist; `on.soundcloud.com` share links | Provider widget, with the room's controls and track list |
| Spotify | Track, album, playlist, artist, episode or show; `spotify:` URI; `spotify.link` share links | Spotify embed. Preview/full playback depends on Spotify and the browser. Track selection and volume use Spotify's own player |
| YouTube | Video, playlist, `youtu.be`, Shorts and Music links | Visible YouTube player with room play/pause, position and volume |
| Audio file | Direct HTTPS `.mp3`, `.m4a`, `.ogg`, `.wav` or `.aac` URLs | HTML audio; the host must permit playback in the browser |

A normal website page is not a playable audio link. The app reports unsupported links.
Unavailable tracks and disabled embeds display errors.
Playback starts after a click, not when the room loads.

## Saving and compatibility

Rooms store `musicSource: { provider, url }` alongside the existing optional `cdCode`.
Choosing an online source clears the CD; choosing a CD clears the online source.
Saved rooms with no `musicSource` keep their previous CD behavior. The original CD maker
still uses the project's local track library; online playlists are played through their providers.
The existing report and slides in `docs/deliverables` describe the earlier local-CD implementation.

The online player remains mounted when the sidebar closes or Decorate mode opens.
On phones the open sidebar covers the online player. YouTube pauses while covered so video
is visible whenever it plays. Close the sidebar to use its native player.

## Link handling and API

`POST /api/music/resolve` takes `{ url }` and returns a canonical `{ provider, url }`.
Full provider links are recognized without any server request to those pages. Only the two
provider shorteners are fetched, using manual redirects, at most four hops and five seconds
per request. Every redirect target is checked before another request is made.
Final provider pages and arbitrary submitted URLs are never fetched by this endpoint.
Room writes validate provider/URL agreement and reject unsafe schemes, credentials and ports.

No provider API key is needed for these public embeds. The app uses SoundCloud's
`getSounds` widget method to read the selected playlist. SoundCloud sometimes initially returns
id-only placeholders; the app refreshes their metadata and resolves the selected track's title.
For remaining placeholders it asks SoundCloud's public oEmbed endpoint for their names and
artist credits. The API accepts only numeric SoundCloud track ids, fetches at most four
metadata records at a time and caches the result. No audio is copied into the database.
Adding global catalog search would require the appropriate provider API access.

## Sources and implementation references

- [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget.html)
- [SoundCloud oEmbed](https://developers.soundcloud.com/docs/oembed)
- [Spotify Embeds](https://developer.spotify.com/documentation/embeds)
- [Spotify iFrame API](https://developer.spotify.com/documentation/embeds/references/iframe-api)
- [Spotify playback troubleshooting](https://developer.spotify.com/documentation/embeds/tutorials/troubleshooting)
- [YouTube IFrame Player API](https://developers.google.com/youtube/iframe_api_reference)

The two Chillhop playlist links were checked with SoundCloud's official oEmbed endpoint.
Their content can change or become unavailable independently of Libsic Studio.
