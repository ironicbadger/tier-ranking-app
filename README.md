# Tier Ranking App

Static browser app for ranking candidates into tiers.

![Tier Ranking App screenshot](docs/screenshot.jpg)

## Run

```sh
python3 -m http.server 4173 --bind 127.0.0.1
```

Open `http://127.0.0.1:4173/`.

## Config

Edit `config.md` to change the title, tiers, review facets, and candidates.

## Docker

```sh
docker compose up --build
```

Image: `ghcr.io/ironicbadger/tier-ranking-app:latest`
