# Dashboard Instructions

Functional requirements for the **Trello – Project Management Dashboard**.  
Edit this file to define what the dashboard should do and show.

Visual and branding details are in `[styling/brand-guidelines.md](styling/brand-guidelines.md)`.

---

## Project overview


| Item               | Value                          |
| ------------------ | ------------------------------ |
| **Dashboard name** | Project Management Dashboard   |
| **Organisation**   | PM                             |
| **Data source**    | Trello API → `data/board.json` |
| **Branding**       | Custom                         |


---

## Requirements

### Header

Must display:

- Organisation identity
- Dashboard title: “Project Management Dashboard”
- Dashboard subtitle: This dashboard fetches data from Trello and displays relevant columns
- Last data refresh timestamp
- **Tasks per status** — one chip per Trello list showing list name and card count (sorted by list position); swatch colours: leftmost list grey, rightmost green, all others yellow

### Statistics row

Must show at-a-glance metrics:


| Stat        | Description                       |
| ----------- | --------------------------------- |
| Lists       | Number of open lists on the board |
| Total cards | All cards across lists            |
| Overdue     | Cards past due date, not complete |
| Completed   | Cards marked due-complete         |
| Labeled     | Cards with at least one label     |


*Modify this table to add or remove required stats.*

### Kanban board

- One column per Trello list, sorted by list position.
- Each card must show: labels, title (linked to Trello), short description, card ID, due date status.
- Must support horizontal scroll on smaller screens.

### Footer

Must include:

- Data source (Trello)
- How to refresh data (`run-website.bat` or `python scripts/fetch-trello.py`)

---

## Customisation

- Use different colors for each label. (not the same ones for status reporting).

### Content & labels

- 

### Additional pages or views

- **Summary** tab — donut chart (tasks per list) and task timeline with status-coloured icons (green = completed, grey = not started, purple = under review, amber = in progress). Donut slices use the same status colours as the timeline; multiple in-progress lists get distinct amber/yellow gradients.
- **Summary → Task timeline** — dropdown filter to show tasks by Trello label; default **All labels** shows every task; selecting a label shows only tasks with that label.
- **Detailed Activities** tab — table columns:  
  Card ID | Task | Task description (wrapped text with tooltip) | Labels | Due Date | Status (from list) | Assignee  
  Grouped by Trello label; within each group sorted by status (list order on board)  
  Multi-select label filter dropdown; default shows all tasks; selecting one or more labels shows tasks with **any** of those labels
- **Deliverables** tab — cards with Trello custom field **D** populated; columns:  
  D# | Task name | Status (from list) | Comments (latest first, formatted as DD-MMM-YYYY: comment; hover for full thread)
- **Weekly Status Report** tab — two-part layout:  
  **Top row** (three timeline columns, left to right): Activities overdue | Activities due in the last 2 weeks | Activities due in the next 2 weeks  
  **Next row** (two table columns): Activities completed during the last 2 weeks | Activities due in the next 2 weeks (no assignee column)  
  Label filter buttons (multi-select); default shows all labels; selecting one or more filters all report sections to tasks with **any** of those labels
  Completion dates use Trello `dateCompleted`, list-move history, or `dateLastActivity`; re-fetch after config changes

### Access & deployment

- 

### Reporting rules

- 

---

## Technical notes


| Task                  | Command                          |
| --------------------- | -------------------------------- |
| Refresh Trello data   | `python scripts/fetch-trello.py` |
| Run website (Windows) | Double-click `run-website.bat`   |
| Trello API config     | `trello-config.md`               |


---

## Change log

| Date       | Change                                 | Author |
| ---------- | -------------------------------------- | ------ |
| 2026-08-06 | Initial dashboard requirements         | —      |
| 2026-08-06 | Styling moved to `styling/` folder     | —      |
| 2026-08-06 | Summary timeline label filter dropdown | —      |
| 2026-08-06 | Deliverables tab (custom field D)      | —      |
