# -*- coding: utf-8 -*-
"""用例入口：把 YAML 里每条用例参数化成独立 test，失败时能一眼定位到 id。"""
from __future__ import annotations

import pathlib

import yaml

import runner

DATA = pathlib.Path(__file__).parent / "data" / "cases.yaml"


def pytest_generate_tests(metafunc):
    if "case" in metafunc.fixturenames:
        cases = yaml.safe_load(DATA.read_text(encoding="utf-8"))["cases"]
        metafunc.parametrize("case", cases, ids=[c["id"] for c in cases])


def test_api_case(client, case):
    resp = runner.run_case(client, case)
    runner.assert_case(resp, case, client)
