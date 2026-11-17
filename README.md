# Libsic Studio

An ambient music room for the web. Pick a layered scene (Rainy Night Study, Golden Hour Loft, Clam Cove), load a CD into a retro CD player, click objects in the room to change the mood, then leave the page open while you study, work or relax. Rooms and CDs can be saved and shared with a short link.

Course project for **Web Application Development**.

## Features

- Layered 2D scenes with mouse-parallax depth and animated effects (rain, dust, bubbles, plankton and more)
- Clickable objects in the room (window, lamp or neon sign, music object)
- Full-screen room with floating controls that fade when idle, plus zoom in, zoom out and fit
- Decorate mode: drag objects anywhere on the desk or the window glass, resize, flip, remove and add more from a tray, with undo and reset (see below)
- Retro CD player: CD shelf, spinning disc, LCD track display, play, pause, next, previous, volume
- Official CDs and custom CDs made from our royalty-free tracks
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
  docs/     Task allocation and project notes
```

## Course requirements

| Requirement | Status |
| --- | --- |
| Database (MySQL or MongoDB) | MongoDB models and seed scripts for scenes, rooms, 12 tracks and 3 official CDs |
| RESTful API server (Node.js + Express) | Scenes, rooms, tracks and CDs implemented |
| Front end (React) | Room scene, Decorate mode, saving/sharing, CD shelf, player and custom CD maker implemented |
| Source code for API and client on GitHub | This repository |
| Online API documentation | `/api-docs` on the API server (all endpoints) |
| Public API base URL | Not deployed yet |
| Live URL | Not deployed yet |
| PowerPoint presentation + short Word file | Not started |

## Decorating a room

Open a room and press **Decorate**. The tray at the top adds objects, and you can then drag, resize, flip or remove any of them. Objects stay on their surface (the desk, or the glass of the window), things lower on the desk look closer, and every object brings its own shadow and reflection. The lamp and the fairy lights stay fixed. **Save room** stores the arrangement, so the share link shows the same room.

How it works:

- A scene lists the objects it allows in `catalog` (name, picture, surface, size limits) and the places they may stand in `surfaces`. Scenes without a catalog (the older ones) have no Decorate button.
- A room stores its arrangement as `items`: `[{ id, key, x, y, scale, flip }]`, at most 30. `x` and `y` are percentages of the picture. A room with `items: null` shows the scene's default arrangement, so old saved rooms look the same as before.
- The API refuses (400, with the field named) an item that is not in the scene catalog, stands outside its surface, is too big or too small, repeats a one-only object or has a duplicate `id`. Details are in `/api-docs`.
- After pulling changes that touch scenes, run `npm run seed:scenes` in `api` again.

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

The client talks to the API at `http://localhost:4000` by default. To use another address, copy `client/.env.example` to `client/.env` and change `VITE_API_URL`.

## Team

| Lane | What it covers | Owner |
| --- | --- | --- |
| Lane A: music side | Tracks and CDs, CD player | Vinh |
| Lane B: room side | Scenes and rooms, parallax scene, saving and sharing | Tony |

Both members work on the front end and the back end. See [`docs/TASKS.md`](docs/TASKS.md) for the full task allocation.

## Music and custom CDs

Open a room and use **CD shelf** to load an official CD or enter a shared CD code. Click the music object in the room to show the player. Playback starts after pressing Play. A saved room remembers its CD code; a deleted CD leaves the room usable with a message to choose another disc.

**Make a CD / My CDs** opens `/music`: name a mix, choose tracks and arrange their order. `/cd/:code` plays and shares a CD, links to a room with it loaded, and lets its creator edit/delete it. The creator's key is kept in that browser; share links never contain it. Official CDs are read only. Keep a separate copy of your edit key before clearing browser data; an entered key can restore editing on the CD page.

Audio is served from `client/public/audio/music/`, so the API and client can be hosted separately. All twelve short pieces are synthesized for the project; the credits and generator are included. See [`docs/LANE_A_VINH.md`](docs/LANE_A_VINH.md) for review and deployment instructions.

## Working agreements

- Each lane works on its own branches (for example `lane-a-music`, or `feature/decorate-mode` for the room side) and merges into `main` through a pull request that the other member reviews.
- Secrets (database password, connection string) live in a `.env` file that is never committed. Each part has a `.env.example` instead.
- Tracks and images are royalty-free or drawn by us, with the license noted.
- Every member must be able to explain all of the code, not only their own lane.
