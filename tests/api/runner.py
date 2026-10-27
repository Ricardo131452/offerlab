# -*- coding: utf-8 -*-
"""数据驱动用例执行器：一条 YAML = 一条用例，新增用例不改代码。"""
from __future__ import annotations

import copy

import pytest

BASE_JD = {
    "id": "jd-test-01",
    "title": "Python 开发工程师",
    "city": "长沙",
    "seniority": "应届/初级",
    "source": "curated-sample",
}
RESUME_TEXT = (
    "胡世杰\n求职意向：Python 开发\n专业技能\n"
    "熟悉 Python、Flask、TypeScript、React；了解 Docker。\n"
    "项目经历\n心屿 MindCare：使用 BGE 对 49 条语料向量化，建 FAISS 索引。\n"
    "教育背景\n长沙南方职业学院 · 人工智能技术应用"
)


def build_jd(case: dict) -> dict:
    jd = copy.deepcopy(BASE_JD)
    jd["requirements"] = [
        {"skill": "python", "weight": 3, "must": True},
        {"skill": "flask", "weight": 3, "must": True},
        {"skill": "mysql", "weight": 2, "must": True},
    ]
    if "override_jd" in case:
        jd.update(case["override_jd"])
    if "override_jd_count" in case:
        n = case["override_jd_count"]
        jd["requirements"] = [{"skill": f"skill{i}", "weight": 2, "must": False} for i in range(n)]
    return jd


def build_history(case: dict) -> list:
    if "history" in case:
        return case["history"]
    if "history_count" in case:
        n = case["history_count"]
        return [{"role": "user" if i % 2 == 0 else "assistant", "content": f"第 {i} 条"} for i in range(n)]
    return []


def run_case(client, case):
    kind = case["kind"]

    if kind == "resume":
        if case.get("no_file"):
            resp = client.post_form_without_file("/api/resume")
        else:
            spec = case["file"]
            if "size_mb" in spec:
                content = b"a" * int(spec["size_mb"] * 1024 * 1024)
            else:
                content = spec["text"].encode("utf-8")
            resp = client.post_file("/api/resume", spec["name"], content, spec.get("content_type", "application/octet-stream"))
        return resp

    if kind == "advise":
        if "raw_body" in case:
            return client.post_raw("/api/advise", case["raw_body"].encode("utf-8"))
        body = {"resumeText": RESUME_TEXT, "jd": build_jd(case)}
        body.update(case.get("override", {}))
        for key in case.get("remove", []):
            body.pop(key, None)
        return client.post_json("/api/advise", body)

    if kind == "interview":
        body = {"resumeText": RESUME_TEXT, "jd": build_jd(case), "history": build_history(case)}
        return client.post_json("/api/interview", body)

    raise AssertionError(f"未知用例类型: {kind}")


def assert_case(resp, case, client):
    assert resp.status_code == case["expect_status"], f"{case['id']}: " + client.describe(resp)
    for key, want in (case.get("expect_headers") or {}).items():
        assert resp.headers.get(key) == want, f"{case['id']}: header {key}={resp.headers.get(key)}"
    for key in case.get("expect_keys", []):
        assert key in client.json_of(resp), f"{case['id']}: 响应缺少 {key}"
