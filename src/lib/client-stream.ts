/** 客户端流式读取：把 POST 的响应体逐块推给回调。不依赖 EventSource，因为要 POST + JSON。 */
export async function streamText(
  url: string,
  body: unknown,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
