/**
 * 领域模型：JD、简历、匹配报告。
 *
 * 设计约束（面试可讲）：
 * 1. 匹配结果必须**可复现**——同一简历 + 同一 JD，分数永远一致，不依赖 LLM 随机性；
 * 2. LLM 只负责「把结构化结果讲成人话」，不参与打分；
 * 3. 每条结论都要带原文证据（evidence），不可解释的分数等于没有分数。
 */

export type SkillCategory = "前端" | "后端" | "AI" | "数据" | "工程化" | "通用";

export interface SkillDef {
  /** 规范名（小写，唯一） */
  id: string;
  label: string;
  category: SkillCategory;
  /** 同义词，用于把 JD/简历里的各种写法归一 */
  aliases: string[];
}

/** 权重 1=加分项 2=重要 3=核心；must 表示硬性要求 */
export interface JdRequirement {
  skill: string;
  weight: 1 | 2 | 3;
  must: boolean;
}

export type Seniority = "实习" | "应届/初级" | "1-3年" | "3-5年";

export interface Jd {
  id: string;
  title: string;
  city: string;
  seniority: Seniority;
  salary?: string;
  /** curated-sample = 人工精编样例；imported = 用户导入的真实 JD */
  source: "curated-sample" | "imported";
  requirements: JdRequirement[];
}

/**
 * 证据等级（这是本项目的核心设计，而不是关键词计数）：
 * 0 = 简历里没有
 * 1 = 只在「技能清单」里列了名字（会写，但没证明）
 * 2 = 在项目经历里用过（有场景）
 * 3 = 在项目经历里用过且有量化结果（有说服力）
 */
export type EvidenceLevel = 0 | 1 | 2 | 3;

export interface SkillFinding {
  skill: string;
  label: string;
  category: SkillCategory;
  weight: 1 | 2 | 3;
  must: boolean;
  level: EvidenceLevel;
  /** 命中的原文片段，最多 3 条 */
  evidence: string[];
}

export interface MatchReport {
  /** 0-100，加权证据分 */
  score: number;
  mustHit: number;
  mustTotal: number;
  /** must 覆盖率 0-1 */
  mustScore: number;
  findings: SkillFinding[];
  /** level 0：直接缺失 */
  gaps: SkillFinding[];
  /** level 1：有名字没证据，最容易被 HR 挑 */
  weak: SkillFinding[];
  /** level 2：项目里用过，但没有量化结果——差一句"所以呢" */
  mid: SkillFinding[];
  /** level 3：带量化结果的强证据 */
  strengths: SkillFinding[];
  /** 简历侧解析统计，用于 UI 提示（例如"没识别到项目经历，请检查格式"） */
  parseStats: { chars: number; skillMentions: number; projectBlocks: number };
}
