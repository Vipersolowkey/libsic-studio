# Task allocation

Four weeks, from 20 Oct to 20 Nov 2026 (last days are buffer). Both members do front end and back end work. Tick a box when the task's "done when" is true and the other member has reviewed it.

**Lane A (music side):** teammate  
**Lane B (room side):** Tony  
**Together:** both members

## Week 1: the API (20 to 26 Oct)

- [ ] **Task 1: Accounts and repository** (together). MongoDB Atlas cluster, Node.js installed, `.env` ignored by git. Done when both members can connect to the database.
- [ ] **Task 2: Express server and health check** (together). `api/src/app.js`, `server.js`, `db.js`. Done when `GET /api/health` returns `{ status: "ok" }` and its test passes.
- [ ] **Task 3a: Track and CD models + seed data** (Lane A). 12 tracks and 3 official CDs in `api/src/seed/tracks.js`.
- [ ] **Task 3b: Scene and Room models + seed data** (Lane B). 3 scenes in `api/src/seed/scenes.js`.
- [ ] **Task 4: Scene art** (Lane B). 3 scenes with 4 transparent SVG layers each, plus positions of the clickable objects.
- [ ] **Task 5a: Tracks and CDs read endpoints** (Lane A). `GET /api/tracks`, `/api/tracks/:id`, `/api/cds`, `/api/cds/:code`.
- [ ] **Task 5b: Scenes read endpoints** (Lane B). `GET /api/scenes`, `/api/scenes/:id`.

## Week 2: the React app (27 Oct to 2 Nov)

- [ ] **Task 6: Client skeleton** (together). Vite + React, routes `/`, `/r/:code`, `/cd/:code`, and `client/src/api.js`.
- [ ] **Task 7: Layered scene, effects and clickable objects** (Lane B). Parallax hook, rain, snow, fireflies and stars effects, lamp, window and radio.
- [ ] **Task 8: Retro CD player** (Lane A). Audio hook, CD shelf, spinning disc, LCD display, controls.

## Week 3: save, share and document (3 to 9 Nov)

- [ ] **Task 9b: Rooms write endpoints + edit key** (Lane B). Share codes, hashed edit keys, `requireEditKey` middleware, `POST/PUT/DELETE /api/rooms`. Build this first so Lane A can reuse it.
- [ ] **Task 9a: CDs write endpoints** (Lane A). `POST/PUT/DELETE /api/cds` using the edit-key middleware, with validation for empty CDs and unknown tracks.
- [ ] **Task 10a: CD maker** (Lane A). Pick tracks and a name, create a custom CD.
- [ ] **Task 10b: Save bar, share link and My rooms** (Lane B). localStorage helper, "Save room", copy link, My rooms list, reopen last room.
- [ ] **Task 11: API documentation** (together). Lane A writes the tracks and CDs part of `openapi.yaml`, Lane B writes the scenes and rooms part and serves `/api-docs`.

## Week 4: deploy, polish and present (10 to 16 Nov, buffer to 20 Nov)

- [ ] **Task 12: Deploy** (together). Lane A deploys the API, Lane B deploys the client. Done when the live URL and the API base URL open from a phone.
- [ ] **Task 13: Polish** (each lane on its own half). Hide-controls mode, loading and error screens, touch support, README for each part.
- [ ] **Task 14: Slide deck and Word file** (together). Lane A: database, API and CD player slides. Lane B: scene, saving and sharing, deployment slides. Both: the Word file.

## Only if time allows

- Sleep timer that fades the music out
- Ambient sound mixing (rain volume separate from music)
- Most popular rooms page

## Situations to test (not in the original feature list)

| Situation | Expected behavior | Task |
| --- | --- | --- |
| Browser blocks autoplay | Music starts only after the visitor clicks play | 8 |
| Room or CD code does not exist | API returns 404, site shows a friendly page | 9, 13 |
| Empty CD, very long name or unknown track id | API returns 400 with a clear message | 9a |
| Browser data cleared or another device | My rooms is empty, the share link still works | 10b |
| Free API host is asleep | Site shows a "waking up the server" message | 12, 13 |
