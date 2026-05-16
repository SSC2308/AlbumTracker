# Album Mundial 2026 🏆

A progressive web app to track your FIFA World Cup 2026 Panini sticker collection in real time.

## Features

- **Camera scanner** — point your phone at sticker packets and Claude Vision AI reads the codes automatically
- **Real-time sync** — Firestore keeps your collection updated across all your devices instantly
- **Duplicate tracking** — logs extra stickers with per-code counts so you know what to trade
- **Trade helper** — paste a friend's wishlist and the app tells you which duplicates you can give them
- **Pending export** — copy your missing stickers as a formatted list to share
- **Album view** — browse all 48 teams and 980 stickers, filter by collected / pending, jump by group or team
- **PWA** — installable on Android and iOS, works offline after first load

## Tech Stack

- **Frontend** — Vanilla JS + Vite 5 (no framework)
- **Database** — Firebase Firestore (real-time `onSnapshot`)
- **AI** — Claude Haiku via Anthropic Vision API for sticker code recognition
- **Auth** — Custom username/password against a Firestore `cuentas` collection
- **PWA** — `vite-plugin-pwa` with auto-generated icons and service worker

## Live Demo

[album-tracker.vercel.app](https://your-url.vercel.app) — use `?demo` query param for a read-only preview without login
