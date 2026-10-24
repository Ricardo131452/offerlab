"use client";

import { useRef, useState } from "react";
import { streamText } from "@/lib/client-stream";
import type { Jd } from "@/lib/types";

type State = "idle" | "loading" | "streaming" | "done" | "error";

/**
 * 改写建议面板：一个按钮、一条流。
 * 不挂载就发请求——避免打开页面就烧 token。
 */
export function AdvicePanel({ jd, resumeText }: { jd: Jd; resumeText: string }) {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>("idle");
  const [mode, setMode] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setText("");
    setError(null);
    setState("loading");
    try {
      const usedMode = await streamText(
        "/api/advise",
        { resumeText, jd },
        (chunk) => {
          setState("streaming");
          setText((prev) => prev + chunk);
        },
        controller.signal,
      );
      setMode(usedMode);
      setState("done");
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  return (
    <section className="rounded-xl border border-line bg-ink-2 p-5">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">改写建议</h3>
        {mode === "rules" && <span className="rounded bg-line px-1.5 py-0.5 text-[10px] text-muted">规则版</span>}
        {mode === "model" && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">模型版</span>}
        <button
          type="button"
          onClick={run}
          disabled={state === "loading" || state === "streaming"}
          className="ml-auto rounded-full border border-line px-3 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
        >
          {state === "idle" ? "生成" : state === "done" ? "重新生成" : state === "error" ? "重试" : "生成中…"}
        </button>
      </div>

      {state === "idle" && (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          基于上面的四档结论，给出「改哪几条最赚」和可直接套用的句式。未配置 API Key 时走规则版，内容一样可复现。
        </p>
      )}

      {(text || state === "loading") && (
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap text-[12px] leading-relaxed text-fg/90">
          {text}
          {(state === "loading" || state === "streaming") && <span className="ml-0.5 animate-pulse text-accent">▍</span>}
        </pre>
      )}

      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </section>
  );
}
