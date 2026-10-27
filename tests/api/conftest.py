# -*- coding: utf-8 -*-
"""pytest fixtures：起服务检查、客户端、样例数据、用例数据表。"""
from __future__ import annotations

import os
from pathlib import Path

import pytest
import yaml

from client import ApiClient

BASE_URL = os.environ.get("BASE_URL", "http://127.0.0.1:3100")
DATA_DIR = Path(__file__).parent / "data"

RESUME_TEXT = (
    "胡世杰\n求职意向：Python 开发\n专业技能\n"
    "熟悉 Python、Flask、TypeScript、React；了解 Docker。\n"
    "项目经历\n心屿 MindCare：使用 BGE 对 49 条语料向量化，建 FAISS 索引，双阈值 0.45 / 0.52 控制引用。\n"
    "教育背景\n长沙南方职业学院 · 人工智能技术应用"
)

JD = {
    "id": "jd-test-01",
    "title": "Python 开发工程师",
    "city": "长沙",
    "seniority": "应届/初级",
    "salary": "8-12K",
    "source": "curated-sample",
    "requirements": [
        {"skill": "python", "weight": 3, "must": True},
        {"skill": "flask", "weight": 3, "must": True},
        {"skill": "mysql", "weight": 2, "must": True},
        {"skill": "docker", "weight": 1, "must": False},
    ],
}


@pytest.fixture(scope="session")
def client() -> ApiClient:
    c = ApiClient(BASE_URL)
    if not c.health():
        pytest.exit(f"服务未启动：{BASE_URL}（先 npm run start 或 npm run dev）", returncode=2)
    return c


@pytest.fixture(scope="session")
def resume_text() -> str:
    return RESUME_TEXT


@pytest.fixture(scope="session")
def jd() -> dict:
    return JD


@pytest.fixture(scope="session")
def cases() -> list[dict]:
    with open(DATA_DIR / "cases.yaml", encoding="utf-8") as f:
        return yaml.safe_load(f)["cases"]


@pytest.fixture(scope="session")
def advise_body(resume_text: str, jd: dict) -> dict:
    return {"resumeText": resume_text, "jd": jd}
