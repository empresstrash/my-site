# Local bench — not the website

This folder is **local working only**. It is gitignored. It is not a Next.js route. Visitors will never see `/wip`.

Do not import from `wip/` into `app/`, `lib/`, or `public/`. If an experiment is ready to ship, move the finished files into those published trees first.

## Layout

| Folder | What goes here |
|---|---|
| `data/` | Scrapes, token dumps, CSV/txt inventories |
| `research/` | Notes, Word docs, one-off generators |
| `experiments/` | Half-built features that are not routed live |

## Published site (everything else)

- `app/` — pages and API routes people can visit
- `public/` — static files at `/…`
- `lib/` — code the live pages import
- `scripts/` — official generators for published data (run locally, output lands in `app/` or `public/`)
