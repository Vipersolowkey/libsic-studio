# Libsic Studio

An ambient music room for the web. Pick a layered scene (rainy night, cozy cabin, deep space), load a CD into a retro CD player, click objects in the room to change the mood, then leave the page open while you study, work or relax. Rooms and CDs can be saved and shared with a short link.

Course project for **Web Application Development**.

## Features

- Layered 2D scenes with mouse-parallax depth and animated effects (rain, snow, fireflies, stars)
- Clickable objects in the room (lamp, window, radio)
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
| Database (MySQL or MongoDB) | MongoDB, not set up yet |
| RESTful API server (Node.js + Express) | Not started |
| Front end (React) | Not started |
| Source code for API and client on GitHub | This repository |
| Online API documentation | Planned at `/api-docs` |
| Public API base URL | Not deployed yet |
| Live URL | Not deployed yet |
| PowerPoint presentation + short Word file | Not started |

## Running the project

Setup commands will be added here as each part is built (API in Task 2, client in Task 6; see `docs/TASKS.md`).

## Team

| Lane | What it covers | Owner |
| --- | --- | --- |
| Lane A: music side | Tracks and CDs, CD player | Teammate |
| Lane B: room side | Scenes and rooms, parallax scene, saving and sharing | Tony |

Both members work on the front end and the back end. See [`docs/TASKS.md`](docs/TASKS.md) for the full task allocation.

## Working agreements

- Each lane works on its own branch (`lane-a-music`, `lane-b-room`) and merges into `main` through a pull request that the other member reviews.
- Secrets (database password, connection string) live in a `.env` file that is never committed. Each part has a `.env.example` instead.
- Tracks and images are royalty-free or drawn by us, with the license noted.
- Every member must be able to explain all of the code, not only their own lane.
