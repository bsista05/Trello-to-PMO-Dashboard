import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.resolve(__dirname, "..", "trello-config.md");

function readTableCell(markdown, rowLabel) {
  const pattern = new RegExp(`\\*\\*${rowLabel}\\*\\* \\| ([^|\\n]+)`);
  const match = markdown.match(pattern);
  if (!match) return "";
  return match[1].replace(/`/g, "").trim();
}

export function loadConfig(configPath = CONFIG_PATH) {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config not found: ${configPath}\nCopy trello-config.example.md to trello-config.md and fill in your credentials.`);
  }

  const markdown = fs.readFileSync(configPath, "utf8");
  const apiKey = readTableCell(markdown, "API Key");
  const apiToken = readTableCell(markdown, "API Token");
  const boardId = readTableCell(markdown, "Board ID");
  const boardName = readTableCell(markdown, "Board name");
  const listIdsRaw = readTableCell(markdown, "List IDs to include");

  const placeholders = ["YOUR_TRELLO_API_KEY", "YOUR_TRELLO_API_TOKEN", "YOUR_BOARD_ID", ""];
  if (!apiKey || placeholders.includes(apiKey)) {
    throw new Error("Set your API Key in trello-config.md");
  }
  if (!apiToken || placeholders.includes(apiToken)) {
    throw new Error("Set your API Token in trello-config.md");
  }
  if (!boardId || placeholders.includes(boardId)) {
    throw new Error("Set your Board ID in trello-config.md");
  }

  const listIds = listIdsRaw
    ? listIdsRaw.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  return { apiKey, apiToken, boardId, boardName, listIds };
}
