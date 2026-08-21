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
    "VERSION",
    "CHANGELOG.md",
    "LICENSE",
    "evals/evals.json",
    "references/workflow.md",
    "references/adapter-contract.md",
    "references/category-catalog.yaml",
    "references/failure-handling.md",
    "scripts/render_selection_html.mjs",
    "tests/render_selection_html.test.mjs",
    "tests/test_skill_contract.py",
)
TEXT_SUFFIXES = {".md", ".json", ".mjs", ".py", ".txt", ".yaml", ".yml"}

EXPECTED_ANCHORS = {
    "个护家清": 14,
    "彩妆香水": 8,
    "休闲食品": 15,
    "居家日用": 13,
    "营养保健特医食品": 4,
}

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
    if not isinstance(evals, list) or len(evals) < 15:
        errors.append("evals/evals.json must contain at least 15 evals")
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


def validate_version(errors: list[str]) -> None:
    path = ROOT / "VERSION"
    if path.is_file() and path.read_text(encoding="utf-8").strip() != "0.2.1":
        errors.append("VERSION must be 0.2.1")


def validate_category_catalog(errors: list[str]) -> None:
    path = ROOT / "references/category-catalog.yaml"
    if not path.is_file():
        return
    try:
        catalog = json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        errors.append(f"category-catalog.yaml must be JSON-compatible YAML: {exc}")
        return

    anchors = catalog.get("anchors")
    if not isinstance(anchors, list):
        errors.append("category catalog anchors must be a list")
        return
    observed = {
        item.get("logical_name"): len(item.get("third_level_categories", []))
        for item in anchors
        if isinstance(item, dict)
    }
    if observed != EXPECTED_ANCHORS:
        errors.append(f"category catalog anchors mismatch: {observed!r}")
    for item in anchors:
        if not isinstance(item, dict):
            continue
        categories = item.get("third_level_categories")
        if not isinstance(categories, list) or not categories or categories[0] != "全部":
            errors.append(
                f"category {item.get('logical_name')!r} must begin with the aggregate 全部 node"
            )


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
    validate_version(errors)
    validate_category_catalog(errors)
    scan_sensitive_content(errors)

    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1

    print("validation passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
