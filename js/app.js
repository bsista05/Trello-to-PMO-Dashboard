const LABEL_COUNT = 12;

function labelPalette() {
  const style = getComputedStyle(document.documentElement);
  return Array.from({ length: LABEL_COUNT }, (_, i) =>
    style.getPropertyValue(`--label-${i + 1}`).trim()
  ).filter(Boolean);
}

function buildLabelColorMap(board) {
  const seen = new Map();
  const palette = labelPalette();
  const cards = board.cards ?? [];

  for (const card of cards) {
    for (const label of card.labels ?? []) {
      const key = label.id ?? label.name;
      if (!key || seen.has(key)) continue;
      seen.set(key, palette[seen.size % palette.length] ?? "#64748b");
    }
  }

  return seen;
}

function getLabelColor(label, colorMap) {
  const key = label.id ?? label.name;
  return colorMap.get(key) ?? "#64748b";
}

function getUniqueLabels(board) {
  const map = new Map();
  for (const card of board.cards ?? []) {
    for (const label of card.labels ?? []) {
      const key = label.id ?? label.name;
      if (!key || !label.name?.trim()) continue;
      if (!map.has(key)) map.set(key, { key, name: label.name.trim() });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function cardMatchesLabelFilter(card, labelKey) {
  if (!labelKey || labelKey === "all") return true;
  return (card.labels ?? []).some((label) => (label.id ?? label.name) === labelKey);
}

function cardMatchesLabelsFilter(card, selectedKeys) {
  if (!selectedKeys?.size) return true;
  return (card.labels ?? []).some((label) => selectedKeys.has(label.id ?? label.name));
}

let currentBoard = null;
let timelineFilterSetup = false;
let activitiesFilterSetup = false;
let weeklyFilterSetup = false;
let activitiesLabelFilter = new Set();
let weeklyLabelFilter = new Set();

function chartColors() {
  const style = getComputedStyle(document.documentElement);
  return [1, 2, 3, 4, 5, 6].map((n) => style.getPropertyValue(`--chart-${n}`).trim()).filter(Boolean);
}

function statusColors() {
  const style = getComputedStyle(document.documentElement);
  return {
    completed: style.getPropertyValue("--status-success").trim() || "#16a34a",
    "not-started": style.getPropertyValue("--status-neutral").trim() || "#6b7280",
    review: style.getPropertyValue("--status-review").trim() || "#9333ea",
    "in-progress": style.getPropertyValue("--status-warning").trim() || "#d97706",
  };
}

const IN_PROGRESS_DONUT_GRADIENTS = [
  { from: "#d97706", to: "#fbbf24" },
  { from: "#f59e0b", to: "#fde047" },
  { from: "#ca8a04", to: "#f59e0b" },
  { from: "#b45309", to: "#eab308" },
];

function getDonutListColors(counts) {
  const colors = statusColors();
  let inProgressIndex = 0;

  return counts.map((item) => {
    const category = getStatusCategory(item.name);
    if (category === "in-progress") {
      const gradIndex = inProgressIndex % IN_PROGRESS_DONUT_GRADIENTS.length;
      inProgressIndex += 1;
      const gradient = IN_PROGRESS_DONUT_GRADIENTS[gradIndex];
      const gradId = `donut-grad-ip-${gradIndex}`;
      return {
        category,
        fill: `url(#${gradId})`,
        legendBackground: `linear-gradient(135deg, ${gradient.from}, ${gradient.to})`,
        gradient,
        gradId,
      };
    }

    const fill = colors[category] || colors["in-progress"];
    return { category, fill, legendBackground: fill };
  });
}

function buildDonutGradientDefs(listColors) {
  const defs = new Map();
  for (const style of listColors) {
    if (!style.gradient || !style.gradId || defs.has(style.gradId)) continue;
    defs.set(
      style.gradId,
      `<linearGradient id="${style.gradId}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${style.gradient.from}"/>
        <stop offset="100%" stop-color="${style.gradient.to}"/>
      </linearGradient>`
    );
  }
  if (!defs.size) return "";
  return `<defs>${[...defs.values()].join("")}</defs>`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function listMap(board) {
  return new Map((board.lists ?? []).map((list) => [list.id, list.name]));
}

function memberMap(board) {
  return new Map((board.members ?? []).map((member) => [member.id, member.fullName || member.username]));
}

function getListName(board, card) {
  return listMap(board).get(card.idList) ?? "Unknown";
}

function getAssignees(board, card) {
  const names = (card.idMembers ?? [])
    .map((id) => memberMap(board).get(id))
    .filter(Boolean);
  return names.length ? names.join(", ") : "Unassigned";
}

function getStatusCategory(listName) {
  const name = listName.toLowerCase();
  if (name.includes("completed") || name.includes("done")) return "completed";
  if (name.includes("not started")) return "not-started";
  if (name.includes("under review") || (name.includes("review") && !name.includes("in progress"))) return "review";
  return "in-progress";
}

function statusPillClass(category) {
  return `status-pill status-pill--${category}`;
}

function isTaskCompleted(board, card) {
  if (card.dueComplete) return true;
  return getStatusCategory(getListName(board, card)) === "completed";
}

function renderActivitiesDueDate(board, card) {
  if (!card.due) return "—";
  const dueText = formatDate(card.due);
  if (isTaskCompleted(board, card)) {
    return `<span class="data-table__due">${escapeHtml(dueText)}</span>`;
  }
  return `<span class="data-table__due data-table__due--incomplete">${escapeHtml(dueText)}</span>`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return startOfDay(d);
}

function parseDueDay(card) {
  if (!card.due) return null;
  return startOfDay(new Date(card.due));
}

function getReportWindow() {
  const today = startOfDay(new Date());
  return {
    today,
    twoWeeksAgo: addDays(today, -14),
    twoWeeksAhead: addDays(today, 14),
  };
}

function getCompletionDate(board, card) {
  if (!isTaskCompleted(board, card)) return null;
  if (card.dateCompleted) return startOfDay(new Date(card.dateCompleted));
  const movedAt = board.completedAtByCardId?.[card.id];
  if (movedAt) return startOfDay(new Date(movedAt));
  if (card.dateLastActivity) return startOfDay(new Date(card.dateLastActivity));
  return null;
}

function isOverdue(board, card) {
  if (isTaskCompleted(board, card)) return false;
  const due = parseDueDay(card);
  if (!due) return false;
  return due < getReportWindow().today;
}

function isDueInLastTwoWeeks(board, card) {
  const due = parseDueDay(card);
  if (!due) return false;
  const { today, twoWeeksAgo } = getReportWindow();
  return due >= twoWeeksAgo && due < today;
}

function isDueInNextTwoWeeks(board, card) {
  if (isTaskCompleted(board, card)) return false;
  const due = parseDueDay(card);
  if (!due) return false;
  const { today, twoWeeksAhead } = getReportWindow();
  return due >= today && due <= twoWeeksAhead;
}

function isCompletedInLastTwoWeeks(board, card) {
  const completedDate = getCompletionDate(board, card);
  if (!completedDate) return false;
  const { today, twoWeeksAgo } = getReportWindow();
  return completedDate >= twoWeeksAgo && completedDate <= today;
}

function renderWeeklyTaskLink(card) {
  return card.url
    ? `<a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.name)}</a>`
    : escapeHtml(card.name);
}

function buildWeeklyDueTable(board, cards) {
  if (!cards.length) {
    return `<p class="report-section__empty">No activities in this period.</p>`;
  }

  const rows = cards
    .map((card) => {
      const status = getListName(board, card);
      const category = getStatusCategory(status);
      return `
        <tr>
          <td class="data-table__id">#${escapeHtml(String(card.idShort ?? ""))}</td>
          <td>${renderWeeklyTaskLink(card)}</td>
          <td>${renderActivitiesDueDate(board, card)}</td>
          <td><span class="${statusPillClass(category)}">${escapeHtml(status)}</span></td>
        </tr>`;
    })
    .join("");

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Card ID</th>
            <th>Task</th>
            <th>Due date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildWeeklyCompletedTable(board, cards) {
  if (!cards.length) {
    return `<p class="report-section__empty">No activities completed in this period.</p>`;
  }

  const rows = cards
    .map((card) => {
      const status = getListName(board, card);
      const category = getStatusCategory(status);
      const completedDate = getCompletionDate(board, card);
      return `
        <tr>
          <td class="data-table__id">#${escapeHtml(String(card.idShort ?? ""))}</td>
          <td>${renderWeeklyTaskLink(card)}</td>
          <td>${escapeHtml(formatDate(completedDate?.toISOString()))}</td>
          <td><span class="${statusPillClass(category)}">${escapeHtml(status)}</span></td>
        </tr>`;
    })
    .join("");

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Card ID</th>
            <th>Task</th>
            <th>Completed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function buildWeeklyTimeline(board, cards) {
  if (!cards.length) {
    return `<p class="report-section__empty">No activities in this period.</p>`;
  }

  const items = cards
    .map((card) => {
      const status = getListName(board, card);
      const category = getStatusCategory(status);
      const dueDisplay = card.due ? renderActivitiesDueDate(board, card) : "—";
      return `
        <div class="timeline-item report-timeline-item">
          <span class="timeline-item__icon timeline-item__icon--${category}" aria-hidden="true"></span>
          <div>
            <p class="timeline-item__title">${renderWeeklyTaskLink(card)}</p>
            <p class="timeline-item__meta">${escapeHtml(status)} · #${escapeHtml(String(card.idShort ?? ""))}</p>
          </div>
          <span class="timeline-item__date">${dueDisplay}</span>
        </div>`;
    })
    .join("");

  return `<div class="timeline report-timeline">${items}</div>`;
}

function buildReportSection(title, content, modifier = "") {
  return `
    <section class="report-section ${modifier}">
      <h3 class="report-section__title">${escapeHtml(title)}</h3>
      ${content}
    </section>`;
}

function filterCardsByWeeklyLabels(cards) {
  if (!weeklyLabelFilter.size) return cards;
  return cards.filter((card) => cardMatchesLabelsFilter(card, weeklyLabelFilter));
}

function buildWeeklyLabelButtons(board) {
  const labels = getUniqueLabels(board);

  if (!labels.length) {
    return `<p class="weekly-label-filter__empty">No labels on this board.</p>`;
  }

  return labels
    .map((label) => {
      const active = weeklyLabelFilter.has(label.key);
      return `
        <button
          type="button"
          class="label-btn${active ? " label-btn--active" : ""}"
          data-label-key="${escapeHtml(label.key)}"
          aria-pressed="${active ? "true" : "false"}"
        >
          ${escapeHtml(label.name)}
        </button>`;
    })
    .join("");
}

function setupWeeklyLabelFilter() {
  if (weeklyFilterSetup) return;

  document.getElementById("panel-weekly")?.addEventListener("click", (event) => {
    const btn = event.target.closest(".label-btn");
    if (btn && currentBoard) {
      const key = btn.dataset.labelKey;
      if (weeklyLabelFilter.has(key)) weeklyLabelFilter.delete(key);
      else weeklyLabelFilter.add(key);
      renderWeeklyReport(currentBoard);
      return;
    }

    if (event.target.id === "weekly-label-clear" && currentBoard) {
      weeklyLabelFilter.clear();
      renderWeeklyReport(currentBoard);
    }
  });

  weeklyFilterSetup = true;
}

function renderWeeklyReport(board) {
  const reportEl = document.getElementById("weekly-report");
  if (!reportEl) return;

  const { twoWeeksAgo, twoWeeksAhead } = getReportWindow();
  const cards = filterCardsByWeeklyLabels(board.cards ?? []);

  const dueNextTwoWeeks = cards
    .filter((card) => isDueInNextTwoWeeks(board, card))
    .sort((a, b) => parseDueDay(a) - parseDueDay(b));
  const dueLastTwoWeeks = cards
    .filter((card) => isDueInLastTwoWeeks(board, card))
    .sort((a, b) => parseDueDay(a) - parseDueDay(b));
  const overdueAll = cards
    .filter((card) => isOverdue(board, card))
    .sort((a, b) => parseDueDay(a) - parseDueDay(b));
  const completedRecent = cards
    .filter((card) => isCompletedInLastTwoWeeks(board, card))
    .sort((a, b) => getCompletionDate(board, b) - getCompletionDate(board, a));

  reportEl.innerHTML = `
    <div class="weekly-report">
      <header class="weekly-report__header">
        <h2 class="weekly-report__title">Weekly Status Report</h2>
        <p class="weekly-report__period">Reporting window: ${escapeHtml(formatDate(twoWeeksAgo.toISOString()))} – ${escapeHtml(formatDate(twoWeeksAhead.toISOString()))}</p>
      </header>

      <div class="weekly-label-filter">
        <span class="weekly-label-filter__label">Filter by label</span>
        <div class="weekly-label-filter__buttons" id="weekly-label-buttons">
          ${buildWeeklyLabelButtons(board)}
        </div>
        <button type="button" class="label-filter__clear" id="weekly-label-clear"${weeklyLabelFilter.size ? "" : " hidden"}>Clear</button>
      </div>

      <div class="weekly-report__timeline-row">
        ${buildReportSection("Activities overdue", buildWeeklyTimeline(board, overdueAll), "report-section--overdue")}
        ${buildReportSection("Activities due in the last 2 weeks", buildWeeklyTimeline(board, dueLastTwoWeeks), "report-section--due-recent")}
        ${buildReportSection("Activities due in the next 2 weeks", buildWeeklyTimeline(board, dueNextTwoWeeks), "report-section--upcoming")}
      </div>

      <div class="weekly-report__grid">
        ${buildReportSection("Activities completed during the last 2 weeks", buildWeeklyCompletedTable(board, completedRecent), "report-section--completed")}
        ${buildReportSection("Activities due in the next 2 weeks", buildWeeklyDueTable(board, dueNextTwoWeeks), "report-section--upcoming")}
      </div>
    </div>`;

  setupWeeklyLabelFilter();
}

function dueStatus(card) {
  if (!card.due) return { className: "due--none", text: "No due date" };
  const due = new Date(card.due);
  const now = new Date();
  if (card.dueComplete) return { className: "due--complete", text: `Done · ${formatDate(card.due)}` };
  if (due < now) return { className: "due--overdue", text: `Overdue · ${formatDate(card.due)}` };
  const days = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
  if (days <= 7) return { className: "due--upcoming", text: `Due ${formatDate(card.due)}` };
  return { className: "due--none", text: `Due ${formatDate(card.due)}` };
}

function getListCounts(board) {
  const countsByList = new Map();
  const sortedLists = (board.lists ?? []).slice().sort((a, b) => a.pos - b.pos);

  for (const list of sortedLists) {
    countsByList.set(list.id, { name: list.name, count: 0 });
  }
  for (const card of board.cards ?? []) {
    if (countsByList.has(card.idList)) {
      countsByList.get(card.idList).count += 1;
    }
  }

  return [...countsByList.values()];
}

function headerStatusSwatchClass(index, total) {
  if (index === 0) return "header-status__swatch--start";
  if (index === total - 1) return "header-status__swatch--end";
  return "header-status__swatch--middle";
}

function renderHeaderStatusSummary(board) {
  const summaryEl = document.getElementById("header-status-summary");
  if (!summaryEl) return;

  const counts = getListCounts(board);

  summaryEl.innerHTML = counts
    .map((item, index) => {
      const swatchClass = headerStatusSwatchClass(index, counts.length);
      return `
        <div class="header-status" title="${escapeHtml(item.name)}">
          <span class="header-status__swatch ${swatchClass}" aria-hidden="true"></span>
          <span class="header-status__name">${escapeHtml(item.name)}</span>
          <span class="header-status__count">${item.count}</span>
        </div>`;
    })
    .join("");
}

function renderStats(board) {
  const statsEl = document.getElementById("stats");
  const cards = board.cards ?? [];
  const lists = board.lists ?? [];
  const overdue = cards.filter((c) => c.due && !c.dueComplete && new Date(c.due) < new Date()).length;
  const completed = cards.filter((c) => c.dueComplete).length;
  const withLabels = cards.filter((c) => (c.labels ?? []).length > 0).length;

  const items = [
    { value: lists.length, label: "Lists", className: "stat-card--accent" },
    { value: cards.length, label: "Total cards", className: "" },
    { value: overdue, label: "Overdue", className: overdue ? "stat-card--danger" : "" },
    { value: completed, label: "Completed (due)", className: "stat-card--success" },
    { value: withLabels, label: "Labeled cards", className: "" },
  ];

  statsEl.innerHTML = items
    .map(
      (item) => `
      <article class="stat-card ${item.className}">
        <p class="stat-card__value">${item.value}</p>
        <p class="stat-card__label">${escapeHtml(item.label)}</p>
      </article>`
    )
    .join("");
}

function renderLabelChips(labels, labelColorMap) {
  if (!labels?.length) return "";
  return labels
    .map((label) => {
      const color = getLabelColor(label, labelColorMap);
      const name = label.name?.trim() || "Label";
      return `<span class="label" style="background:${color}" title="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
    })
    .join("");
}

function renderCard(card, labelColorMap) {
  const due = dueStatus(card);
  const chips = renderLabelChips(card.labels, labelColorMap);

  const desc = card.desc?.trim();
  const link = card.url
    ? `<a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.name)}</a>`
    : escapeHtml(card.name);

  return `
    <article class="card">
      ${chips ? `<div class="card__labels">${chips}</div>` : ""}
      <h3 class="card__title">${link}</h3>
      ${desc ? `<p class="card__desc">${escapeHtml(desc)}</p>` : ""}
      <div class="card__footer">
        <span class="card__id">#${escapeHtml(String(card.idShort ?? ""))}</span>
        <span class="due ${due.className}">${escapeHtml(due.text)}</span>
      </div>
    </article>`;
}

function renderBoard(board) {
  const boardEl = document.getElementById("board");
  const cardsByList = new Map();
  const labelColorMap = buildLabelColorMap(board);

  for (const card of board.cards ?? []) {
    if (!cardsByList.has(card.idList)) cardsByList.set(card.idList, []);
    cardsByList.get(card.idList).push(card);
  }

  const columns = (board.lists ?? [])
    .sort((a, b) => a.pos - b.pos)
    .map((list, index) => {
      const cards = (cardsByList.get(list.id) ?? []).sort((a, b) => a.pos - b.pos);
      const palette = chartColors();
      const columnColor = palette[index % palette.length] || "#334155";
      return `
        <section class="column" style="--column-color: ${columnColor}" aria-label="${escapeHtml(list.name)}">
          <header class="column__header">
            <h2 class="column__title">${escapeHtml(list.name)}</h2>
            <span class="column__count">${cards.length}</span>
          </header>
          <div class="column__cards">
            ${cards.length ? cards.map((c) => renderCard(c, labelColorMap)).join("") : `<p class="card__desc">No cards in this list.</p>`}
          </div>
        </section>`;
    })
    .join("");

  boardEl.innerHTML = `<div class="board__columns">${columns}</div>`;
}

function getActivitiesFilterSummary(board) {
  if (!activitiesLabelFilter.size) return "All labels";
  const labels = getUniqueLabels(board);
  const names = labels
    .filter((label) => activitiesLabelFilter.has(label.key))
    .map((label) => label.name);
  if (names.length === 1) return names[0];
  if (names.length <= 2) return names.join(", ");
  return `${names.length} labels selected`;
}

function buildActivitiesLabelFilterOptions(board) {
  const labels = getUniqueLabels(board);
  const labelColorMap = buildLabelColorMap(board);

  if (!labels.length) {
    return `<p class="label-filter__empty">No labels on this board.</p>`;
  }

  return labels
    .map((label) => {
      const checked = activitiesLabelFilter.has(label.key) ? " checked" : "";
      const color = labelColorMap.get(label.key) ?? "#64748b";
      return `
        <label class="label-filter__option">
          <input type="checkbox" value="${escapeHtml(label.key)}"${checked}>
          <span class="label-filter__swatch" style="background:${color}" aria-hidden="true"></span>
          <span class="label-filter__name">${escapeHtml(label.name)}</span>
        </label>`;
    })
    .join("");
}

function getListPosition(board, card) {
  const list = (board.lists ?? []).find((item) => item.id === card.idList);
  return list?.pos ?? Number.MAX_SAFE_INTEGER;
}

function compareActivitiesByStatus(board, a, b) {
  const posDiff = getListPosition(board, a) - getListPosition(board, b);
  if (posDiff !== 0) return posDiff;
  return (a.idShort ?? 0) - (b.idShort ?? 0);
}

function buildActivitiesGroups(board, cards) {
  const allLabels = getUniqueLabels(board);
  const labelColorMap = buildLabelColorMap(board);
  const visibleLabels = activitiesLabelFilter.size
    ? allLabels.filter((label) => activitiesLabelFilter.has(label.key))
    : allLabels;
  const groups = [];

  for (const label of visibleLabels) {
    const groupCards = cards
      .filter((card) => (card.labels ?? []).some((item) => (item.id ?? item.name) === label.key))
      .sort((a, b) => compareActivitiesByStatus(board, a, b));

    if (groupCards.length) {
      groups.push({
        label,
        cards: groupCards,
        color: labelColorMap.get(label.key) ?? "#64748b",
      });
    }
  }

  if (!activitiesLabelFilter.size) {
    const unlabeledCards = cards
      .filter((card) => !(card.labels ?? []).some((item) => item.name?.trim()))
      .sort((a, b) => compareActivitiesByStatus(board, a, b));

    if (unlabeledCards.length) {
      groups.push({
        label: { key: "__unlabeled", name: "Unlabeled" },
        cards: unlabeledCards,
        color: null,
      });
    }
  }

  return groups;
}

function renderActivityRow(board, card, labelColorMap) {
  const status = getListName(board, card);
  const category = getStatusCategory(status);
  const desc = card.desc?.trim() || "—";
  const chips = renderLabelChips(card.labels, labelColorMap);
  const labelsCell = chips ? `<div class="card__labels">${chips}</div>` : "—";
  const title = card.url
    ? `<a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.name)}</a>`
    : escapeHtml(card.name);

  return `
    <tr>
      <td class="data-table__id">#${escapeHtml(String(card.idShort ?? ""))}</td>
      <td>${title}</td>
      <td><span class="data-table__desc" title="${escapeHtml(desc)}">${escapeHtml(desc)}</span></td>
      <td class="data-table__labels">${labelsCell}</td>
      <td>${renderActivitiesDueDate(board, card)}</td>
      <td><span class="${statusPillClass(category)}">${escapeHtml(status)}</span></td>
      <td>${escapeHtml(getAssignees(board, card))}</td>
    </tr>`;
}

function renderActivitiesTableHead() {
  return `
    <thead>
      <tr>
        <th>Card ID</th>
        <th>Task</th>
        <th>Task description</th>
        <th>Labels</th>
        <th>Due date</th>
        <th>Status</th>
        <th>Assignee</th>
      </tr>
    </thead>`;
}

function renderActivitiesRows(board) {
  const containerEl = document.getElementById("activities-table-content");
  if (!containerEl) return;

  const labelColorMap = buildLabelColorMap(board);
  const filteredCards = (board.cards ?? []).filter((card) =>
    cardMatchesLabelsFilter(card, activitiesLabelFilter)
  );
  const groups = buildActivitiesGroups(board, filteredCards);

  if (!groups.length) {
    const emptyMessage = activitiesLabelFilter.size
      ? "No tasks match the selected labels."
      : "No cards found.";
    containerEl.innerHTML = `<p class="panel-message">${emptyMessage}</p>`;
    return;
  }

  containerEl.innerHTML = groups
    .map((group) => {
      const rows = group.cards.map((card) => renderActivityRow(board, card, labelColorMap)).join("");
      const header = group.color
        ? `<span class="label activities-group__label" style="background:${group.color}">${escapeHtml(group.label.name)}</span>`
        : `<span class="activities-group__title">${escapeHtml(group.label.name)}</span>`;

      return `
        <section class="activities-group">
          <header class="activities-group__header">
            ${header}
            <span class="activities-group__count">${group.cards.length}</span>
          </header>
          <div class="table-wrap">
            <table class="data-table">
              ${renderActivitiesTableHead()}
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>`;
    })
    .join("");
}

function updateActivitiesFilterUI(board) {
  const summary = document.querySelector("#activities-label-filter summary");
  const clearBtn = document.getElementById("activities-label-clear");
  if (summary) summary.textContent = getActivitiesFilterSummary(board);
  if (clearBtn) clearBtn.hidden = activitiesLabelFilter.size === 0;
}

function setupActivitiesFilter() {
  if (activitiesFilterSetup) return;

  document.getElementById("panel-activities")?.addEventListener("change", (event) => {
    if (!event.target.matches("#activities-label-options input[type=checkbox]") || !currentBoard) return;
    const key = event.target.value;
    if (event.target.checked) activitiesLabelFilter.add(key);
    else activitiesLabelFilter.delete(key);
    updateActivitiesFilterUI(currentBoard);
    renderActivitiesRows(currentBoard);
  });

  document.getElementById("panel-activities")?.addEventListener("click", (event) => {
    if (event.target.id !== "activities-label-clear" || !currentBoard) return;
    activitiesLabelFilter.clear();
    document.querySelectorAll("#activities-label-options input[type=checkbox]").forEach((input) => {
      input.checked = false;
    });
    updateActivitiesFilterUI(currentBoard);
    renderActivitiesRows(currentBoard);
  });

  activitiesFilterSetup = true;
}

function renderActivities(board) {
  const panelEl = document.getElementById("activities-table");
  const labels = getUniqueLabels(board);

  panelEl.innerHTML = `
    <div class="activities-toolbar">
      <span class="activities-filter__label">Filter by label</span>
      <details class="label-filter" id="activities-label-filter">
        <summary class="label-filter__trigger">${escapeHtml(getActivitiesFilterSummary(board))}</summary>
        <div class="label-filter__menu" id="activities-label-options">
          ${buildActivitiesLabelFilterOptions(board)}
        </div>
      </details>
      <button type="button" class="label-filter__clear" id="activities-label-clear"${activitiesLabelFilter.size ? "" : " hidden"}>Clear</button>
      ${labels.length ? `<span class="activities-filter__hint">Select one or more labels</span>` : ""}
    </div>
    <div class="activities-groups" id="activities-table-content"></div>`;

  setupActivitiesFilter();
  renderActivitiesRows(board);
}

function buildDonutChart(counts) {
  const total = counts.reduce((sum, item) => sum + item.count, 0) || 1;
  const listColors = getDonutListColors(counts);
  const gradientDefs = buildDonutGradientDefs(listColors);
  let cumulative = 0;
  const slices = counts.map((item, index) => {
    const fraction = item.count / total;
    const start = cumulative * 360;
    cumulative += fraction;
    const end = cumulative * 360;
    const largeArc = fraction > 0.5 ? 1 : 0;
    const startRad = ((start - 90) * Math.PI) / 180;
    const endRad = ((end - 90) * Math.PI) / 180;
    const x1 = 50 + 40 * Math.cos(startRad);
    const y1 = 50 + 40 * Math.sin(startRad);
    const x2 = 50 + 40 * Math.cos(endRad);
    const y2 = 50 + 40 * Math.sin(endRad);
    const fill = listColors[index].fill;
    if (fraction === 0) return "";
    if (fraction >= 0.999) {
      return `<circle cx="50" cy="50" r="40" fill="${fill}"/>`;
    }
    return `<path d="M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${fill}"/>`;
  }).join("");

  const legend = counts
    .map(
      (item, index) => `
      <li>
        <span class="donut-legend__swatch" style="background:${listColors[index].legendBackground}"></span>
        ${escapeHtml(item.name)} <strong>(${item.count})</strong>
      </li>`
    )
    .join("");

  return `
    <div class="donut-wrap">
      <svg class="donut-chart" viewBox="0 0 100 100" aria-hidden="true">
        ${gradientDefs}
        ${slices}
        <circle cx="50" cy="50" r="22" fill="white"/>
      </svg>
      <ul class="donut-legend">${legend}</ul>
    </div>`;
}

function renderTimeline(board, labelKey = "all") {
  const timelineEl = document.getElementById("timeline-list");
  if (!timelineEl) return;

  const timelineCards = (board.cards ?? [])
    .filter((card) => cardMatchesLabelFilter(card, labelKey))
    .slice()
    .sort((a, b) => {
      const da = a.due ? new Date(a.due).getTime() : Infinity;
      const db = b.due ? new Date(b.due).getTime() : Infinity;
      return da - db;
    });

  if (!timelineCards.length) {
    timelineEl.innerHTML = `<p class="timeline__empty">No tasks match the selected label.</p>`;
    return;
  }

  timelineEl.innerHTML = timelineCards
    .map((card) => {
      const listName = getListName(board, card);
      const category = getStatusCategory(listName);
      return `
        <div class="timeline-item">
          <span class="timeline-item__icon timeline-item__icon--${category}" aria-hidden="true"></span>
          <div>
            <p class="timeline-item__title">${escapeHtml(card.name)}</p>
            <p class="timeline-item__meta">${escapeHtml(listName)} · #${escapeHtml(String(card.idShort ?? ""))}</p>
          </div>
          <span class="timeline-item__date">${escapeHtml(formatDate(card.due))}</span>
        </div>`;
    })
    .join("");
}

function buildLabelFilterOptions(board, selectedKey = "all") {
  const labels = getUniqueLabels(board);
  const options = [`<option value="all"${selectedKey === "all" ? " selected" : ""}>All labels</option>`];
  for (const label of labels) {
    const selected = selectedKey === label.key ? " selected" : "";
    options.push(`<option value="${escapeHtml(label.key)}"${selected}>${escapeHtml(label.name)}</option>`);
  }
  return options.join("");
}

function setupTimelineFilter() {
  if (timelineFilterSetup) return;
  document.getElementById("summary-content")?.addEventListener("change", (event) => {
    if (event.target.id !== "timeline-label-filter" || !currentBoard) return;
    renderTimeline(currentBoard, event.target.value);
  });
  timelineFilterSetup = true;
}

function getDeliverableField(board) {
  return (board.customFields ?? []).find((field) => field.name === "D");
}

function getCustomFieldValue(card, fieldId) {
  const item = (card.customFieldItems ?? []).find((entry) => entry.idCustomField === fieldId);
  if (!item?.value) return "";
  const value = item.value;
  if (value.text != null) return String(value.text).trim();
  if (value.number != null) return String(value.number).trim();
  if (value.date != null) return String(value.date).trim();
  if (value.checked != null) return value.checked === "true" ? "Yes" : "No";
  return "";
}

function compareDeliverableId(a, b) {
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function getCardComments(board, cardId) {
  return board.commentsByCardId?.[cardId] ?? [];
}

function formatCommentDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = months[d.getUTCMonth()] ?? "";
  const year = d.getUTCFullYear();
  if (!month) return "";
  return `${day}-${month}-${year}`;
}

function normalizeComments(rawComments) {
  return (rawComments ?? [])
    .map((item) => {
      if (typeof item === "string") return { date: null, text: item };
      const text = (item.text ?? item.data?.text ?? "").trim();
      const date = item.date ?? item.dateLastEdited ?? null;
      return { date, text };
    })
    .filter((comment) => comment.text);
}

function formatCommentEntry(comment) {
  const prefix = comment.date ? `${formatCommentDate(comment.date)}: ` : "";
  return `${prefix}${comment.text}`;
}

function getSortedComments(board, cardId) {
  return normalizeComments(getCardComments(board, cardId)).sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });
}

function formatComments(board, cardId) {
  const sorted = getSortedComments(board, cardId);
  if (!sorted.length) return { display: "—", title: "" };
  const formatted = sorted.map(formatCommentEntry);
  return { display: formatted[0], title: formatted.join("\n\n") };
}

function renderDeliverableComments(board, cardId) {
  const sorted = getSortedComments(board, cardId);
  if (!sorted.length) return "—";

  const formatted = sorted.map(formatCommentEntry);
  const title = escapeHtml(formatted.join("\n\n"));
  const latest = sorted[0];
  const dateHtml = latest.date
    ? `<span class="comment-date">${escapeHtml(formatCommentDate(latest.date))}:</span> `
    : "";

  return `
    <div class="comment-preview" title="${title}">
      ${dateHtml}<span class="comment-text">${escapeHtml(latest.text)}</span>
    </div>`;
}

function renderDeliverables(board) {
  const tableEl = document.getElementById("deliverables-table");
  const deliverableField = getDeliverableField(board);

  if (!deliverableField) {
    tableEl.innerHTML = `
      <p class="panel-message">No custom field named <strong>D</strong> found on this board. Add the field in Trello and re-run <code>python scripts/fetch-trello.py</code>.</p>`;
    return;
  }

  const rows = (board.cards ?? [])
    .map((card) => ({
      card,
      dNumber: getCustomFieldValue(card, deliverableField.id),
    }))
    .filter((row) => row.dNumber)
    .sort((a, b) => compareDeliverableId(a.dNumber, b.dNumber));

  if (!rows.length) {
    tableEl.innerHTML = `
      <p class="panel-message">No deliverables found. Set the <strong>D</strong> custom field on Trello cards and refresh data.</p>`;
    return;
  }

  const body = rows
    .map(({ card, dNumber }) => {
      const status = getListName(board, card);
      const category = getStatusCategory(status);
      const commentsCell = renderDeliverableComments(board, card.id);
      const title = card.url
        ? `<a href="${escapeHtml(card.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(card.name)}</a>`
        : escapeHtml(card.name);

      return `
        <tr>
          <td class="data-table__id">${escapeHtml(dNumber)}</td>
          <td>${title}</td>
          <td><span class="${statusPillClass(category)}">${escapeHtml(status)}</span></td>
          <td><div class="data-table__comments">${commentsCell}</div></td>
        </tr>`;
    })
    .join("");

  tableEl.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>D#</th>
          <th>Task name</th>
          <th>Status</th>
          <th>Comments</th>
        </tr>
      </thead>
      <tbody>${body}</tbody>
    </table>`;
}

function renderSummary(board) {
  const summaryEl = document.getElementById("summary-content");
  const counts = getListCounts(board).slice().sort((a, b) => b.count - a.count);
  const labelOptions = buildLabelFilterOptions(board);

  summaryEl.innerHTML = `
    <div class="summary-card">
      <h2 class="summary-card__title">Tasks per list</h2>
      ${buildDonutChart(counts)}
    </div>
    <div class="summary-card">
      <h2 class="summary-card__title">Task timeline</h2>
      <div class="timeline-toolbar">
        <label class="timeline-filter__label" for="timeline-label-filter">Filter by label</label>
        <select id="timeline-label-filter" class="timeline-filter" aria-label="Filter timeline by label">
          ${labelOptions}
        </select>
      </div>
      <div class="timeline-legend">
        <span class="legend--completed"><i aria-hidden="true"></i> Completed</span>
        <span class="legend--not-started"><i aria-hidden="true"></i> Not started</span>
        <span class="legend--review"><i aria-hidden="true"></i> Under review</span>
        <span class="legend--in-progress"><i aria-hidden="true"></i> In Progress</span>
      </div>
      <div class="timeline" id="timeline-list"></div>
    </div>`;

  setupTimelineFilter();
  renderTimeline(board, "all");
}

function showError(title, message) {
  document.getElementById("board").innerHTML = `
    <div class="board__error">
      <h2>${escapeHtml(title)}</h2>
      <p>${message}</p>
    </div>`;
  document.getElementById("stats").innerHTML = "";
  document.getElementById("header-status-summary").innerHTML = "";
  document.getElementById("activities-table").innerHTML = "";
  document.getElementById("summary-content").innerHTML = "";
  document.getElementById("deliverables-table").innerHTML = "";
  document.getElementById("weekly-report").innerHTML = "";
}

function showEmptyState() {
  showError(
    "No board data yet",
    `<p>Fill in <code>trello-config.md</code>, then run <code>python scripts/fetch-trello.py</code>.</p>
     <p>Start the site with <code>run-website.bat</code>.</p>`
  );
}

function switchTab(tabId) {
  document.querySelectorAll(".tabs__btn").forEach((btn) => {
    const active = btn.dataset.tab === tabId;
    btn.classList.toggle("tabs__btn--active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });

  document.querySelectorAll(".panel").forEach((panel) => {
    const isBoard = panel.id === "panel-board";
    const isTarget =
      (tabId === "board" && isBoard) ||
      (tabId === "activities" && panel.id === "panel-activities") ||
      (tabId === "summary" && panel.id === "panel-summary") ||
      (tabId === "deliverables" && panel.id === "panel-deliverables") ||
      (tabId === "weekly" && panel.id === "panel-weekly");
    panel.hidden = !isTarget;
    panel.classList.toggle("panel--active", isTarget);
  });
}

function setupTabs() {
  document.getElementById("tabs").addEventListener("click", (event) => {
    const btn = event.target.closest(".tabs__btn");
    if (!btn) return;
    switchTab(btn.dataset.tab);
  });
}

function renderAll(board) {
  renderHeaderStatusSummary(board);
  renderStats(board);
  renderBoard(board);
  renderActivities(board);
  renderSummary(board);
  renderDeliverables(board);
  renderWeeklyReport(board);
}

async function init() {
  const updatedEl = document.getElementById("last-updated");
  setupTabs();

  const sources = ["data/board.json", "data/board.sample.json"];
  let board = null;
  let isSample = false;

  for (const source of sources) {
    try {
      const response = await fetch(source);
      if (!response.ok) continue;
      board = await response.json();
      isSample = source.includes("sample");
      break;
    } catch {
      /* try next source */
    }
  }

  document.getElementById("loading")?.remove();

  if (!board) {
    updatedEl.textContent = "";
    showEmptyState();
    return;
  }

  const updatedPrefix = isSample ? "Sample data · " : "";
  updatedEl.textContent = board.fetchedAt
    ? `${updatedPrefix}Last updated ${new Date(board.fetchedAt).toLocaleString()}`
    : isSample
      ? "Sample data — run fetch for your board"
      : "";

  renderAll(board);
  currentBoard = board;
}

init();
