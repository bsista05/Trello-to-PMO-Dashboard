# Trello → Website

## Goal

**Trello - Project Management Dashboard** — plain HTML/CSS site that displays Trello board data in a Kanban-style layout.

## Configuration

- **`trello-config.md`** — Your local API key, token, and board ID (gitignored). Start from `trello-config.example.md`.

## Flow

1. Fill in `trello-config.md`
2. Run `npm run fetch` → writes `data/board.json`
3. Run `npm run serve` → open the dashboard in the browser

Until you fetch live data, the site shows `data/board.sample.json` as a preview.

## Stack

- **Frontend**: `index.html`, `styling/`, `js/app.js`
- **Data sync**: `scripts/fetch-trello.js` (Node, no extra dependencies)

