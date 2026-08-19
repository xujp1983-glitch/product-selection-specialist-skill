#!/usr/bin/env python3
"""Validate the public skill package without third-party dependencies."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_FILES = (
    "SKILL.md",
    "README.md",
    "LICENSE",
    "evals/evals.json",
    "references/workflow.md",
    "references/adapter-contract.md",
    "references/failure-handling.md",
)
TEXT_SUFFIXES = {".md", ".json", ".py", ".txt", ".yaml", ".yml"}

FORBIDDEN_PATTERNS = {
    "personal macOS path": re.compile("/" + r"Users/[^/\s]+/"),
    "personal Windows path": re.compile(r"[A-Za-z]:\\\\Users\\\\[^\\\s]+\\\\"),
    "IPv4 address": re.compile(
        r"(?<![\d.])(?:25[0-5]|2[0-4]\d|1?\d?\d)"
        r"(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}(?![\d.])"
    ),
    "credential assignment": re.compile(
        r"(?im)^\s*(?:password|passwd|cookie|token|app_?secret|secret_?key)\s*[:=]\s*\S+"
    ),
    "private browser profile": re.compile(r"(?i)(?:chrome|browser)[ _-]?profile\s*[:=]\s*[/~]"),
}


def iter_text_files() -> list[Path]:
    return [
        path
        for path in ROOT.rglob("*")
        if path.is_file()
        and ".git" not in path.parts
        and path.suffix.lower() in TEXT_SUFFIXES
    ]


def validate_required_files(errors: list[str]) -> None:
    for relative_path in REQUIRED_FILES:
        if not (ROOT / relative_path).is_file():
            errors.append(f"missing required file: {relative_path}")


def validate_skill(errors: list[str]) -> None:
    path = ROOT / "SKILL.md"
    if not path.is_file():
        return

    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    if len(lines) > 500:
        errors.append(f"SKILL.md exceeds 500 lines: {len(lines)}")

    match = re.match(r"\A---\n(.*?)\n---\n", text, flags=re.DOTALL)
    if not match:
        errors.append("SKILL.md has no valid YAML frontmatter block")
        return

    frontmatter = match.group(1)
    for key in ("name", "description"):
        if not re.search(rf"(?m)^{key}:\s*\S.+$", frontmatter):
            errors.append(f"SKILL.md frontmatter is missing {key}")

    if not re.search(r"(?m)^name:\s*product-selection-specialist\s*$", frontmatter):
        errors.append("SKILL.md name must be product-selection-specialist")


def validate_evals(errors: list[str]) -> None:
    path = ROOT / "evals/evals.json"
    if not path.is_file():
        return

    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"evals/evals.json is invalid JSON: {exc}")
        return

    if data.get("skill_name") != "product-selection-specialist":
        errors.append("evals skill_name does not match the skill")

    evals = data.get("evals")
    if not isinstance(evals, list) or len(evals) < 6:
        errors.append("evals/evals.json must contain at least 6 evals")
        return

    seen_ids: set[object] = set()
    for index, item in enumerate(evals, start=1):
        if not isinstance(item, dict):
            errors.append(f"eval {index} is not an object")
            continue
        eval_id = item.get("id")
        if eval_id in seen_ids:
            errors.append(f"duplicate eval id: {eval_id}")
        seen_ids.add(eval_id)
        for key in ("prompt", "expected_output"):
            if not isinstance(item.get(key), str) or not item[key].strip():
                errors.append(f"eval {eval_id!r} has no {key}")
        expectations = item.get("expectations")
        if not isinstance(expectations, list) or not expectations:
            errors.append(f"eval {eval_id!r} has no expectations")


def scan_sensitive_content(errors: list[str]) -> None:
    for path in iter_text_files():
        relative_path = path.relative_to(ROOT)
        text = path.read_text(encoding="utf-8")
        for label, pattern in FORBIDDEN_PATTERNS.items():
            if pattern.search(text):
                errors.append(f"{relative_path}: contains {label}")


def main() -> int:
    errors: list[str] = []
    validate_required_files(errors)
    validate_skill(errors)
    validate_evals(errors)
    scan_sensitive_content(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
