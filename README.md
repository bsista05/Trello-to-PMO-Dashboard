# Trello — Project Management Dashboard

A plain HTML/CSS/JS dashboard that pulls data from the Trello API and displays it as a project management view for **Sista**.

No build step required. Python 3 is used to fetch board data and serve the site locally.

---

## Features

| Tab | Description |
|-----|-------------|
| **Board** | Kanban view — one column per Trello list |
| **Detailed Activities** | Full task table with label filter |
| **Summary** | Donut chart (tasks per list) and due-date timeline |
| **Deliverables** | Cards with custom field **D** and latest comments |
| **Weekly Status Report** | Overdue, due last/next 2 weeks, and recently completed |

The header shows tasks per status (list) and at-a-glance stats (lists, cards, overdue, completed, labeled).

---

## Prerequisites

- **Python 3** — fetch script and local server ([python.org](https://www.python.org/downloads/))
- **Trello API access** — key and token from [trello.com/app-key](https://trello.com/app-key)
- **Git** (optional) — for cloning or publishing to GitHub

Node.js is optional (`npm run fetch` / `npm run serve`).

---

## Quick start

### 1. Clone or download this repo

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
cd YOUR-REPO-NAME
```

### 2. Configure Trello credentials

```bash
copy trello-config.example.md trello-config.md
```

Edit `trello-config.md` and set:

| Setting | Required | Notes |
|---------|----------|-------|
| **API Key** | Yes | From [Trello app key](https://trello.com/app-key) |
| **API Token** | Yes | Generate via the Token link on the same page |
| **Board ID** | Yes | From the board URL: `trello.com/b/<shortLink>/<board-id>` |
| **Board name** | No | Display label only |
| **List IDs to include** | No | Leave blank for all lists, or comma-separated IDs |

> `trello-config.md` is gitignored — never commit API keys or tokens.

### 3. Run the dashboard (Windows)

Double-click **`run-website.bat`**. It will:

1. Fetch the latest board data from Trello
2. Start a local server at **http://127.0.0.1:3456/**
3. Open the dashboard in your browser

### 4. Manual run (any OS)

```bash
python scripts/fetch-trello.py
python -m http.server 3456 --bind 127.0.0.1
```

Then open **http://127.0.0.1:3456/** in your browser.

---

## Refresh data

Trello data is saved to `data/board.json` (gitignored). Re-fetch whenever you want the latest board state:

```bash
python scripts/fetch-trello.py
```

Or run `run-website.bat` again (fetch + serve).

If fetch fails or no config exists, the dashboard falls back to **`data/board.sample.json`** for preview.

---

## Project structure

```
├── index.html                 # Main dashboard page
├── js/app.js                  # Rendering and tab logic
├── styling/
│   ├── tokens.css             # Colour tokens (brand, status, labels)
│   ├── styles.css             # Layout and components
│   └── brand-guidelines.md    # Visual / branding rules
├── scripts/
│   ├── fetch-trello.py        # Primary fetch script (Python)
│   ├── fetch-trello.js        # Alternative fetch script (Node)
│   └── parse-config.js        # Config parser for Node script
├── data/
│   ├── board.json             # Live fetched data (gitignored)
│   └── board.sample.json      # Sample data for preview
├── trello-config.example.md   # Config template (committed)
├── trello-config.md           # Your credentials (gitignored)
├── run-website.bat            # Fetch + serve + open browser (Windows)
├── DASHBOARD_INSTRUCTIONS.md  # Functional requirements
└── README.md                  # This file
```

---

## Publishing to GitHub

1. Create a new repository on GitHub (use **Private** for internal/work projects).
2. From the project folder:

```bash
git init
git add .
git status          # confirm trello-config.md and data/board.json are NOT listed
git commit -m "Initial commit: Trello Project Management Dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

3. Share the repo with teammates. They repeat **Quick start** steps 2–3 with their own `trello-config.md`.

### What is safe to commit

| File | Commit? |
|------|---------|
| `trello-config.example.md` | Yes |
| `data/board.sample.json` | Yes |
| Source code, styling, docs | Yes |
| `trello-config.md` | **No** — contains secrets |
| `data/board.json` | **No** — live board data |

---

## Customisation

- **Functional requirements** — edit `DASHBOARD_INSTRUCTIONS.md`
- **Branding and colours** — edit `styling/tokens.css` and `styling/brand-guidelines.md`
- **Deliverables tab** — requires a Trello custom field named **D** on your board

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank or error page | Check `trello-config.md` credentials; run `python scripts/fetch-trello.py` |
| `localhost` shows no data | Use **http://127.0.0.1:3456/** (not `localhost`) |
| Port already in use | `run-website.bat` kills stale processes on port 3456; or stop the old server manually |
| Deliverables tab empty | Add custom field **D** in Trello and re-fetch |
| Python not found | Install Python 3 and ensure it is on your PATH |

---

## License

Internal use — adjust as needed for your organisation.
