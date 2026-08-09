import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "trello-config.md"
OUT_FILE = ROOT / "data" / "board.json"

CARD_FIELDS = "name,desc,due,dueComplete,dateCompleted,dateLastActivity,idList,labels,url,idShort,pos,idMembers"
LIST_FIELDS = "name,id,pos"


def read_cell(markdown: str, label: str) -> str:
    match = re.search(rf"\*\*{re.escape(label)}\*\* \| ([^|\n]+)", markdown)
    if not match:
        return ""
    return match.group(1).replace("`", "").strip()


def load_config() -> dict:
    if not CONFIG_PATH.exists():
        raise FileNotFoundError(
            f"Config not found: {CONFIG_PATH}\n"
            "Copy trello-config.example.md to trello-config.md and fill in your credentials."
        )

    markdown = CONFIG_PATH.read_text(encoding="utf-8")
    api_key = read_cell(markdown, "API Key")
    api_token = read_cell(markdown, "API Token")
    board_id = read_cell(markdown, "Board ID")
    board_name = read_cell(markdown, "Board name")
    list_ids_raw = read_cell(markdown, "List IDs to include")

    placeholders = {"YOUR_TRELLO_API_KEY", "YOUR_TRELLO_API_TOKEN", "YOUR_BOARD_ID", ""}
    if api_key in placeholders:
        raise ValueError("Set your API Key in trello-config.md")
    if api_token in placeholders:
        raise ValueError("Set your API Token in trello-config.md")
    if board_id in placeholders:
        raise ValueError("Set your Board ID in trello-config.md")

    list_ids = [item.strip() for item in list_ids_raw.split(",") if item.strip()] if list_ids_raw else []
    return {
        "api_key": api_key,
        "api_token": api_token,
        "board_id": board_id,
        "board_name": board_name,
        "list_ids": list_ids,
    }


def trello_get(path: str, params: dict) -> dict | list:
    query = urllib.parse.urlencode(params)
    url = f"https://api.trello.com/1{path}?{query}"
    request = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Trello API error {error.code}: {body}") from error


def extract_custom_field_value(item: dict) -> str:
    value = item.get("value") or {}
    if value.get("text") is not None:
        return str(value["text"]).strip()
    if value.get("number") is not None:
        return str(value["number"]).strip()
    if value.get("date") is not None:
        return str(value["date"]).strip()
    if value.get("checked") is not None:
        return "Yes" if str(value["checked"]).lower() == "true" else "No"
    return ""


def fetch_comment_actions(board_id: str, auth: dict) -> list:
    actions = []
    before = None
    while True:
        params = {**auth, "filter": "commentCard", "limit": 1000, "fields": "date,data,type"}
        if before:
            params["before"] = before
        batch = trello_get(f"/boards/{board_id}/actions", params)
        if not batch:
            break
        actions.extend(batch)
        if len(batch) < 1000:
            break
        before = batch[-1]["id"]
    return actions


def is_completed_list_name(name: str) -> bool:
    lowered = name.lower()
    return "completed" in lowered or "done" in lowered


def fetch_list_move_actions(board_id: str, auth: dict) -> list:
    actions = []
    before = None
    while True:
        params = {**auth, "filter": "updateCard:idList", "limit": 1000}
        if before:
            params["before"] = before
        batch = trello_get(f"/boards/{board_id}/actions", params)
        if not batch:
            break
        actions.extend(batch)
        if len(batch) < 1000:
            break
        before = batch[-1]["id"]
    return actions


def build_completed_at_by_card(actions: list, lists: list) -> dict:
    completed_list_ids = {item["id"] for item in lists if is_completed_list_name(item.get("name", ""))}
    completed_at: dict[str, str] = {}
    for action in actions:
        data = action.get("data") or {}
        list_after = data.get("listAfter") or {}
        card = data.get("card") or {}
        card_id = card.get("id")
        action_date = action.get("date")
        if not card_id or not action_date or list_after.get("id") not in completed_list_ids:
            continue
        existing = completed_at.get(card_id)
        if not existing or action_date > existing:
            completed_at[card_id] = action_date
    return completed_at


def build_comments_by_card(actions: list) -> dict:
    comments: dict[str, list[dict]] = {}
    for action in actions:
        if action.get("type") != "commentCard":
            continue
        data = action.get("data") or {}
        card_id = (data.get("card") or {}).get("id")
        text = (data.get("text") or "").strip()
        if not card_id or not text:
            continue
        comments.setdefault(card_id, []).append({"date": action.get("date"), "text": text})
    return comments


def main() -> None:
    config = load_config()
    auth = {"key": config["api_key"], "token": config["api_token"]}
    board_id = config["board_id"]

    board = trello_get(f"/boards/{board_id}", auth)
    lists = trello_get(f"/boards/{board_id}/lists", {**auth, "fields": LIST_FIELDS, "filter": "open"})
    cards = trello_get(
        f"/boards/{board_id}/cards",
        {**auth, "fields": CARD_FIELDS, "customFieldItems": "true"},
    )
    members = trello_get(f"/boards/{board_id}/members", {**auth, "fields": "fullName,username,id"})

    try:
        custom_fields = trello_get(f"/boards/{board_id}/customFields", auth)
    except RuntimeError:
        custom_fields = []

    comment_actions = fetch_comment_actions(board_id, auth)
    comments_by_card = build_comments_by_card(comment_actions)
    list_move_actions = fetch_list_move_actions(board_id, auth)
    completed_at_by_card = build_completed_at_by_card(list_move_actions, lists)

    if config["list_ids"]:
        allowed = set(config["list_ids"])
        lists = [item for item in lists if item["id"] in allowed]
        cards = [item for item in cards if item["idList"] in allowed]

    payload = {
        "name": config["board_name"] or board["name"],
        "id": board["id"],
        "url": board["url"],
        "fetchedAt": datetime.now(timezone.utc).isoformat(),
        "lists": lists,
        "cards": cards,
        "members": members,
        "customFields": custom_fields,
        "commentsByCardId": comments_by_card,
        "completedAtByCardId": completed_at_by_card,
    }

    OUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUT_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Saved {len(lists)} lists and {len(cards)} cards to data/board.json")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, RuntimeError) as error:
        print(error, file=sys.stderr)
        sys.exit(1)
