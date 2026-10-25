"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdvicePanel } from "@/components/advice-panel";
import { InterviewPanel } from "@/components/interview-panel";
import { ReportView } from "@/components/report-view";
import { SAMPLE_RESUME } from "@/data/sample-resume";
import { buildAdvice, type Advice } from "@/lib/advice";
import { authHeader, captureTokenFromUrl } from "@/lib/client-stream";
import { loadJdSamples, parseJdText } from "@/lib/jd";
import { matchResumeToJd } from "@/lib/match";
import { saveImportedJd, saveRun } from "@/lib/store";
import type { Jd, MatchReport } from "@/lib/types";

interface Result {
  jd: Jd;
  report: MatchReport;
  advice: Advice;
}

export default function AnalyzePage() {
  const samples = useMemo(() => loadJdSamples(), []);
  const [resumeText, setResumeText] = useState("");
  const [jdMode, setJdMode] = useState<"sample" | "paste">("sample");
  const [jdId, setJdId] = useState(samples[0]?.id ?? "");
  const [jdPaste, setJdPaste] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  // 部署后若配置了访问令牌，用户用 ?t=<token> 打开一次即可（存在 localStorage）
  useEffect(() => {
    captureTokenFromUrl();
  }, []);

  async function handleFile(file: File) {
    setBusy(true);
    setError(null);
    setFileInfo(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/resume", { method: "POST", body: fd, headers: authHeader() });
      const data = (await res.json()) as { text?: string; pages?: number; chars?: number; error?: string };
      if (!res.ok || !data.text) throw new Error(data.error ?? "解析失败");
      setResumeText(data.text);
      setFileInfo(`${file.name} · ${data.pages} 页 · ${data.chars} 字`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function analyze() {
    setError(null);
    if (resumeText.trim().length < 50) {
      setError("简历内容太少（<50 字），先上传文件或粘贴文本。");
      return;
    }

    const jd = jdMode === "sample" ? samples.find((s) => s.id === jdId) : parseJdText(jdPaste);
    if (!jd) {
      setError("没找到这个岗位样例。");
      return;
    }
    if (jd.requirements.length === 0) {
      setError("没从这段 JD 里识别出任何技能要求——确认粘贴的是岗位描述，且包含技术名词。");
      return;
    }

    const report = matchResumeToJd(resumeText, jd);
    setResult({ jd, report, advice: buildAdvice(jd, report) });

    // 导入的 JD 落本地（同标题+同城市+同技能集合去重），喂给 /jobs 词频看板
    if (jdMode === "paste") saveImportedJd(jd);
    saveRun({ at: new Date().toISOString(), jdTitle: jd.title, score: report.score });

    requestAnimationFrame(() => document.getElementById("result")?.scrollIntoView({ behavior: "smooth" }));
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-line pb-5">
        <Link href="/" className="font-display text-lg">
          Offer<span className="text-accent">Lab</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/jobs" className="text-[11px] text-muted transition-colors hover:text-accent">
            岗位词频
          </Link>
          <span className="text-[11px] text-muted">证据级匹配 · 规则打分</span>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold">1. 你的简历</h2>
            <label
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-ink-2 px-4 py-8 text-center transition-colors hover:border-accent/60"
            >
              <input
                type="file"
                accept=".pdf,.txt,.md"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              <span className="text-sm">拖入 PDF / TXT，或点击选择</span>
              <span className="mt-1 text-[11px] text-muted">≤5MB；扫描件不支持（需 OCR）</span>
            </label>
            {fileInfo && <p className="mt-2 text-[11px] text-good">已解析：{fileInfo}</p>}

            <div className="mt-3 flex items-center justify-between">
              <span className="text-[11px] text-muted">或直接粘贴文本</span>
              <button
                type="button"
                onClick={() => {
                  setResumeText(SAMPLE_RESUME);
                  setFileInfo("示例简历（内置，用于验证链路）");
                  setError(null);
                }}
                className="text-[11px] text-accent hover:underline"
              >
                载入示例简历
              </button>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="把简历正文粘贴到这里…"
              className="mt-2 h-56 w-full resize-y rounded-lg border border-line bg-ink p-3 text-[12px] leading-relaxed outline-none focus:border-accent/60"
            />
            <p className="mt-1 text-[11px] text-muted">当前 {resumeText.length} 字</p>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-semibold">2. 目标岗位</h2>
            <div className="mb-2 flex gap-2">
              {(["sample", "paste"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setJdMode(m)}
                  className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
                    jdMode === m ? "bg-accent text-ink" : "border border-line text-muted hover:text-fg"
                  }`}
                >
                  {m === "sample" ? "内置样例" : "粘贴 JD"}
                </button>
              ))}
            </div>

            {jdMode === "sample" ? (
              <>
                <select
                  value={jdId}
                  onChange={(e) => setJdId(e.target.value)}
                  className="w-full rounded-lg border border-line bg-ink p-2.5 text-[12px] outline-none focus:border-accent/60"
                >
                  {samples.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} · {s.city} · {s.seniority}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-muted">
                  {samples.find((s) => s.id === jdId)?.requirements.length ?? 0} 项技能要求
                </p>
              </>
            ) : (
              <textarea
                value={jdPaste}
                onChange={(e) => setJdPaste(e.target.value)}
                placeholder="粘贴完整 JD（岗位职责 + 任职要求）…"
                className="h-32 w-full resize-y rounded-lg border border-line bg-ink p-3 text-[12px] leading-relaxed outline-none focus:border-accent/60"
              />
            )}
          </section>

          <button
            type="button"
            onClick={analyze}
            disabled={busy}
            className="w-full rounded-full bg-accent py-2.5 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5 disabled:opacity-50"
          >
            {busy ? "解析中…" : "开始诊断"}
          </button>
          {error && <p className="text-[12px] text-bad">{error}</p>}
        </div>

        <div id="result" className="space-y-6">
          {result ? (
            <>
              <ReportView jd={result.jd} report={result.report} advice={result.advice} />
              <AdvicePanel jd={result.jd} resumeText={resumeText} />
              <InterviewPanel jd={result.jd} resumeText={resumeText} />
            </>
          ) : (
            <div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-line bg-ink-2/40 p-8 text-center text-[12px] leading-relaxed text-muted">
              报告会出现在这里：
              <br />
              证据分、硬性覆盖率、缺失 / 只列名 / 有量化结果 的分组，全部可追溯到原文。
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
