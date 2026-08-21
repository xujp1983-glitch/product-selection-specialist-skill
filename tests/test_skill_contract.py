#!/usr/bin/env python3
"""Contract tests for the public v0.2.0 skill package."""

from __future__ import annotations

import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class SkillContractTest(unittest.TestCase):
    def test_release_version_is_021(self) -> None:
        self.assertEqual((ROOT / "VERSION").read_text(encoding="utf-8").strip(), "0.2.1")

    def test_fixed_category_catalog_contains_all_five_business_anchors(self) -> None:
        catalog = json.loads(
            (ROOT / "references/category-catalog.yaml").read_text(encoding="utf-8")
        )
        anchors = {item["logical_name"]: item for item in catalog["anchors"]}

        self.assertEqual(
            set(anchors),
            {"个护家清", "彩妆香水", "休闲食品", "居家日用", "营养保健特医食品"},
        )
        self.assertEqual(anchors["个护家清"]["path"][:2], ["个护家清", "个人护理"])
        self.assertEqual(anchors["彩妆香水"]["path"][:2], ["美妆", "彩妆香水"])
        self.assertEqual(anchors["休闲食品"]["path"][:2], ["食品饮料", "休闲食品"])
        self.assertEqual(anchors["居家日用"]["path"][:2], ["智能家居", "居家日用"])
        self.assertEqual(
            anchors["营养保健特医食品"]["path"][:2],
            ["滋补保健", "营养保健/特医食品"],
        )
        self.assertEqual(
            {name: len(item["third_level_categories"]) for name, item in anchors.items()},
            {"个护家清": 14, "彩妆香水": 8, "休闲食品": 15, "居家日用": 13, "营养保健特医食品": 4},
        )
        for anchor in anchors.values():
            self.assertEqual(anchor["third_level_categories"][0], "全部")

    def test_user_list_defaults_are_explicit_and_storage_mode_is_unchanged(self) -> None:
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        required_phrases = (
            "近3个完整自然日",
            "最低可购买价",
            "¥1000",
            "category-catalog.yaml",
            "TOP200",
            "重复出现",
            "重点复刻",
            "高频爆款标的",
            "选品结果-YYYY-MM-DD-近3日.html",
            "图文直接成交榜",
            "飞书",
        )
        for phrase in required_phrases:
            self.assertIn(phrase, skill)

        self.assertIn("仅适用于用户清单模式", skill)
        self.assertIn("作品 ID", skill)
        self.assertIn("https://www.douyin.com/video/{作品ID}", skill)
        self.assertIn("不打开验证", skill)

    def test_product_detail_collection_has_a_zero_residency_tab_budget(self) -> None:
        skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
        failure = (ROOT / "references/failure-handling.md").read_text(
            encoding="utf-8"
        )

        for phrase in (
            "zero-residency",
            "Normally keep one temporary product-detail tab",
            "at most three temporary product-detail tabs",
            "return to the pre-click tab baseline",
        ):
            self.assertIn(phrase, skill)
        self.assertIn("pause collection", failure)
        self.assertIn("temporary product-detail tabs", failure)


if __name__ == "__main__":
    unittest.main()
