"use client";

import { motion } from "framer-motion";
import type { Advice } from "@/lib/advice";
import type { Jd, MatchReport, SkillFinding } from "@/lib/types";

const LEVEL_LABEL = ["缺失", "仅列名", "项目用过", "有量化结果"] as const;

function ScoreRing({ score, mustHit, mustTotal }: { score: number; mustHit: number; mustTotal: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-line" />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          strokeLinecap="round"
          className="text-accent"
          initial={{ strokeDasharray: `0 ${c}` }}
          animate={{ strokeDasharray: `${(score / 100) * c} ${c}` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl leading-none">{score}</span>
        <span className="mt-1 text-xs text-muted">证据分</span>
        <span className="mt-1 text-[11px] text-muted">
          硬性 {mustHit}/{mustTotal}
        </span>
      </div>
    </div>
  );
}

function SkillCard({ f }: { f: SkillFinding }) {
  const tone =
    f.level === 0 ? "border-bad/40" : f.level === 1 ? "border-warn/40" : f.level === 2 ? "border-line" : "border-good/40";
  return (
    <div className={`rounded-lg border ${tone} bg-ink-2 p-3`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{f.label}</span>
        <span className="rounded bg-line px-1.5 py-0.5 text-[10px] text-muted">权重 {f.weight}</span>
        {f.must && <span className="rounded bg-bad/15 px-1.5 py-0.5 text-[10px] text-bad">硬性</span>}
        <span className="ml-auto text-[10px] text-muted">{LEVEL_LABEL[f.level]}</span>
      </div>
      {f.evidence.length > 0 && (
        <ul className="mt-2 space-y-1">
          {f.evidence.map((e, i) => (
            <li key={i} className="border-l border-line pl-2 text-[11px] leading-relaxed text-muted">
              {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Group({ title, hint, items }: { title: string; hint: string; items: SkillFinding[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-[11px] text-muted">{hint}</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((f) => (
          <SkillCard key={f.skill} f={f} />
        ))}
      </div>
    </section>
  );
}

export function ReportView({ jd, report, advice }: { jd: Jd; report: MatchReport; advice: Advice }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 rounded-xl border border-line bg-ink-2 p-6 sm:flex-row sm:items-center">
        <ScoreRing score={report.score} mustHit={report.mustHit} mustTotal={report.mustTotal} />
        <div className="min-w-0">
          <div className="text-xs text-muted">
            {jd.city} · {jd.seniority}
            {jd.salary ? ` · ${jd.salary}` : ""} · {jd.source === "curated-sample" ? "样例 JD" : "导入 JD"}
          </div>
          <h2 className="mt-1 truncate text-xl font-semibold">{jd.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg/90">{advice.headline}</p>
        </div>
      </div>

      {advice.formatWarnings.length > 0 && (
        <div className="rounded-lg border border-warn/40 bg-warn/5 p-4">
          <div className="mb-1 text-xs font-semibold text-warn">简历解析提醒</div>
          <ul className="space-y-1 text-[12px] leading-relaxed text-muted">
            {advice.formatWarnings.map((w, i) => (
              <li key={i}>· {w}</li>
            ))}
          </ul>
        </div>
      )}

      <Group title="强证据" hint="项目里用过且有量化结果——这些要放到简历最前面" items={report.strengths} />
      <Group title="有场景，缺结果" hint="项目里确实用过，但没写结果——补一句数字就能升级" items={report.mid} />
      <Group title="需补证据" hint="只列了名字，没有场景和结果——HR 最容易在这里打回" items={report.weak} />
      <Group title="直接缺失" hint="JD 提到、简历完全没有" items={report.gaps} />

      {advice.gapActions.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">缺口怎么补</h3>
          <ul className="space-y-1.5 text-[12px] leading-relaxed text-muted">
            {advice.gapActions.map((a, i) => (
              <li key={i}>· {a}</li>
            ))}
          </ul>
        </section>
      )}

      {advice.rewriteTemplates.length > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-semibold">改写模板</h3>
          <pre className="overflow-x-auto rounded-lg border border-line bg-ink p-4 text-[12px] leading-relaxed text-fg/90 whitespace-pre-wrap">
            {advice.rewriteTemplates.join("\n\n")}
          </pre>
        </section>
      )}

      <p className="border-t border-line pt-4 text-[11px] text-muted">
        解析：{report.parseStats.chars} 字 / 识别技能 {report.parseStats.skillMentions} 个 / 项目段{" "}
        {report.parseStats.projectBlocks} 行。打分完全由规则与证据等级决定，不含 LLM 随机性。
      </p>
    </div>
  );
}
