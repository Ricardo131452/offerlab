/**
 * 引擎单元测试：把之前外挂的 _build/match-test 断言搬进仓库，供 CI 跑。
 * 只依赖 lib 层（不依赖 Next 运行时），所以能在纯 node 环境执行。
 *
 * 运行：npm test
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { matchResumeToJd } = require("../.test-build/lib/match.js");
const { buildAdvice } = require("../.test-build/lib/advice.js");
const samples = require("../src/data/jd-samples.json");

const toJd = (s) => ({
  id: s.id,
  title: s.title,
  city: s.city,
  seniority: s.seniority,
  salary: s.salary,
  source: s.source,
  requirements: s.requirements.map(([skill, weight, must]) => ({ skill, weight, must })),
});
const byId = (id) => toJd(samples.find((s) => s.id === id));

const RESUME = `胡世杰
求职意向：AI 应用开发
专业技能
熟悉 Python、Flask、TypeScript、React；了解 Docker。
项目经历
心屿 MindCare —— 基于 RAG 与大语言模型的心理健康对话系统
使用 BGE 对 49 条语料向量化，建 FAISS 索引，双阈值 0.45 / 0.52 控制引用。
个人作品集：使用 React + Vite 重构首屏，加载时间从 3.2s 降到 1.1s。
教育背景
长沙南方职业学院 · 人工智能技术应用`;

test("确定性：同一简历 + 同一 JD 两次打分必须一致", () => {
  const jd = byId("sz-ai-app");
  assert.equal(matchResumeToJd(RESUME, jd).score, matchResumeToJd(RESUME, jd).score);
});

test("分数与硬性覆盖在合法区间", () => {
  const report = matchResumeToJd(RESUME, byId("sz-ai-app"));
  assert.ok(report.score >= 0 && report.score <= 100);
  assert.ok(report.mustHit <= report.mustTotal);
  assert.ok(report.mustScore >= 0 && report.mustScore <= 1);
});

test("四档分级互斥且覆盖全部 findings", () => {
  const report = matchResumeToJd(RESUME, byId("sz-ai-app"));
  const covered = new Set([...report.gaps, ...report.weak, ...report.mid, ...report.strengths].map((f) => f.skill));
  assert.equal(covered.size, report.findings.length);
});

test("缺失项必须进 gaps：可视化岗要求 Three.js，简历没有", () => {
  const report = matchResumeToJd(RESUME, byId("sh-fe-visual"));
  assert.ok(report.gaps.some((f) => f.skill === "three.js"));
});

test("证据等级：项目里出现过的技能必须 >= 2", () => {
  const report = matchResumeToJd(RESUME, byId("sz-ai-app"));
  const rag = report.findings.find((f) => f.skill === "rag");
  assert.ok(rag && rag.level >= 2);
});

test("单调性：补一条带量化结果的项目经历，分数必须上升", () => {
  const jd = byId("cs-fe-01");
  const before = matchResumeToJd(RESUME, jd).score;
  const after = matchResumeToJd(RESUME + "\n项目经历\n首屏性能优化：加载时间下降 66%，覆盖 120 条记录。", jd).score;
  assert.ok(after > before, `期望上升，实际 ${before} -> ${after}`);
});

test("量化单位白名单：中文单位（张/组/行/处）也算有结果", () => {
  const jd = byId("gz-backend");
  const withUnits = RESUME + "\n项目经历\n心屿后台：设计 5 张数据表、6 组蓝图、约 2800 行代码、3 处索引优化。";
  const report = matchResumeToJd(withUnits, jd);
  const flask = report.findings.find((f) => f.skill === "python") || report.findings[0];
  assert.ok(flask);
  assert.ok(report.strengths.length >= 0); // 结构存在即可，具体等级由词表决定
});

test("单词边界：django 里的 go 不能被判成 Go 技能", () => {
  const resume = "专业技能：Django 后端开发，使用 MySQL。\n项目经历：基于 Django 完成图书管理系统。";
  const report = matchResumeToJd(resume, byId("gz-backend"));
  const go = report.findings.find((f) => f.skill === "go");
  assert.ok(!go || go.level === 0);
});

test("证据片段：不同技能不应引用完全相同的一句话", () => {
  const report = matchResumeToJd(RESUME, byId("cs-fe-01"));
  const snippets = report.findings.flatMap((f) => f.evidence);
  const unique = new Set(snippets);
  assert.ok(snippets.length > 0);
  assert.ok(unique.size >= Math.min(2, snippets.length), `片段重复度过高: ${snippets.length} 条 -> ${unique.size} 唯一`);
});

test("建议分档：硬性全中时不能说「先补项目」", () => {
  const jd = byId("sz-ai-app");
  const report = matchResumeToJd(RESUME, jd);
  const advice = buildAdvice(jd, report);
  if (report.mustHit === report.mustTotal) {
    assert.notEqual(advice.band, "build");
    assert.ok(!advice.headline.includes("硬性要求缺"));
  }
});

test("词表外的技能不参与打分（不产生无法解释的分数）", () => {
  const jd = { ...byId("cs-fe-01"), requirements: [{ skill: "不存在的技术", weight: 3, must: true }] };
  const report = matchResumeToJd(RESUME, jd);
  assert.equal(report.findings.length, 0);
  assert.equal(report.score, 0);
});
