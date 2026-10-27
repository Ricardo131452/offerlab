# -*- coding: utf-8 -*-
"""契约测试：不只看状态码，还看结果是否可复现、内容是否自洽。"""
from __future__ import annotations

import runner

RESUME = (
    "胡世杰\n专业技能\n熟悉 Python、Flask、MySQL。\n"
    "项目经历\n心屿 MindCare：49 条语料向量化，FAISS 索引，双阈值 0.45 / 0.52。\n"
    "教育背景\n长沙南方职业学院"
)


def advise_body():
    jd = runner.build_jd({"kind": "advise"})
    return {"resumeText": RESUME, "jd": jd}


def test_advise_is_deterministic(client):
    """同一输入两次请求，规则版输出必须逐字一致（这是产品可信度的地基）。"""
    first = client.post_json("/api/advise", advise_body())
    second = client.post_json("/api/advise", advise_body())
    assert first.status_code == second.status_code == 200
    assert first.text == second.text, "同一输入两次输出不一致，说明存在随机性"


def test_advise_reports_rule_mode(client):
    resp = client.post_json("/api/advise", advise_body())
    assert resp.headers.get("x-llm-mode") == "rules"
    assert "text/plain" in resp.headers.get("content-type", "")
    assert "结论" in resp.text


def test_interview_returns_question(client):
    body = {"resumeText": RESUME, "jd": runner.build_jd({"kind": "interview"}), "history": []}
    resp = client.post_json("/api/interview", body)
    assert resp.status_code == 200
    assert "面试官" in resp.text


def test_resume_chars_match_text_length(client):
    text = "熟悉 Python 与 Flask，做过 5 张表设计，用 FAISS 建过索引，覆盖 49 条语料。"
    resp = client.post_file("/api/resume", "r.txt", text.encode("utf-8"), "text/plain")
    assert resp.status_code == 200
    data = client.json_of(resp)
    assert data["chars"] == len(text), f"chars={data['chars']} 期望 {len(text)}"
    assert data["kind"] == "text"


def test_resume_pdf_rejects_scan_like_content(client):
    """损坏 PDF 不能静默成功，必须给出可读错误。"""
    resp = client.post_file("/api/resume", "x.pdf", b"%PDF-1.4 broken", "application/pdf")
    assert resp.status_code == 500
    assert client.json_of(resp).get("error")
