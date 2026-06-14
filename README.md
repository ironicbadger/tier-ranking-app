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

```md
#My Ranking Board

tiers: [S, A, B, C, D, F]

## Facets

| Facet | Weight | Max |
| --- | ---: | ---: |
| Ease of use | 1.0 | 10 |
| Performance | 1.0 | 10 |

## Candidates

| Name | Image | Description | Tier | Ease of use | Performance |
| --- | --- | --- | --- | ---: | ---: |
| Atlas | ./assets/candidates/atlas.svg | Polished all-rounder. | Unranked | 8 | 9 |
| Beacon | ./assets/candidates/beacon.svg | Friendly and quick to learn. | Unranked | 9 | 7 |
```

## Docker

```yaml
services:
  tier-ranking-app:
    image: ghcr.io/ironicbadger/tier-ranking-app:latest
    ports:
      - "4173:80"
```

```sh
docker compose up -d
```

Image: `ghcr.io/ironicbadger/tier-ranking-app:latest`
