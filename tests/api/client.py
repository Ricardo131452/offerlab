# -*- coding: utf-8 -*-
"""接口客户端：薄封装 + 统一断言信息，避免每个用例重复写 requests 细节。"""
from __future__ import annotations

import json
from typing import Any

import requests


class ApiClient:
    """OfferLab 接口客户端。base_url 由 fixture 注入，便于切本地/线上。"""

    def __init__(self, base_url: str, timeout: float = 15.0) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({"user-agent": "offerlab-testkit/1.0"})

    # ---------- 基础请求 ----------
    def post_json(self, path: str, payload: Any, headers: dict | None = None) -> requests.Response:
        return self.session.post(
            self.base_url + path,
            data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
            headers={"content-type": "application/json", **(headers or {})},
            timeout=self.timeout,
        )

    def post_raw(self, path: str, body: bytes, content_type: str = "application/json") -> requests.Response:
        return self.session.post(
            self.base_url + path,
            data=body,
            headers={"content-type": content_type},
            timeout=self.timeout,
        )

    def post_file(self, path: str, filename: str, content: bytes, content_type: str = "application/octet-stream") -> requests.Response:
        return self.session.post(
            self.base_url + path,
            files={"file": (filename, content, content_type)},
            timeout=self.timeout,
        )

    def post_form_without_file(self, path: str) -> requests.Response:
        return self.session.post(self.base_url + path, data={"other": "1"}, timeout=self.timeout)

    def get(self, path: str) -> requests.Response:
        return self.session.get(self.base_url + path, timeout=self.timeout)

    def health(self) -> bool:
        try:
            return self.get("/").status_code == 200
        except requests.RequestException:
            return False

    # ---------- 断言辅助 ----------
    @staticmethod
    def json_of(resp: requests.Response) -> dict:
        try:
            return resp.json()
        except ValueError:
            return {}

    @staticmethod
    def describe(resp: requests.Response, limit: int = 200) -> str:
        body = resp.text[:limit].replace("\n", " ")
        return f"status={resp.status_code} body={body}"
