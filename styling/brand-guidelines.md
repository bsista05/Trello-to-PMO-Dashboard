[brand-guidelines.md](https://github.com/user-attachments/files/30869858/brand-guidelines.md)# Brand Guidelines — Project Management Dashboard

Visual system for the **Project Management Dashboard** (Sista).  
Functional requirements: [`../DASHBOARD_INSTRUCTIONS.md`](../DASHBOARD_INSTRUCTIONS.md).  
Implementation: `tokens.css` + `styles.css` in this folder.

---

## Design principles

1. **Clarity first** — data and status are easy to scan at a glance.
2. **Neutral chrome** — layout, navigation, and surfaces use slate/neutral tones only.
3. **Reserved status colours** — red, amber, green, blue (and purple/grey where defined) are used **only** for status, due dates, and reporting — never for branding or decorative UI.
4. **Light theme** — white surfaces on a soft grey canvas; high contrast text.

---

## Brand palette (UI only)

Use for headers, tabs, borders, backgrounds, charts (non-status), and typography.  
**Do not** use these for task status.

| Token | Hex | Usage |
|-------|-----|-------|
| `--brand-bg` | `#F8FAFC` | Page background |
| `--brand-surface` | `#FFFFFF` | Cards, header, panels |
| `--brand-surface-muted` | `#F1F5F9` | Column areas, table headers |
| `--brand-border` | `#E2E8F0` | Borders and dividers |
| `--brand-text` | `#0F172A` | Headings and body |
| `--brand-text-muted` | `#64748B` | Secondary text |
| `--brand-accent` | `#334155` | Accent bar, active tab, links hover |
| `--brand-accent-strong` | `#1E293B` | Strong emphasis in chrome |

### Chart palette (Kanban columns only)

Neutral slate sequence for **Kanban list columns** — not used for the Summary donut (which uses status colours):

| Token | Hex |
|-------|-----|
| `--chart-1` | `#1E293B` |
| `--chart-2` | `#334155` |
| `--chart-3` | `#475569` |
| `--chart-4` | `#64748B` |
| `--chart-5` | `#94A3B8` |
| `--chart-6` | `#CBD5E1` |

### Summary donut (status colours)

The **Tasks per list** donut uses the status palette (same mapping as timeline icons): green completed, grey not started, purple under review, amber in progress. Multiple in-progress lists each get a distinct amber/yellow gradient so slices remain distinguishable.

### Label palette (Trello card labels only)

Each Trello label gets a **unique colour** from this palette. These are separate from status colours — do not reuse status greens, ambers, reds, blues, purples, or greys for labels.

| Token | Hex |
|-------|-----|
| `--label-1` … `--label-12` | Teal, indigo, pink, cyan, rust, etc. (see `tokens.css`) |

Same label name always maps to the same colour within a board view.

---

## Status palette (reporting only)

Reserved for due dates, stat metrics, timeline icons, and status labels.  
**Never** use on tabs, header, logo, or general UI chrome.

| Token | Hex | Meaning |
|-------|-----|---------|
| `--status-success` | `#16A34A` | Completed / done |
| `--status-warning` | `#D97706` | In progress / other / upcoming due |
| `--status-danger` | `#DC2626` | Overdue / at risk |
| `--status-info` | `#2563EB` | Informational (optional) |
| `--status-neutral` | `#6B7280` | Not started |
| `--status-review` | `#9333EA` | Under review |

### Timeline / list status mapping

| List pattern | Status token |
|--------------|--------------|
| Contains “Completed” or “Done” | `--status-success` |
| Contains “Not Started” | `--status-neutral` |
| Contains “Under Review” or “Review” | `--status-review` |
| All other lists (e.g. In Progress) | `--status-warning` — label **In Progress** |

---

## Typography

| Role | Font | Weight |
|------|------|--------|
| Headings | Inter | 600–700 |
| Body | Inter | 400–500 |
| Labels / tables | Inter | 500–600 |

---

## Layout

- **Accent bar** — `--brand-accent-strong` (4px top strip).
- **Header** — organisation name, dashboard title, subtitle, last updated.
- **Tabs** — pill buttons; active state uses brand accent (not status colours).
- **Stats** — neutral cards; only Overdue (danger) and Completed (success) use status colours.
- **Kanban** — one colour per list column (chart palette); due-date badges use status colours.

---

## File structure

```
styling/
  brand-guidelines.md   ← this file
  tokens.css            ← CSS variables (brand + status + chart)
  styles.css            ← layout and components
```

When changing colours, update `tokens.css` and this document together.

---

## Change log

| Date | Change |
|------|--------|
| 2026-08-06 | PM dashboard brand system; styling moved to `styling/` |
