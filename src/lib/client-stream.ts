/**
 * 客户端访问令牌：部署时若配置了 API_ACCESS_TOKEN，用户用 `?t=<token>` 打开一次，
 * 令牌存 localStorage，后续请求自动带上。不放 env 里是因为 NEXT_PUBLIC_* 会打进 JS 包。
 */
const TOKEN_KEY = "offerlab.token";

export function authHeader(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    return token ? { "x-access-token": token } : {};
  } catch {
    return {};
  }
}

export function captureTokenFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const token = new URLSearchParams(window.location.search).get("t");
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* 忽略隐私模式下的存储异常 */
  }
}

/** 客户端流式读取：把 POST 的响应体逐块推给回调。不依赖 EventSource，因为要 POST + JSON。 */
export async function streamText(
  url: string,
  body: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      /* 非 JSON 错误体，用状态码兜底 */
    }
    throw new Error(message);
  }
  if (!res.body) throw new Error("响应没有可读的 body");

  const mode = res.headers.get("x-llm-mode") ?? "unknown";
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    onChunk(decoder.decode(value, { stream: true }));
  }
  return mode;
}
