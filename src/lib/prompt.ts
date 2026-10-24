import type { ChatMessage } from "./llm";
import type { Jd, MatchReport, SkillFinding } from "./types";

const LEVEL = ["缺失", "仅列名", "用过", "有量化"] as const;

function tag(f: SkillFinding): string {
  return `${f.label}（${LEVEL[f.level]}，权重${f.weight}${f.must ? "，硬性" : ""}）`;
}

/** 给模型看的"事实清单"：只喂结构化结论，不喂整份简历，防止它自由发挥 */
export function reportDigest(report: MatchReport): string {
  return [
    `证据分 ${report.score}/100；硬性要求命中 ${report.mustHit}/${report.mustTotal}`,
    `强证据：${report.strengths.map(tag).join("、") || "无"}`,
    `有场景缺结果：${report.mid.map(tag).join("、") || "无"}`,
    `仅列名：${report.weak.map(tag).join("、") || "无"}`,
    `直接缺失：${report.gaps.map(tag).join("、") || "无"}`,
  ].join("\n");
}

const HARD_RULES = `硬性规则：
1. 只能使用我给你的"事实清单"，不得编造求职者没有的经历、公司、数字；
2. 需要举例时用占位符（如「__%」「__ 条」），让用户自己填真实数据；
3. 不要复述打分公式，不要写"首先/其次/最后"这类套话；
4. 输出中文，不超过 320 字。`;

export function buildAdviceMessages(jd: Jd, report: MatchReport, resumeExcerpt: string): ChatMessage[] {
  return [
    {
      role: "system",
      content: `你是一个严格的简历顾问，服务对象是正在求职的学生。你的任务是把已经算好的匹配结论讲成可执行的修改动作。
${HARD_RULES}`,
    },
    {
      role: "user",
      content: `目标岗位：${jd.title}｜${jd.city}｜${jd.seniority}
岗位要求：${jd.requirements.map((r) => `${r.skill}${r.must ? "(硬性)" : ""}`).join("、")}

事实清单：
${reportDigest(report)}

简历原文（截断）：
${resumeExcerpt}

请输出三段：
① 一句话结论：现在能不能投，为什么；
② 改哪 2~3 条最赚：指明技能，给"改成什么"的具体句式；
③ 提醒一个风险点（例如硬性缺口、格式问题）。`,
    },
  ];
}

export function buildInterviewMessages(jd: Jd, report: MatchReport, history: ChatMessage[]): ChatMessage[] {
  return [
    {
      role: "system",
      content: `你是${jd.title}岗位的面试官，正在面试一个应届生。你已知候选人的简历与匹配报告。
规则：
1. 每次只问一个问题，不超过 60 字，口语化；
2. 优先追问"有场景但没结果"和"只列名字"的技能，逼出具体细节；
3. 不要给出答案、不要评价、不要客套；
4. 如果候选人回答含糊，就追问同一个点的细节。`,
    },
    {
      role: "user",
      content: `候选人事实清单：
${reportDigest(report)}

优先追问方向：${[...report.mid, ...report.weak].slice(0, 4).map((f) => f.label).join("、") || "项目细节"}`,
    },
    ...history,
  ];
}
