import rawJdSamples from "@/data/jd-samples.json";
import { SKILLS } from "./taxonomy";
import type { Jd, JdRequirement, Seniority } from "./types";

const CITY_RE = /(北京|上海|深圳|广州|杭州|成都|长沙|武汉|南京|西安|苏州|厦门|合肥|郑州|远程)/;
const SALARY_RE = /(\d{1,2}\s*[-~]\s*\d{1,2}\s*[Kk千万])/;
const SENIORITY_RULES: [RegExp, Seniority][] = [
  [/实习|在校|在校生/, "实习"],
  [/应届|校招|初级|无经验/, "应届/初级"],
  [/1\s*[-~]\s*3\s*年|一到三年/, "1-3年"],
  [/3\s*[-~]\s*5\s*年|三年以上|5\s*年以上/, "3-5年"],
];

/** 权重线索：JD 里的措辞强度决定权重，而不是我拍脑袋 */
const CORE_HINT = /(精通|必须|硬性|掌握|熟练|深入)/;
const NICE_HINT = /(加分|优先|了解|接触过|最好)/;

type Tuple = [string, 1 | 2 | 3, boolean];

interface RawSample {
  id: string;
  title: string;
  city: string;
  seniority: Seniority;
  salary?: string;
  source: Jd["source"];
  raw: string;
  requirements: Tuple[];
}

/** 把人工精编的词表样例转成领域对象（JSON 存元组是为了体积和可读性） */
export function loadJdSamples(): Jd[] {
  return (rawJdSamples as RawSample[]).map((item) => ({
    id: item.id,
    title: item.title,
    city: item.city,
    seniority: item.seniority,
    salary: item.salary,
    source: item.source,
    requirements: item.requirements.map(([skill, weight, must]) => ({ skill, weight, must })),
  }));
}

/**
 * 粘贴文本 → JD 结构化。
 * 只做两件事：①推断基础字段 ②按技能词表找要求，并按措辞给权重。
 * 词表外的东西一律不猜——猜错比漏掉更伤，用户能看懂漏了什么。
 */
export function parseJdText(raw: string): Jd {
  const text = raw.replace(/\r/g, "").trim();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const head = lines.slice(0, 3).join(" ");

  const city = text.match(CITY_RE)?.[1] ?? "未标注";
  const salary = text.match(SALARY_RE)?.[1];
  const seniority = SENIORITY_RULES.find(([re]) => re.test(text))?.[1] ?? "应届/初级";

  const requirements = new Map<string, JdRequirement>();
  for (const line of lines) {
    for (const skill of SKILLS) {
      const aliases = [skill.id, ...skill.aliases];
      const hit = aliases.some((a) => line.toLowerCase().includes(a.toLowerCase()));
      if (!hit) continue;

      const weight: 1 | 2 | 3 = CORE_HINT.test(line) ? 3 : NICE_HINT.test(line) ? 1 : 2;
      const must = !NICE_HINT.test(line);
      const prev = requirements.get(skill.id);
      if (!prev || weight > prev.weight) requirements.set(skill.id, { skill: skill.id, weight, must });
    }
  }

  return {
    id: `imported-${Date.now()}`,
    title: head.slice(0, 40) || "未命名岗位",
    city,
    salary,
    seniority,
    source: "imported",
    requirements: [...requirements.values()],
  };
}

export function jdToText(jd: Jd): string {
  return [
    `${jd.title}｜${jd.city}${jd.salary ? "｜" + jd.salary : ""}｜${jd.seniority}`,
    "要求：" + jd.requirements.map((r) => r.skill + (r.must ? "(必须)" : "")).join("、"),
  ].join("\n");
}
