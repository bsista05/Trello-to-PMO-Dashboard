# Trello API Configuration (template)

Copy this file to `trello-config.md` and fill in your credentials. `trello-config.md` is gitignored.

## Credentials

| Setting | Value |
|---------|-------|
| **API Key** | `YOUR_TRELLO_API_KEY` |
| **API Token** | `YOUR_TRELLO_API_TOKEN` |

## Board / scope (optional)

| Setting | Value | Notes |
|---------|-------|-------|
| **Board ID** | `YOUR_BOARD_ID` | From the board URL: `trello.com/b/<shortLink>/<board-id>` |
| **Board name** | | Human-readable label (for your reference only) |
| **List IDs to include** | | Leave blank to fetch all lists; or comma-separated list IDs |

## How to get your API key and token

1. **API Key** — [Trello app key](https://trello.com/app-key)
2. **API Token** — Use the Token link on that page; authorize read access and copy the token.
3. Paste both values into the Credentials table in `trello-config.md`.
