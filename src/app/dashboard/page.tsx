"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Chart } from "@/components/chart";
import raw from "@/data/companies.json";

/**
 * 招聘数据看板：数据来自 2026 届校园双选会的两个真实 Excel（131 家企业 / 29 条带岗位信息的记录），
 * 不是爬虫数据。页面只做统计与可视化，不改数据，所有口径都写在页面底部。
 */
interface Job {
  title: string;
  headcount: number;
  major: string;
  address: string;
  internPay: string;
  regularPay: string;
  type: string;
  region: string;
  internPayValue: number | null;
  regularPayValue: number | null;
}
interface Company {
  name: string;
  region: string;
  jobs: Job[];
}
interface Payload {
  meta: { source: string; companies: number; withJobs: number; jobs: number; note: string };
  companies: Company[];
}

const data = raw as Payload;

const AXIS = { axisLabel: { color: "#9aa1b1", fontSize: 10 }, axisLine: { lineStyle: { color: "#23262f" } } };
const GRID = { left: 90, right: 24, top: 24, bottom: 28 };
const TOOLTIP = { backgroundColor: "#101218", borderColor: "#23262f", textStyle: { color: "#eceef4", fontSize: 11 } };

export default function DashboardPage() {
  const stats = useMemo(() => {
    const companies = data.companies;
    const jobs = companies.flatMap((c) => c.jobs.map((j) => ({ ...j, company: c.name })));

    const countBy = <T,>(items: T[], key: (i: T) => string) => {
      const m = new Map<string, number>();
      for (const it of items) m.set(key(it), (m.get(key(it)) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };

    const typeCount = countBy(jobs, (j) => j.type);
    const regionCount = countBy(jobs, (j) => j.region);

    // 各类型岗位的实习/转正月薪中位数（只统计能解析出数字的）
    const types = typeCount.map(([t]) => t);
    const salary = types.map((t) => {
      const ofType = jobs.filter((j) => j.type === t);
      const avg = (key: "internPayValue" | "regularPayValue") => {
        const nums = ofType.map((j) => j[key]).filter((v): v is number => typeof v === "number" && v > 0);
        return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
      };
      return { type: t, intern: avg("internPayValue"), regular: avg("regularPayValue") };
    });

    const headcountTop = companies
      .filter((c) => c.jobs.length > 0)
      .map((c) => ({ name: c.name, total: c.jobs.reduce((a, j) => a + j.headcount, 0) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    const localJobs = jobs.filter((j) => ["长沙", "湘潭", "株洲", "岳阳", "益阳", "娄底"].includes(j.region)).length;
    const aiRelated = jobs.filter((j) => ["视觉/算法", "标注/数据", "软件开发", "测试"].includes(j.type)).length;

    return { jobs, totalJobs: jobs.length, typeCount, regionCount, salary, headcountTop, localJobs, aiRelated };
  }, []);

  const typeOption = {
    tooltip: { ...TOOLTIP, trigger: "item" },
    legend: { bottom: 0, textStyle: { color: "#9aa1b1", fontSize: 10 }, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["42%", "66%"],
        center: ["50%", "44%"],
        itemStyle: { borderColor: "#08090c", borderWidth: 2 },
        label: { color: "#eceef4", fontSize: 10 },
        data: stats.typeCount.map(([name, value]) => ({ name, value })),
      },
    ],
  } as const;

  const salaryOption = {
    tooltip: { ...TOOLTIP, trigger: "axis" },
    legend: { top: 0, textStyle: { color: "#9aa1b1", fontSize: 10 }, icon: "roundRect" },
    grid: { ...GRID, left: 44, top: 32 },
    xAxis: { type: "category", data: stats.salary.map((s) => s.type), ...AXIS, axisLabel: { ...AXIS.axisLabel, interval: 0, rotate: 20 } },
    yAxis: { type: "value", name: "元/月", nameTextStyle: { color: "#9aa1b1", fontSize: 10 }, ...AXIS, splitLine: { lineStyle: { color: "#1a1d24" } } },
    series: [
      { name: "实习", type: "bar", barMaxWidth: 18, itemStyle: { color: "#c8ff4d", borderRadius: [3, 3, 0, 0] }, data: stats.salary.map((s) => s.intern) },
      { name: "转正", type: "bar", barMaxWidth: 18, itemStyle: { color: "#0f766e", borderRadius: [3, 3, 0, 0] }, data: stats.salary.map((s) => s.regular) },
    ],
  } as const;

  const headcountOption = {
    tooltip: { ...TOOLTIP, trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { ...GRID, left: 150 },
    xAxis: { type: "value", ...AXIS, splitLine: { lineStyle: { color: "#1a1d24" } } },
    yAxis: {
      type: "category",
      data: stats.headcountTop.map((h) => (h.name.length > 9 ? h.name.slice(0, 9) + "…" : h.name)).reverse(),
      ...AXIS,
    },
    series: [
      {
        type: "bar",
        barMaxWidth: 14,
        itemStyle: { color: "#9aa1b1", borderRadius: [0, 3, 3, 0] },
        data: stats.headcountTop.map((h) => h.total).reverse(),
      },
    ],
  } as const;

  const regionOption = {
    tooltip: { ...TOOLTIP, trigger: "axis" },
    grid: { ...GRID, left: 44 },
    xAxis: { type: "category", data: stats.regionCount.map(([r]) => r), ...AXIS, axisLabel: { ...AXIS.axisLabel, interval: 0, rotate: 30 } },
    yAxis: { type: "value", ...AXIS, splitLine: { lineStyle: { color: "#1a1d24" } } },
    series: [
      {
        type: "bar",
        barMaxWidth: 16,
        itemStyle: { color: "#c8ff4d", borderRadius: [3, 3, 0, 0] },
        data: stats.regionCount.map(([, v]) => v),
      },
    ],
  } as const;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="flex items-center justify-between border-b border-line pb-5">
        <Link href="/" className="font-display text-lg">
          Offer<span className="text-accent">Lab</span>
        </Link>
        <div className="flex items-center gap-4 text-[11px] text-muted">
          <Link href="/analyze" className="hover:text-accent">去诊断</Link>
          <Link href="/jobs" className="hover:text-accent">技能词频</Link>
        </div>
      </header>

      <div className="mt-8">
        <h1 className="text-2xl font-semibold tracking-tight">校招岗位数据看板</h1>
        <p className="mt-2 max-w-3xl text-[12px] leading-relaxed text-muted">
          数据来自 2026 届校园双选会的两份真实 Excel：{data.meta.companies} 家企业、{data.meta.withJobs} 家提供岗位明细、共 {data.meta.jobs} 条岗位记录。
          用途是回答一个问题：<span className="text-fg">这份名单里到底有什么岗位，值不值得投。</span>
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {[
          { k: "岗位记录", v: stats.totalJobs, d: `覆盖 ${data.meta.withJobs} 家企业` },
          { k: "湖南本地岗位", v: stats.localJobs, d: "长沙/湘潭/株洲/岳阳等" },
          { k: "与 AI/软件相关", v: stats.aiRelated, d: "测试·标注·视觉·软件开发" },
        ].map((c) => (
          <div key={c.k} className="rounded-xl border border-line bg-ink-2 p-4">
            <div className="text-[11px] text-muted">{c.k}</div>
            <div className="mt-1 font-display text-2xl text-accent">{c.v}</div>
            <div className="mt-1 text-[11px] text-muted">{c.d}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-line bg-ink-2 p-4">
          <h2 className="mb-2 text-sm font-semibold">岗位类型分布</h2>
          <Chart option={typeOption} height={280} />
        </section>
        <section className="rounded-xl border border-line bg-ink-2 p-4">
          <h2 className="mb-2 text-sm font-semibold">实习 vs 转正月薪（区间中位数）</h2>
          <Chart option={salaryOption} height={280} />
        </section>
        <section className="rounded-xl border border-line bg-ink-2 p-4">
          <h2 className="mb-2 text-sm font-semibold">招聘人数 Top 8 企业</h2>
          <Chart option={headcountOption} height={280} />
        </section>
        <section className="rounded-xl border border-line bg-ink-2 p-4">
          <h2 className="mb-2 text-sm font-semibold">岗位地区分布</h2>
          <Chart option={regionOption} height={280} />
        </section>
      </div>

      <p className="mt-8 border-t border-line pt-4 text-[11px] leading-relaxed text-muted">
        统计口径：{data.meta.note}。薪资只统计能解析出数字的区间（“面议/计件”不计入），取区间中位数后按岗位类型求平均。
        页面不含任何推断数据，全部来自两份 Excel。
      </p>
    </main>
  );
}
