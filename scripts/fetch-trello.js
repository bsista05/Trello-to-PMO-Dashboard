import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { loadConfig } from "./parse-config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.resolve(__dirname, "..", "data");
const OUT_FILE = path.join(OUT_DIR, "board.json");

const CARD_FIELDS = "name,desc,due,dueComplete,idList,labels,url,idShort,pos,idMembers";
const LIST_FIELDS = "name,id,pos";

async function trelloGet(pathname, params) {
  const url = new URL(`https://api.trello.com/1${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Trello API error ${response.status}: ${body}`);
  }
  return response.json();
}

async function fetchCommentActions(boardId, auth) {
  const actions = [];
  let before = null;
  while (true) {
    const params = { ...auth, filter: "commentCard", limit: 1000, fields: "date,data,type" };
    if (before) params.before = before;
    const batch = await trelloGet(`/boards/${boardId}/actions`, params);
    if (!batch.length) break;
    actions.push(...batch);
    if (batch.length < 1000) break;
    before = batch[batch.length - 1].id;
  }
  return actions;
}

function buildCommentsByCard(actions) {
  const comments = {};
  for (const action of actions) {
    if (action.type !== "commentCard") continue;
    const cardId = action.data?.card?.id;
    const text = action.data?.text?.trim();
    if (!cardId || !text) continue;
    if (!comments[cardId]) comments[cardId] = [];
    comments[cardId].push({ date: action.date ?? null, text });
  }
  return comments;
}

async function fetchBoard() {
  const config = loadConfig();
  const auth = { key: config.apiKey, token: config.apiToken };

  const [board, lists, cards, members] = await Promise.all([
    trelloGet(`/boards/${config.boardId}`, auth),
    trelloGet(`/boards/${config.boardId}/lists`, { ...auth, fields: LIST_FIELDS, filter: "open" }),
    trelloGet(`/boards/${config.boardId}/cards`, { ...auth, fields: CARD_FIELDS, customFieldItems: "true" }),
    trelloGet(`/boards/${config.boardId}/members`, { ...auth, fields: "fullName,username,id" }),
  ]);

  let customFields = [];
  try {
    customFields = await trelloGet(`/boards/${config.boardId}/customFields`, auth);
  } catch {
    customFields = [];
  }

  const commentActions = await fetchCommentActions(config.boardId, auth);
  const commentsByCardId = buildCommentsByCard(commentActions);

  let filteredLists = lists;
  let filteredCards = cards;

  if (config.listIds.length > 0) {
    const allowed = new Set(config.listIds);
    filteredLists = lists.filter((list) => allowed.has(list.id));
    filteredCards = cards.filter((card) => allowed.has(card.idList));
  }

  const payload = {
    name: config.boardName || board.name,
    id: board.id,
    url: board.url,
    fetchedAt: new Date().toISOString(),
    lists: filteredLists,
    cards: filteredCards,
    members,
    customFields,
    commentsByCardId,
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));

  console.log(`Saved ${filteredLists.length} lists and ${filteredCards.length} cards to data/board.json`);
}

fetchBoard().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
