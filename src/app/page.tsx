"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";

const HeroCanvas = dynamic(() => import("@/components/hero-canvas"), { ssr: false });

const STEPS = [
  { n: "01", t: "放入简历", d: "PDF / TXT / Markdown，服务端内存解析，不落盘、不入库。" },
  { n: "02", t: "选一个岗位", d: "内置精编 JD 样例，也可以直接粘贴你正在投的那条。" },
  { n: "03", t: "看证据分级", d: "每项技能落在「缺失 / 只列名 / 用过 / 有量化结果」哪一档，逐条给原文。" },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.5, ease: "easeOut" as const },
  }),
};

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 h-[720px]" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <span className="font-display text-lg tracking-tight">
          Offer<span className="text-accent">Lab</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-sm text-muted transition-colors hover:text-accent">
            招聘看板
          </Link>
          <Link href="/jobs" className="text-sm text-muted transition-colors hover:text-accent">
            岗位词频
          </Link>
          <Link
            href="/analyze"
            className="rounded-full border border-line px-4 py-1.5 text-sm text-fg transition-colors hover:border-accent hover:text-accent"
          >
            开始诊断
          </Link>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pt-10 pb-24 md:grid-cols-[1.1fr_0.9fr]">
        <div>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={0} className="text-xs tracking-[0.2em] text-accent">
            简历 × JD 证据级匹配
          </motion.p>
          <motion.h1
            variants={fadeUp}
            initial="hidden"
            animate="show"
            custom={1}
            className="mt-4 text-4xl leading-[1.15] font-semibold tracking-tight sm:text-5xl"
          >
            你缺的不是关键词，
            <br />
            是<span className="text-accent">证据</span>。
          </motion.h1>
          <motion.p variants={fadeUp} initial="hidden" animate="show" custom={2} className="mt-5 max-w-xl text-sm leading-relaxed text-muted">
            把简历和岗位要求逐条对照，按「有没有被证明」而不是「有没有出现」打分。
            分数由规则与证据等级决定，可复现、可解释、不靠模型心情。
          </motion.p>
          <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3} className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/analyze"
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              免费诊断一次
            </Link>
            <a
              href="#how"
              className="rounded-full border border-line px-6 py-2.5 text-sm text-muted transition-colors hover:border-fg hover:text-fg"
            >
              看它怎么算
            </a>
          </motion.div>
        </div>

        <div className="relative h-[320px] w-full sm:h-[400px]">
          <HeroCanvas />
        </div>
      </section>

      <section id="how" className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.4 }}
              custom={i}
              className="rounded-xl border border-line bg-ink-2 p-5"
            >
              <div className="font-display text-xs text-accent">{s.n}</div>
              <h3 className="mt-3 text-base font-semibold">{s.t}</h3>
              <p className="mt-2 text-[13px] leading-relaxed text-muted">{s.d}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-line p-5">
          <p className="text-[12px] leading-relaxed text-muted">
            数据说明：内置 8 条人工精编的岗位样例（标注为「样例 JD」），用于演示匹配逻辑；你在页面里粘贴的 JD
            会作为「导入 JD」参与计算。简历只在请求内存中解析，不存储、不训练。
          </p>
        </div>
      </section>

      <footer className="relative border-t border-line px-6 py-8 text-center text-[11px] text-muted">
        OfferLab · Next.js 16 / React 19 / TypeScript / Tailwind v4 / R3F · 打分规则可复现
      </footer>
    </main>
  );
}
