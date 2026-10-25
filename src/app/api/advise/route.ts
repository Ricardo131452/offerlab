import { TEXT_HEADERS, parseBody, toJd, zAdviseBody } from "@/lib/api-schema";
import { buildAdvice } from "@/lib/advice";
import { getLlmConfig, streamChat, type ChatMessage } from "@/lib/llm";
import { guard } from "@/lib/guard";
import { buildAdviceMessages } from "@/lib/prompt";
import { matchResumeToJd } from "@/lib/match";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 无 Key 时的确定性文本：产品在离线环境也必须可用 */
function fallbackText(headline: string, gaps: string[], templates: string[], warnings: string[]): string {
  const parts = [`【结论】${headline}`];
  if (gaps.length) parts.push(`【优先补】\n${gaps.map((g) => "- " + g).join("\n")}`);
  if (templates.length) parts.push(`【改写示范】\n${templates.join("\n")}`);
  if (warnings.length) parts.push(`【提醒】\n${warnings.map((w) => "- " + w).join("\n")}`);
  parts.push("\n（当前未配置 LLM_API_KEY，以上为规则版建议，内容与顺序完全可复现。）");
  return parts.join("\n\n");
}

export async function POST(req: Request) {
  const blocked = guard(req, { scope: "advise", limit: 20 });
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = parseBody(zAdviseBody, raw);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const jd = toJd(parsed.data.jd);
  if (jd.requirements.length === 0) {
    return Response.json({ error: "JD 没有任何技能要求，无法生成建议" }, { status: 422 });
  }

  // 服务端重算，不接受客户端传来的分数
  const report = matchResumeToJd(parsed.data.resumeText, jd);
  const advice = buildAdvice(jd, report);
  const cfg = getLlmConfig();

  if (!cfg) {
    const text = fallbackText(advice.headline, advice.gapActions, advice.rewriteTemplates, advice.formatWarnings);
    return new Response(text, { headers: { ...TEXT_HEADERS, "x-llm-mode": "rules" } });
  }

  const messages: ChatMessage[] = buildAdviceMessages(
    jd,
    report,
    parsed.data.resumeText.slice(0, 4000),
  );

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamChat(cfg, messages, { signal: req.signal })) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[生成中断] ${msg}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { ...TEXT_HEADERS, "x-llm-mode": "model" } });
}
