"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadJdSamples } from "@/lib/jd";
import { SKILL_BY_ID } from "@/lib/taxonomy";
import { aggregateSkills, clearImportedJds, loadImportedJds } from "@/lib/store";
import type { Jd, SkillCategory } from "@/lib/types";

const CATEGORIES: (SkillCategory | "全部")[] = ["全部", "前端", "后端", "AI", "数据", "工程化", "通用"];

const CAT_COLOR: Record<SkillCategory, string> = {
  前端: "text-accent",
  后端: "text-good",
  AI: "text-warn",
  数据: "text-bad",
  工程化: "text-muted",
  通用: "text-muted",
};

export default function JobsPage() {
  const samples = useMemo(() => loadJdSamples(), []);
  const [imported, setImported] = useState<Jd[]>([]);
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>("全部");

  useEffect(() => {
    setImported(loadImportedJds());
  }, []);

  const all = useMemo(() => [...imported, ...samples], [imported, samples]);
  const stats = useMemo(
    () => aggregateSkills(all, (id) => (id ? SKILL_BY_ID.get(id) : undefined)),
    [all],
  );
  const filtered = cat === "全部" ? stats : stats.filter((s) => s.category === cat);
  const maxCount = filtered[0]?.count ?? 1;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-line pb-5">
        <Link href="/" className="font-display text-lg">
          Offer<span className="text-accent">Lab</span>
        </Link>
        <Link href="/analyze" className="text-[12px] text-muted hover:text-accent">
          去诊断 →
        </Link>
      </header>

      <div className="mt-8">
        <h1 className="text-2xl font-semibold tracking-tight">岗位技能词频</h1>
        <p className="mt-2 max-w-2xl text-[12px] leading-relaxed text-muted">
          统计口径：{imported.length} 条你导入的 JD + {samples.length} 条内置样例。次数 = 出现在多少个岗位里；
          硬性 = 其中多少条把它列为必须。按「次数 → 硬性占比」排序，而不是按我的主观判断。
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`rounded-full px-3 py-1 text-[11px] transition-colors ${
              cat === c ? "bg-accent text-ink" : "border border-line text-muted hover:text-fg"
            }`}
          >
            {c}
          </button>
        ))}
        {imported.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearImportedJds();
              setImported([]);
            }}
            className="ml-auto text-[11px] text-muted hover:text-bad"
          >
            清空导入的 JD（{imported.length}）
          </button>
        )}
      </div>

      <div className="mt-6 space-y-2">
        {filtered.length === 0 && <p className="text-[12px] text-muted">这个分类下还没有数据。</p>}
        {filtered.map((s) => {
          const meta = SKILL_BY_ID.get(s.skill);
          return (
            <div key={s.skill} className="rounded-lg border border-line bg-ink-2 p-3">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">{meta?.label ?? s.skill}</span>
                <span className={`text-[10px] ${CAT_COLOR[s.category]}`}>{s.category}</span>
                <span className="ml-auto text-[11px] text-muted">
                  {s.count} 次 · 硬性 {s.mustCount} · 均权 {s.avgWeight.toFixed(1)}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                <div className="h-full rounded-full bg-accent" style={{ width: `${(s.count / maxCount) * 100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
        说明：内置样例是人工精编的岗位描述，不是爬虫抓取的真实招聘数据；导入的 JD 只存在你本机浏览器里，不上传服务器。
      </p>
    </main>
  );
}
