import { TEXT_HEADERS, parseBody, toJd, zInterviewBody } from "@/lib/api-schema";
import { getLlmConfig, streamChat, type ChatMessage } from "@/lib/llm";
import { guard } from "@/lib/guard";
import { matchResumeToJd } from "@/lib/match";
import { buildInterviewMessages } from "@/lib/prompt";

export const runtime = "nodejs";
export const maxDuration = 60;

/** 无 Key 时的第一问：从缺口里挑一条，规则生成，保证面试流程能走通 */
function fallbackQuestion(jdTitle: string, midLabels: string[], weakLabels: string[]): string {
  const target = midLabels[0] ?? weakLabels[0] ?? "你最得意的项目";
  return `（未配置 LLM，以下为规则生成）面试官：我是${jdTitle}岗的面试官。你在简历里提到${target}，能说说它具体解决了什么问题吗？`;
}

export async function POST(req: Request) {
  const blocked = guard(req, { scope: "interview", limit: 30 });
  if (blocked) return blocked;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return Response.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const parsed = parseBody(zInterviewBody, raw);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const jd = toJd(parsed.data.jd);
  if (jd.requirements.length === 0) {
    return Response.json({ error: "JD 没有任何技能要求" }, { status: 422 });
  }

  const report = matchResumeToJd(parsed.data.resumeText, jd);
  const cfg = getLlmConfig();

  if (!cfg) {
    return new Response(fallbackQuestion(jd.title, report.mid.map((f) => f.label), report.weak.map((f) => f.label)), {
      headers: { ...TEXT_HEADERS, "x-llm-mode": "rules" },
    });
  }

  const messages: ChatMessage[] = buildInterviewMessages(jd, report, parsed.data.history);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamChat(cfg, messages, { signal: req.signal, temperature: 0.6, maxTokens: 200 })) {
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
