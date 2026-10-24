import { z } from "zod";
import type { Jd } from "./types";

/**
 * 请求体校验：客户端只传「简历原文 + JD」，**报告由服务端重算**。
 * 这样前端无法伪造分数，也保证 UI 与 LLM 看到的是同一份结论。
 */
const zRequirement = z.object({
  skill: z.string().min(1).max(64),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  must: z.boolean(),
});

const zJd = z.object({
  id: z.string().min(1).max(120),
  title: z.string().min(1).max(120),
  city: z.string().min(1).max(40),
  seniority: z.enum(["实习", "应届/初级", "1-3年", "3-5年"]),
  salary: z.string().max(40).optional(),
  source: z.enum(["curated-sample", "imported"]),
  requirements: z.array(zRequirement).max(80),
});

export const zAdviseBody = z.object({
  resumeText: z.string().min(20, "简历太短").max(30_000),
  jd: zJd,
});

export const zInterviewBody = z.object({
  resumeText: z.string().min(20).max(30_000),
  jd: zJd,
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(20)
    .default([]),
});

export function parseBody<T>(schema: z.ZodType<T>, raw: unknown): { ok: true; data: T } | { ok: false; error: string } {
  const parsed = schema.safeParse(raw);
  if (parsed.success) return { ok: true, data: parsed.data };
  const first = parsed.error.issues[0];
  return { ok: false, error: `参数不合法：${first?.path.join(".") ?? ""} ${first?.message ?? ""}`.trim() };
}

/** zod 输出 → 领域对象（salary 可选、字面量类型对齐） */
export function toJd(v: z.infer<typeof zJd>): Jd {
  return {
    id: v.id,
    title: v.title,
    city: v.city,
    seniority: v.seniority,
    salary: v.salary,
    source: v.source,
    requirements: v.requirements,
  };
}

export const TEXT_HEADERS = {
  "content-type": "text/plain; charset=utf-8",
  "cache-control": "no-store, no-transform",
  "x-accel-buffering": "no",
} as const;
