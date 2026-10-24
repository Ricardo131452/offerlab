"use client";

import { useEffect, useRef, useState } from "react";
import { streamText } from "@/lib/client-stream";
import type { Jd } from "@/lib/types";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

/**
 * 模拟面试：多轮，每轮把历史送回服务端重新组装 prompt。
 * 服务端每次都会重算报告，所以缺口永远来自同一份确定性结论。
 */
export function InterviewPanel({ jd, resumeText }: { jd: Jd; resumeText: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight, behavior: "smooth" });
  }, [turns]);

  async function ask(history: Turn[]) {
    setBusy(true);
    setError(null);
    setTurns([...history, { role: "assistant", content: "" }]);
    try {
      const usedMode = await streamText("/api/interview", { resumeText, jd, history }, (chunk) => {
        setTurns((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          next[next.length - 1] = { role: "assistant", content: last.content + chunk };
          return next;
        });
      });
      setMode(usedMode);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setTurns(history); // 失败回滚，别留一条空的面试官发言
    } finally {
      setBusy(false);
    }
  }

  function send() {
    const text = answer.trim();
    if (!text || busy) return;
    setAnswer("");
    const history: Turn[] = [...turns, { role: "user", content: text }];
    void ask(history);
  }

  return (
    <section className="rounded-xl border border-line bg-ink-2 p-5">
      <div className="flex items-center gap-3">
        <h3 className="text-sm font-semibold">模拟面试</h3>
        {mode === "rules" && <span className="rounded bg-line px-1.5 py-0.5 text-[10px] text-muted">规则版</span>}
        {mode === "model" && <span className="rounded bg-accent/15 px-1.5 py-0.5 text-[10px] text-accent">模型版</span>}
        {turns.length === 0 && (
          <button
            type="button"
            onClick={() => void ask([])}
            disabled={busy}
            className="ml-auto rounded-full border border-line px-3 py-1 text-[11px] text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            开始面试
          </button>
        )}
      </div>

      {turns.length === 0 ? (
        <p className="mt-3 text-[12px] leading-relaxed text-muted">
          面试官会专挑你「有场景没结果」和「只列名字」的技能追问——这正是真实面试里最容易被问穿的地方。
        </p>
      ) : (
        <div ref={boxRef} className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
          {turns.map((t, i) => (
            <div
              key={i}
              className={`rounded-lg px-3 py-2 text-[12px] leading-relaxed ${
                t.role === "assistant" ? "bg-ink text-fg/90" : "bg-accent/10 text-fg ml-8"
              }`}
            >
              <span className="mr-2 text-[10px] text-muted">{t.role === "assistant" ? "面试官" : "我"}</span>
              <span className="whitespace-pre-wrap">{t.content}</span>
            </div>
          ))}
        </div>
      )}

      {turns.length > 0 && (
        <div className="mt-3 flex gap-2">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
            }}
            placeholder="回答（Ctrl+Enter 发送）"
            className="h-16 flex-1 resize-none rounded-lg border border-line bg-ink p-2.5 text-[12px] outline-none focus:border-accent/60"
          />
          <button
            type="button"
            onClick={send}
            disabled={busy || !answer.trim()}
            className="self-end rounded-full bg-accent px-4 py-2 text-[12px] font-medium text-ink disabled:opacity-40"
          >
            发送
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[12px] text-bad">{error}</p>}
    </section>
  );
}
