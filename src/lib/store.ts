import type { Jd, SkillCategory } from "./types";

/**
 * 本地存储：用户粘贴的 JD 与诊断记录只存在浏览器里。
 * 没有账户体系就没有服务端存储——隐私上也更干净。
 */
const JD_KEY = "offerlab.imported-jds.v1";
const RUN_KEY = "offerlab.runs.v1";

export interface RunRecord {
  at: string;
  jdTitle: string;
  score: number;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false; // 隐私模式/配额满：静默失败，不影响主流程
  }
}

function signature(jd: Jd): string {
  const skills = jd.requirements
    .map((r) => r.skill)
    .sort()
    .join(",");
  return `${jd.title}|${jd.city}|${skills}`;
}

export function loadImportedJds(): Jd[] {
  const list = read<Jd[]>(JD_KEY, []);
  return Array.isArray(list) ? list.filter((x) => x && Array.isArray(x.requirements)) : [];
}

/** 同标题+同城市+同技能集合视为同一条，重复粘贴不会灌水 */
export function saveImportedJd(jd: Jd): void {
  const existing = loadImportedJds();
  const sig = signature(jd);
  const kept = existing.filter((x) => signature(x) !== sig);
  write(JD_KEY, [{ ...jd, source: "imported" as const }, ...kept].slice(0, 50));
}

export function clearImportedJds(): void {
  write(JD_KEY, []);
}

export function saveRun(record: RunRecord): void {
  const list = read<RunRecord[]>(RUN_KEY, []);
  write(RUN_KEY, [record, ...(Array.isArray(list) ? list : [])].slice(0, 100));
}

export function loadRuns(): RunRecord[] {
  const list = read<RunRecord[]>(RUN_KEY, []);
  return Array.isArray(list) ? list : [];
}

export interface SkillStat {
  skill: string;
  count: number;
  mustCount: number;
  avgWeight: number;
  share: number;
  category: SkillCategory;
}

/** 词频聚合：按出现次数排序，同次数看硬性要求占比 —— 这才是"该学什么"的依据 */
export function aggregateSkills(jds: Jd[], labelOf: (id: string) => { label: string; category: SkillCategory } | undefined): SkillStat[] {
  const acc = new Map<string, { count: number; mustCount: number; weightSum: number }>();
  for (const jd of jds) {
    for (const req of jd.requirements) {
      const cur = acc.get(req.skill) ?? { count: 0, mustCount: 0, weightSum: 0 };
      cur.count += 1;
      cur.weightSum += req.weight;
      if (req.must) cur.mustCount += 1;
      acc.set(req.skill, cur);
    }
  }
  const total = jds.length || 1;
  return [...acc.entries()]
    .map(([skill, v]) => {
      const meta = labelOf(skill);
      return {
        skill,
        count: v.count,
        mustCount: v.mustCount,
        avgWeight: v.weightSum / v.count,
        share: v.count / total,
        category: meta?.category ?? ("通用" as SkillCategory),
      };
    })
    .sort((a, b) => b.count - a.count || b.mustCount - a.mustCount || a.skill.localeCompare(b.skill));
}
