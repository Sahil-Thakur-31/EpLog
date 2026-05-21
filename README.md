# AniLog (MERN)

Clean anime watchlist tracker with auth, CSV import/export, and AniList discovery.

## Setup

### 1) Server

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Make sure MongoDB is running locally or update `MONGODB_URI` in `server/.env`.

### 2) Client

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Auth

- Register or login to access your private watchlist.
- JWT is stored in localStorage and sent as a Bearer token.

## CSV Import / Export

- Import and export buttons are in **My List** after the filters.
- Import expects columns like `Title`, `Watchlist`, `LastEpWatched`, `Rating`, `Memo`, `WatchedDate`.

## AniList Discovery

- Search AniList from **My List** and add shows with one click.
- New entries auto-fetch title, poster, and total episodes from AniList.

## API

- POST `/api/auth/register`
- POST `/api/auth/login`
- GET `/api/anilist/search?query=...`
- GET `/api/anime`
- POST `/api/anime`
- POST `/api/anime/from-anilist`
- PUT `/api/anime/:id`
- DELETE `/api/anime/:id`
- POST `/api/import`

## Notes

- Status values: `Watching`, `Completed`, `Planned`, `Dropped`.
- If `status` is omitted in a request, the server auto-assigns based on progress.
