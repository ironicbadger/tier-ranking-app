image := "tier-ranking-app"
port := "4173"

default:
    @just --list

build:
    docker build -t {{image}} .

run: build
    docker run --rm -p {{port}}:80 {{image}}

run-config: build
    docker run --rm -p {{port}}:80 -v "$PWD/config.yml:/usr/share/nginx/html/config.yml:ro" {{image}}

compose:
    docker compose up -d
