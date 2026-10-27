# 接口自动化测试（pytest + requests）

对 OfferLab 的 7 条接口做数据驱动的接口测试：**用例写在 YAML 里，加用例不改代码**。

## 三条命令跑起来

```bash
npm install && npm run build && npm run start   # 1. 起服务（默认 3100）
pip install -r tests/api/requirements-test.txt # 2. 装测试依赖
python -m pytest tests/api -q --html=tests/api/report.html --self-contained-html
```

> 服务不在 3100 就设 `BASE_URL=http://127.0.0.1:3000`。

## 覆盖什么

| 分组 | 用例数 | 关注点 |
|---|---|---|
| `/api/resume` 文件解析 | 7 | txt/md 正常、扩展名不支持 415、缺文件 400、超 5MB 413、损坏 PDF 500 |
| `/api/advise` 改写建议 | 8 | 正常 200、简历过短 400、缺 JD 400、无技能要求 422、非 JSON 400、权重越界 400、技能缺字段 400、超 80 条 400 |
| `/api/interview` 模拟面试 | 5 | 首问、带历史、非法角色 400、历史超 20 条 400、无技能要求 422 |
| 契约测试 | 5 | 同输入两次输出逐字一致、规则版响应头、面试官提问、chars 与原文长度一致、损坏 PDF 必须有可读错误 |
| 限流 | 1 | 连续请求触发 429 且带 `retry-after` |
| **合计** | **26** | `26 passed in ~2s` |

## 目录

```
tests/api/
  conftest.py        # 服务健康检查、客户端、样例数据
  client.py          # requests 薄封装（JSON/文件/表单/健康检查）
  runner.py           # 用例构造与断言（YAML → 请求 → 断言）
  data/cases.yaml    # 用例表：一条 YAML = 一条用例
  test_cases.py      # 参数化执行 YAML 用例
  test_contract.py   # 契约与一致性（确定性最关键）
  test_zz_guard.py   # 限流放最后，避免影响前序用例
  report.html        # 运行后生成的报告
```

## 为什么这么写（面试可讲）

- **数据驱动**：用例与代码分离，新增一条用例只改 YAML——这是测试框架和"写死脚本"的区别。
- **契约优先**：不只断言状态码，还断言「同一输入两次输出逐字一致」，因为打分系统一旦有随机性就无法被信任。
- **顺序隔离**：限流用例会消耗配额，用 `zz_` 前缀保证最后执行，否则会污染其他用例。
- **失败可诊断**：断言信息里带 `status` 和响应体前 200 字，失败时不用再手动复现。
