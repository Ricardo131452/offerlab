# -*- coding: utf-8 -*-
"""限流测试放最后（文件名 zz_ 保证顺序）：会消耗 advise 的配额，不能影响前面用例。"""
from __future__ import annotations

import runner

RESUME = (
    "胡世杰\n专业技能\n熟悉 Python、Flask、MySQL。\n"
    "项目经历\n心屿 MindCare：49 条语料向量化，FAISS 索引。\n教育背景\n长沙南方职业学院"
)


def test_advise_rate_limit_returns_429(client):
    body = {"resumeText": RESUME, "jd": runner.build_jd({"kind": "advise"})}
    limited = None
    for _ in range(30):
        resp = client.post_json("/api/advise", body)
        if resp.status_code == 429:
            limited = resp
            break
    assert limited is not None, "连续 30 次请求没有触发 429，限流未生效"
    assert limited.headers.get("retry-after"), "429 缺少 retry-after 头"
    assert "频繁" in client.json_of(limited).get("error", "")
