# Libsic Studio

An ambient music room for the web. Enter through a cinematic intro at `/`, pick one of five layered scenes (**Rainy Night Study**, **Golden Hour Loft**, **Clam Cove**, **Clover Hill Meadow**, **Aurora Observatory**), pull a disc from the wooden CD tower into the room's hologram player, click objects in the room to change the mood, then leave the page open while you study, work or relax. Rooms and CDs can be saved and shared with a short link.

Course project for **Web Application Development**.

## Live site

| What | Address |
| --- | --- |
| Website | https://libsic.id.vn |
| API | https://libsic-studio-api.onrender.com |
| API documentation | https://libsic-studio-api.onrender.com/api-docs |

The API runs on Render's free plan, so the first request after a quiet period can take about a minute while it wakes up.

## Features

- Five layered scenes with mouse-parallax depth, day/night lighting, and animated effects (rain, snow, fireflies, stars, dust, bubbles, plankton):
  - **Rainy Night Study** — 3D lo-fi desk above the city at night with a vinyl turntable, warm desk lamp, live clock and rain on the glass
  - **Golden Hour Loft** — sunlit loft desk with a sleeping cat, rubber plant, retro CD player and drifting dust motes
  - **Clam Cove** — coral-reef nook with a giant pearl-clam music player, swaying kelp, sun glimmer and rising bubbles
  - **Clover Hill Meadow** — hand-inked lily pond with a cabin dock, rocking boat, two old oaks, porch radio and fireflies
  - **Aurora Observatory** — 3D alpine cabin above snowy peaks with velvet curtains, a sleeping arctic fox, retro CD player and northern lights
- Cinematic `/` landing intro with drifting scene stills, room tabs, and one-click entry into a new or saved room
- Clickable objects in the room (window or lily pond, curtains, lamp/sconce/lantern/sun glimmer, and the music object)
- Full-screen room with a scene-skinned **room-kit paper sidebar** (polaroid room switcher, day/night and weather stamps, view-settings note for zoom in/out/fit, player placement and low-power mode, plus room naming and saving) that can be tucked away to a single disc button and fades when idle
- **Frameless hologram player** projected above the room's music object (tracking moved or resized players in Decorate mode) or pinned to the top or middle of the screen, with a live clock, track title, progress bar, transport controls and volume
- **Wooden CD tower and wide CD shelf**: bottom-right corner rack that lifts on hover or tap so cases slide out and send their printed disc flying to the player, plus an **All CDs** wide plank shelf and paper slip for pasting music links or CD codes
- Decorate mode: drag objects onto scene surfaces, resize with perspective, flip, remove and add more from the sidebar tray, with undo and reset (see below)
- Official studio CDs, custom CDs made from our 12 royalty-free tracks, and online playlists/links (SoundCloud, Spotify, YouTube, direct HTTPS audio)
- Save a room to get a share link; "My rooms" is remembered in the browser (no login)
- A secret edit key lets only the creator change or delete a room or CD

## Tech stack

| Part | Technology |
| --- | --- |
| Database | MongoDB (Atlas) |
| API server | Node.js, Express, Mongoose, Swagger UI |
| Front end | React (Vite), plain CSS |
| Tests | Jest and Supertest (API), Vitest and Testing Library (client) |
| Hosting | To be chosen (free tiers) |

## Repository layout

```
libsic-studio/
  api/      Express REST API (Node.js)
  client/   React front end
  docs/     Task allocation, security check report, art tools and project notes
```

## Course requirements

| Requirement | Status |
| --- | --- |
| Database (MySQL or MongoDB) | MongoDB models and seed scripts for 5 scenes (Rainy Night Study, Golden Hour Loft, Clam Cove, Clover Hill Meadow, Aurora Observatory), rooms, 12 tracks and 3 official CDs |
| RESTful API server (Node.js + Express) | Scenes, rooms, tracks, CDs and online music link resolution/metadata implemented |
| Front end (React) | Cinematic `/` intro, 5 layered rooms, room-kit paper sidebar, Decorate mode, saving/sharing, wooden CD tower & wide CD shelf, frameless hologram player and custom CD maker implemented |
| Source code for API and client on GitHub | This repository |
| Online API documentation | `/api-docs` on the API server (all endpoints) |
| Public API base URL | Not deployed yet |
| Live URL | Not deployed yet |
| PowerPoint presentation + short Word file | Vinh's 5-slide music section and 2-page report drafted in `docs/deliverables`; joint presentation pending |

## Decorating a room

Open a room and press **Decorate this room** in the paper sidebar. Choose objects from **Add objects** in the sidebar tray, then drag, resize, flip or remove any of them directly on the scene. Objects stay on their surface (such as a desk, cabin dock, lily pond or window glass), things lower on a surface look closer, and every object brings its own shadow and reflection. Fixed lights stay in place. **Save room** stores the arrangement, so the share link shows the same room.

How it works:

- A scene lists the objects it allows in `catalog` (name, picture, surface, size limits) and the places they may stand in `surfaces`. Scenes without a catalog (the older ones) have no Decorate button.
- A room stores its arrangement as `items`: `[{ id, key, x, y, scale, flip }]`, at most 30. `x` and `y` are percentages of the picture. A room with `items: null` shows the scene's default arrangement, so old saved rooms look the same as before.
- The API refuses (400, with the field named) an item that is not in the scene catalog, stands outside its surface, is too big or too small, repeats a one-only object or has a duplicate `id`. Details are in `/api-docs`.
- After pulling changes that touch scenes, run `npm run seed:scenes` in `api` again.

## Running the live site

Settings for the live server are environment variables on the host (see `api/.env.example`). None of them is required.

| Setting | Where | What it does |
| --- | --- | --- |
| `SENTRY_DSN` | API | Sends unexpected server errors (500) to Sentry. Off without it. |
| `VITE_SENTRY_DSN` | Client (build time) | Sends browser crashes to Sentry. Off without it. |
| `STATS_TOKEN` | API | Turns on the visit totals at `/stats` on the API address. Without it, `/api/stats` answers 404. |
| `WRITES_PER_MINUTE`, `CREATES_PER_10_MIN` | API | Per-visitor limits on saving (defaults 40 and 60). |
| `MAX_ROOMS`, `MAX_CDS` | API | Most rooms / custom CDs stored; above it new ones get 503. |

- **Spam protection:** every address has a general limit (300 requests per minute per visitor), saves and deletes have a stricter one, and rooms and CDs are checked field by field. Names are cleaned of control and invisible characters.
- **Visit counting:** the site tells the API which kind of page opened (never room codes). The API adds one to a daily total and counts each visitor once a day using a one-way scrambled mark that is deleted after 2 days. No cookies, no addresses stored, and "Do Not Track" is respected.
- **Error monitoring:** see the table. Reports carry no personal data.

## Running the project

Use [Node.js](https://nodejs.org) 26 (also used by CI), and MongoDB Atlas or a local MongoDB instance. The current client test dependencies need Node 22.22.2+, 24.15+ or 26+.

### API

```
cd api
npm install
copy .env.example .env        (Mac/Linux: cp .env.example .env)
```

Open `.env` and fill in `MONGODB_URI` with your Atlas connection string, including the database name (for example `.../libsic?...`). Never commit this file. If the connection fails with a `querySrv` error, add `DNS_SERVERS=8.8.8.8,1.1.1.1` to `.env`.

```
npm run seed:scenes           load the starter scenes into the database (safe to run again)
npm run seed:music            load 12 original tracks and 3 official CDs (keeps custom CDs)
npm start                     API at http://localhost:4000
npm test                      run the API tests
npm run try:rooms             walk through saving, changing and deleting a room (API must be running)
npm run try:music             exercise tracks, CDs and saving a room with a CD (API must be running)
```

The API documentation is at http://localhost:4000/api-docs while the API runs.

### Client

```
cd client
npm install
npm run dev                   website at http://localhost:5173 (the API must be running)
npm test                      run the client tests
```

The client talks to the API at `http://localhost:4000` by default. To use another address, copy `client/.env.example` to `client/.env` and change `VITE_API_URL`. The live site is built with `VITE_API_URL=https://libsic-studio-api.onrender.com`.

## Team

| Lane | What it covers | Owner |
| --- | --- | --- |
| Lane A: music side | Tracks and CDs, CD player | Vinh |
| Lane B: room side | Scenes and rooms, parallax scene, saving and sharing | Tony |

Both members work on the front end and the back end. See [`docs/TASKS.md`](docs/TASKS.md) for the full task allocation.

## Music and custom CDs

New rooms automatically load the full track list of a featured SoundCloud playlist. Point at or tap the **wooden CD tower** in the bottom-right corner (or press **All CDs** to open the wide CD shelf) to switch between official studio CDs, featured SoundCloud playlists (**Tracks** searches songs inside the active playlist), your custom CDs and remembered links. **+ Add your own music** opens a paper slip where you can paste a SoundCloud, Spotify, YouTube or direct HTTPS audio link, or a shared CD code. Provider embeds remain visible, and saving a room remembers the selected source or CD code; a deleted CD leaves the room usable with a message to choose another disc. Spotify may provide previews and uses its own controls for track selection/volume. See [`docs/ONLINE_MUSIC.md`](docs/ONLINE_MUSIC.md) for supported links and limitations.

Clicking the music object in the room toggles the **frameless hologram player** (which can float above the player object or stay pinned to the middle or top of the screen via **View settings** in the paper sidebar). Playback starts after pressing Play.

From the paper slip (**make a CD**) or `/music`, you can name a mix, choose tracks and arrange their order. `/cd/:code` plays and shares a CD, links to a room with it loaded, and lets its creator edit/delete it. The creator's key is kept in that browser; share links never contain it. Official CDs are read only. Keep a separate copy of your edit key before clearing browser data; an entered key can restore editing on the CD page.

Audio is served from `client/public/audio/music/`, so the API and client can be hosted separately. All twelve short pieces are synthesized for the project; the credits and generator are included. See [`docs/LANE_A_VINH.md`](docs/LANE_A_VINH.md) for review and deployment instructions, and [`docs/SECURITY_CHECK.md`](docs/SECURITY_CHECK.md) for the security audit report.

## Working agreements

- Each lane works on its own branches (for example `lane-a-music`, or `feature/decorate-mode` for the room side) and merges into `main` through a pull request that the other member reviews.
- Secrets (database password, connection string) live in a `.env` file that is never committed. Each part has a `.env.example` instead.
- Tracks and images are royalty-free or drawn by us, with the license noted.
- Every member must be able to explain all of the code, not only their own lane.
