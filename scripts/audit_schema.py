#!/usr/bin/env python3
"""Schema drift audit — migrations vs what the backend actually touches.

Four tables and seventeen columns once existed only in the Supabase dashboard,
so a database provisioned from supabase/migrations/ came up incomplete and
endpoints 500'd in ways prod never showed. This catches that class of drift
statically, with no database credentials, so it can run any time:

    python3 scripts/audit_schema.py

Exits non-zero when the backend references a table or column that no migration
defines. It only sees drift in that direction — columns prod has that the code
never touches are invisible here; for those, introspect the live database.

Parsing notes, each earned by a false positive:
  * migrations declare several columns per line ("tokens_in int, tokens_out int")
  * PostgREST selects embed related tables ("qty,items(id,name,category)")
  * insert payloads nest dicts ("payload": {"title": ...}) whose keys aren't columns
  * a .table() chain ends at .execute(), not at some fixed character count
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIGRATIONS = ROOT / "supabase" / "migrations"
API = ROOT / "api"

CONSTRAINT_WORDS = ("primary key", "unique", "check", "constraint", "foreign key")
NOT_COLUMNS = {"*", "count"}

# Writes that spread a Pydantic model — `insert({..., **body.model_dump()})` —
# name no columns a parser can see, which is exactly how the seven missing
# `trips` columns stayed hidden until a live insert failed. Map each such table
# to the request models whose fields land in it.
MODEL_TABLES = {
    "trips": ("TripCreate", "TripPatch"),
    "destinations": ("DestinationCreate",),
    "activities": ("ActivityCreate",),
}


def _split_top_level(body: str) -> list[str]:
    """Split on commas that aren't inside parentheses."""
    parts, depth, cur = [], 0, []
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(cur))
            cur = []
        else:
            cur.append(ch)
    parts.append("".join(cur))
    return parts


def _strip_comments(text: str) -> str:
    return "\n".join(line.split("--")[0] for line in text.splitlines())


def defined_schema() -> dict[str, set[str]]:
    """table -> columns, as declared across every migration file."""
    schema: dict[str, set[str]] = {}
    for path in sorted(MIGRATIONS.glob("*.sql")):
        sql = path.read_text()

        for table, body in re.findall(
            r"create table (?:if not exists )?public\.(\w+)\s*\((.*?)\n\);", sql, re.S
        ):
            cols = schema.setdefault(table, set())
            for part in _split_top_level(_strip_comments(body)):
                part = part.strip()
                if not part or part.lower().startswith(CONSTRAINT_WORDS):
                    continue
                m = re.match(r"([a-z_][a-z0-9_]*)\s", part)
                if m:
                    cols.add(m.group(1))

        for table, body in re.findall(r"alter table public\.(\w+)(.*?);", sql, re.S):
            for col in re.findall(r"add column (?:if not exists )?(\w+)", body):
                schema.setdefault(table, set()).add(col)
    return schema


def _payload_keys(text: str, start: int) -> set[str]:
    """Top-level keys of the dict literal beginning at `start`. Nested dicts
    (jsonb column values like payload/offset_rule) are deliberately skipped."""
    keys: set[str] = set()
    depth = 0
    i = start
    while i < len(text):
        ch = text[i]
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                break
        elif ch == '"' and depth == 1:
            m = re.match(r'"(\w+)"\s*:', text[i:])
            if m:
                keys.add(m.group(1))
                i += m.end() - 1
        i += 1
    return keys


def used_schema() -> dict[str, set[str]]:
    """table -> columns the backend selects, filters on, or writes."""
    used: dict[str, set[str]] = {}
    for path in sorted(API.rglob("*.py")):
        src = path.read_text()
        for m in re.finditer(r'\.table\("(\w+)"\)', src):
            table = m.group(1)
            cols = used.setdefault(table, set())
            # a chain ends at .execute(); fall back to the next .table( call
            end = src.find(".execute()", m.end())
            nxt = src.find('.table("', m.end())
            if end == -1 or (nxt != -1 and nxt < end):
                end = nxt if nxt != -1 else len(src)
            chunk = src[m.end(): end]

            for sel in re.findall(r'\.select\(\s*"([^"]*)"', chunk):
                # drop embedded resources: items(id,name) belongs to `items`
                flat = re.sub(r"\w+\([^)]*\)", "", sel)
                for c in flat.split(","):
                    c = c.strip()
                    if re.fullmatch(r"[a-z_][a-z0-9_]*", c):
                        cols.add(c)
            for c in re.findall(
                r'\.(?:eq|neq|gte|lte|gt|lt|in_|is_|like|ilike|order)\(\s*"(\w+)"', chunk
            ):
                cols.add(c)
            for w in re.finditer(r"\.(?:insert|upsert|update)\(\s*\{", chunk):
                cols |= _payload_keys(chunk, chunk.index("{", w.start()))
            for oc in re.findall(r'on_conflict="([^"]+)"', chunk):
                for c in oc.split(","):
                    cols.add(c.strip())

    for table, model_names in MODEL_TABLES.items():
        used.setdefault(table, set()).update(_model_fields(model_names))
    return used


def _model_fields(model_names: tuple[str, ...]) -> set[str]:
    """Field names declared on the named Pydantic request models."""
    fields: set[str] = set()
    for path in API.rglob("models.py"):
        src = path.read_text()
        for name in model_names:
            m = re.search(
                rf"^class {name}\(BaseModel\):(.*?)(?=^class |\Z)", src, re.S | re.M
            )
            if m:
                fields |= set(re.findall(r"^\s{4}([a-z_][a-z0-9_]*)\s*:", m.group(1), re.M))
    return fields


def main() -> int:
    defined, used = defined_schema(), used_schema()

    missing_tables = sorted(set(used) - set(defined))
    missing_cols: dict[str, list[str]] = {}
    for table in sorted(set(used) & set(defined)):
        gap = sorted(used[table] - defined[table] - NOT_COLUMNS)
        if gap:
            missing_cols[table] = gap

    print(f"tables defined in migrations : {len(defined)}")
    print(f"tables touched by the backend: {len(used)}")
    print()

    if missing_tables:
        print("TABLES USED BUT NOT DEFINED:")
        for t in missing_tables:
            print(f"    {t}")
        print()

    if missing_cols:
        print("COLUMNS USED BUT NOT DEFINED:")
        for table, cols in missing_cols.items():
            print(f"    {table}: {', '.join(cols)}")
        print()

    if missing_tables or missing_cols:
        n = len(missing_tables) + sum(len(c) for c in missing_cols.values())
        print(f"FAIL - {n} item(s) missing from supabase/migrations/.")
        print("A database provisioned from migrations alone would break on these.")
        return 1

    print("PASS - every table and column the backend touches is defined in migrations.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
