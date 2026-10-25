import { ALIAS_INDEX, escapeRegExp, SKILL_BY_ID } from "./taxonomy";
import type { EvidenceLevel, Jd, MatchReport, SkillFinding } from "./types";

/**
 * 匹配引擎（确定性，无 LLM 参与）。
 *
 * 为什么不用 LLM 打分：
 * - 同一份简历问两次会得到两个分数，用户无法验证，也没法解释给面试官；
 * - 打分要能"按证据分"，而不是"关键词出现过"——关键词堆砌的简历必须被扣分。
 * 所以：规则打分 + 证据分级，LLM 只负责把结论讲成人话（见 lib/llm.ts）。
 */

const SECTION_SKILLS = /(专业技能|技能清单|技能特长|技术栈|掌握技能|个人技能|专业能力|技能储备)/;
const SECTION_PROJECTS = /(项目经历|项目经验|实习经历|工作经历|实践经历|主要项目|项目实践|校园经历)/;
const SECTION_END = /(教育背景|教育经历|获奖情况|荣誉证书|自我评价|自我描述|求职意向|个人信息)/;

/**
 * 量化信号：数字 + 单位，代表"有结果"而不是"我做过"。
 * 单位白名单是从真实简历里长的，不是拍脑袋：中文简历里最常见的是
 * 张/组/行/页/处/项/条/篇/套/级/倍/类/人/个/次/万/%/ms/秒…
 * 少一个单位，就会把"5 张数据表"这种实打实的结果误判成"没量化"。
 */
const QUANT =
  /\d+(\.\d+)?\s*(%|％|条|次|个|万|w|ms|毫秒|秒|人|类|项|家|轮|qps|QPS|张|组|行|页|处|篇|套|级|倍|名|位|款|种|台|块|层|小时|分钟|天|周)/;

export interface ResumeSections {
  skills: string;
  projects: string;
  other: string;
  projectBlocks: string[];
  lines: string[];
}

/**
 * 简历分段：只做"够用"的启发式，不追求通用解析。
 * 简历排版是有限集合（技能段 / 项目段 / 教育段），过度工程化反而脆弱。
 */
export function splitResume(text: string): ResumeSections {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  let mode: "other" | "skills" | "projects" = "other";
  const skills: string[] = [];
  const projects: string[] = [];
  const other: string[] = [];

  for (const line of lines) {
    if (SECTION_SKILLS.test(line)) {
      mode = "skills";
      continue;
    }
    if (SECTION_PROJECTS.test(line)) {
      mode = "projects";
      projects.push(line); // 项目标题本身也携带技能信息
      continue;
    }
    if (SECTION_END.test(line)) {
      mode = "other";
      continue;
    }
    if (mode === "skills") skills.push(line);
    else if (mode === "projects") projects.push(line);
    else other.push(line);
  }

  // 没有显式项目段时，退化为全文，避免"格式不规范 → 全线缺失"的误判
  const projectBlocks =
    projects.length > 0 ? projects : lines.length > 0 ? lines.slice(0, Math.min(40, lines.length)) : [];

  return { skills: skills.join("\n"), projects: projectBlocks.join("\n"), other: other.join("\n"), projectBlocks, lines };
}

function isLatin(alias: string): boolean {
  return /^[a-z0-9.+#\-\s]+$/i.test(alias);
}

/** 长词优先 + 拉丁词做单词边界，避免 "go" 命中 "django"、"ts" 命中 "artifacts" */
export function mentions(text: string, id: string): boolean {
  if (!text) return false;
  const def = SKILL_BY_ID.get(id);
  // 词的三种写法都要认：规范 id、别名、展示名（中文 label 若不参与匹配，
  // 就会出现"简历写了「性能优化」却判为缺失"的荒谬结果）
  const aliases = [id, ...(def?.aliases ?? []), ...(def ? [def.label] : [])];
  for (const alias of aliases) {
    if (!alias) continue;
    if (isLatin(alias)) {
      const re = new RegExp(`(?<![a-z0-9])${escapeRegExp(alias)}(?![a-z0-9])`, "i");
      if (re.test(text)) return true;
    } else if (text.includes(alias)) {
      return true;
    }
  }
  return false;
}

function linesMentioning(lines: string[], id: string): string[] {
  return lines.filter((line) => mentions(line, id));
}

/**
 * 证据摘录：以技能词为中心截取上下文，而不是把整行甩给用户。
 * 否则 React / TypeScript / Vite 出现在同一行时，四张卡会显示同一句话——像复读机。
 */
function snippet(line: string, id: string): string {
  const def = SKILL_BY_ID.get(id);
  const terms = [id, ...(def?.aliases ?? []), ...(def ? [def.label] : [])].filter(Boolean);
  const lower = line.toLowerCase();
  let idx = -1;
  for (const t of terms) {
    const i = lower.indexOf(t.toLowerCase());
    if (i >= 0 && (idx === -1 || i < idx)) idx = i;
  }
  if (idx === -1) return line.slice(0, 80);
  const start = Math.max(0, idx - 20);
  const end = Math.min(line.length, idx + 58);
  return `${start > 0 ? "…" : ""}${line.slice(start, end)}${end < line.length ? "…" : ""}`;
}

function gradeEvidence(id: string, sections: ResumeSections): { level: EvidenceLevel; evidence: string[] } {
  const projectHits = linesMentioning(sections.projectBlocks, id);
  if (projectHits.length > 0) {
    const quantified = projectHits.some((line) => QUANT.test(line));
    return {
      level: quantified ? 3 : 2,
      evidence: [...new Set(projectHits.map((l) => snippet(l, id)))].slice(0, 3),
    };
  }
  const skillHits = linesMentioning(sections.lines, id);
  if (skillHits.length > 0) {
    return { level: 1, evidence: [...new Set(skillHits.map((l) => snippet(l, id)))].slice(0, 3) };
  }
  return { level: 0, evidence: [] };
}

export function matchResumeToJd(resumeText: string, jd: Jd): MatchReport {
  const sections = splitResume(resumeText);

  // JD 侧去重：同一技能出现多次只按最高权重算一次
  const requirementMap = new Map<string, { weight: 1 | 2 | 3; must: boolean }>();
  for (const req of jd.requirements) {
    const prev = requirementMap.get(req.skill);
    if (!prev || req.weight > prev.weight) {
      requirementMap.set(req.skill, { weight: req.weight, must: req.must || (prev?.must ?? false) });
    }
  }

  const findings: SkillFinding[] = [];
  let earned = 0;
  let total = 0;

  for (const [skill, req] of requirementMap) {
    const def = SKILL_BY_ID.get(skill);
    if (!def) continue; // 词表外技能不参与打分，避免无法解释的分数
    const { level, evidence } = gradeEvidence(skill, sections);
    const factor = req.must ? 1.5 : 1; // 硬性要求不满足，扣分更狠
    const weight = req.weight * factor;
    total += weight;
    earned += weight * (level / 3);
    findings.push({
      skill,
      label: def.label,
      category: def.category,
      weight: req.weight,
      must: req.must,
      level,
      evidence,
    });
  }

  findings.sort((a, b) => b.weight - a.weight || a.level - b.level || a.label.localeCompare(b.label));

  const mustFindings = findings.filter((f) => f.must);
  const mustHit = mustFindings.filter((f) => f.level > 0).length;

  const skillMentions = [...ALIAS_INDEX.values()].filter((id) => mentions(resumeText, id)).length;

  return {
    score: total === 0 ? 0 : Math.round((earned / total) * 100),
    mustHit,
    mustTotal: mustFindings.length,
    mustScore: mustFindings.length === 0 ? 0 : mustHit / mustFindings.length,
    findings,
    gaps: findings.filter((f) => f.level === 0),
    weak: findings.filter((f) => f.level === 1),
    mid: findings.filter((f) => f.level === 2),
    strengths: findings.filter((f) => f.level === 3),
    parseStats: {
      chars: resumeText.length,
      skillMentions,
      projectBlocks: sections.projectBlocks.length,
    },
  };
}
