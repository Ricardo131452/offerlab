import type { Jd, MatchReport, SkillFinding } from "./types";

/**
 * 改写建议：先由规则生成（确定性、离线可用），LLM 之后只做润色。
 * 这样即使没有 API Key，产品也是完整可用的——求职演示不能依赖"我的 key 还没过期"。
 */

export type Band = "go" | "tune" | "build" | "pivot";

export interface Advice {
  band: Band;
  headline: string;
  /** 针对缺失技能的补法 */
  gapActions: string[];
  /** 针对"有名字没证据"的改写模板 */
  rewriteTemplates: string[];
  /** 简历格式类提醒 */
  formatWarnings: string[];
}

/**
 * 分档必须先看硬性覆盖率：硬性全中但分数 54 时说"缺 0 项所以先补项目"是自相矛盾的。
 * 硬性全中 → 最差也是 tune（可以改一改就投）。
 */
function bandOf(score: number, mustScore: number): Band {
  if (score >= 75) return "go";
  if (mustScore === 1 && score >= 45) return "tune";
  if (score >= 60) return "tune";
  if (score >= 45) return "build";
  return "pivot";
}

const HEADLINE: Record<Band, (j: Jd, r: MatchReport) => string> = {
  go: (j, r) => `匹配度 ${r.score} 分，硬性要求命中 ${r.mustHit}/${r.mustTotal}：这个岗位现在就可以投，重点是把强证据往前放。`,
  tune: (j, r) =>
    `匹配度 ${r.score} 分，硬性要求全中（${r.mustHit}/${r.mustTotal}）：可以投，但 ${r.weak.length + r.mid.length} 项技能缺"结果"这一口气，改完再投更稳。`,
  build: (j, r) => {
    const missing = r.mustTotal - r.mustHit;
    return missing > 0
      ? `匹配度 ${r.score} 分，硬性要求缺 ${missing} 项：先补一个能演示的小项目，比继续投更有用。`
      : `匹配度 ${r.score} 分：硬性要求都命中了，但证据偏薄，建议把 2~3 条经历补出数字再投。`;
  },
  pivot: (j, r) => `匹配度 ${r.score} 分：这个岗位和当前简历差距过大，投递大概率石沉大海——换一个更接近的方向更省时间。`,
};

function gapAction(f: SkillFinding): string {
  return f.must
    ? `【硬性】${f.label}：JD 要求必须会，简历完全没提。要么 2 周内做一个最小可交付项目（能演示 > 能背概念），要么直接放弃这类岗位。`
    : `【加分】${f.label}：不是硬性要求，但同类候选人普遍会。优先级放在硬性缺口之后。`;
}

function rewriteTemplate(jdTitle: string): string {
  return [
    `"使用 __ 技术完成了 __（场景），解决了 __ 问题，结果是 __（数字：耗时下降/覆盖条数/准确率/用户数）"`,
    `把简历里的"熟悉 __"改成上面这句，关键词变成证据；面试官看的不是你列了什么，而是你拿它做成过什么。`,
  ].join("\n");
}

export function buildAdvice(jd: Jd, report: MatchReport): Advice {
  const band = bandOf(report.score, report.mustScore);
  const formatWarnings: string[] = [];

  if (report.parseStats.projectBlocks < 3) {
    formatWarnings.push(
      "没识别到明确的「项目经历」段落。匹配引擎会退化成全文扫描，可能高估你的证据等级——建议用「项目经历」做小标题，PDF 用可复制文字的版本。",
    );
  }
  if (report.parseStats.chars < 300) {
    formatWarnings.push("简历正文少于 300 字，信息量不足以支撑匹配判断，请确认是否是扫描件或内容过简。");
  }
  if (report.parseStats.skillMentions === 0) {
    formatWarnings.push("一个技能词都没命中——检查简历是否为中文以外语言，或使用了词表外的技术名。");
  }

  const needsEvidence = report.weak.length + report.mid.length;
  return {
    band,
    headline: HEADLINE[band](jd, report),
    gapActions: report.gaps.slice(0, 6).map(gapAction),
    rewriteTemplates:
      needsEvidence > 0
        ? [
            `针对 ${jd.title} 的改写模板（你有 ${report.mid.length} 项「用过没结果」、${report.weak.length} 项「只列了名字」）：`,
            rewriteTemplate(jd.title),
          ]
        : [],
    formatWarnings,
  };
}
