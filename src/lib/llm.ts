/**
 * LLM 客户端：只做一件事——把结构化结论转换成流式文本。
 * 不引入任何 SDK（openai / langchain），手写 fetch + SSE 解析：
 * 依赖越少，部署越稳，出问题也越容易定位到具体一行。
 *
 * 支持任意 OpenAI 兼容端点（DeepSeek / 通义 / 本地 ollama / vLLM），只换环境变量。
 */

export interface LlmConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class LlmError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "LlmError";
    this.status = status;
  }
}

const DEFAULT_BASE = "https://api.deepseek.com/v1";
const DEFAULT_MODEL = "deepseek-chat";

/** 没有 Key 时返回 null —— 上层据此回退到规则版，而不是报错。 */
export function getLlmConfig(): LlmConfig | null {
  const apiKey =
    process.env.LLM_API_KEY || process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || "";
  if (!apiKey.trim()) return null;
  return {
    apiKey: apiKey.trim(),
    baseUrl: (process.env.LLM_BASE_URL || DEFAULT_BASE).replace(/\/+$/, ""),
    model: process.env.LLM_MODEL || DEFAULT_MODEL,
  };
}

export interface StreamOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function* streamChat(
  cfg: LlmConfig,
  messages: ChatMessage[],
  opts: StreamOptions = {},
): AsyncGenerator<string> {
  const { signal, temperature = 0.4, maxTokens = 900, timeoutMs = 60_000 } = opts;
  const timeout = AbortSignal.timeout(timeoutMs);
  const composed = signal ? AbortSignal.any([signal, timeout]) : timeout;

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({ model: cfg.model, messages, temperature, max_tokens: maxTokens, stream: true }),
    signal: composed,
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new LlmError(`上游返回 ${res.status}：${detail.slice(0, 200) || "无响应体"}`, 502);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // 最后一行可能是半包，留到下一轮

    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return;

      let json: unknown;
      try {
        json = JSON.parse(payload);
      } catch {
        continue; // 半包/心跳，忽略
      }

      const obj = json as {
        error?: { message?: string };
        choices?: { delta?: { content?: string } }[];
      };
      // 有些上游 HTTP 200 但在流里塞 error，必须识别，否则前端表现为"无声卡住"
      if (obj.error) throw new LlmError(`上游流内错误：${obj.error.message ?? "未知"}`, 502);
      const delta = obj.choices?.[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
