import type { SkillDef } from "./types";

/**
 * 技能词表：把 JD / 简历里的各种写法归一到同一个 id。
 * 只收「招聘 JD 里真实高频出现」的词，不做大而全——词表越大，误匹配越多。
 * 格式：[id, label, category, aliases]
 */
const RAW: [string, string, SkillDef["category"], string[]][] = [
  // 前端
  ["react", "React", "前端", ["react.js", "reactjs"]],
  ["vue", "Vue", "前端", ["vue.js", "vuejs", "vue3"]],
  ["next.js", "Next.js", "前端", ["nextjs", "next js"]],
  ["nuxt", "Nuxt", "前端", ["nuxt.js", "nuxtjs"]],
  ["typescript", "TypeScript", "前端", ["ts", "type script"]],
  ["javascript", "JavaScript", "前端", ["js", "es6", "ecmascript"]],
  ["tailwind", "Tailwind CSS", "前端", ["tailwindcss", "tailwind css"]],
  ["vite", "Vite", "前端", ["vitejs"]],
  ["webpack", "Webpack", "前端", ["打包配置"]],
  ["html", "HTML/CSS", "前端", ["html5", "css3", "css", "h5"]],
  ["three.js", "Three.js", "前端", ["threejs", "three", "webgl", "r3f", "react-three-fiber"]],
  ["gsap", "GSAP", "前端", ["scrolltrigger", "greensock"]],
  ["framer-motion", "Framer Motion", "前端", ["framer motion", "motion"]],
  ["astro", "Astro", "前端", ["astrojs"]],
  // 后端
  ["node.js", "Node.js", "后端", ["nodejs", "node"]],
  ["python", "Python", "后端", []],
  ["fastapi", "FastAPI", "后端", []],
  ["flask", "Flask", "后端", []],
  ["django", "Django", "后端", []],
  ["java", "Java", "后端", ["springboot", "spring boot", "spring"]],
  ["go", "Go", "后端", ["golang"]],
  ["express", "Express", "后端", ["express.js"]],
  ["nestjs", "NestJS", "后端", ["nest.js"]],
  ["mysql", "MySQL", "后端", ["sql", "关系型数据库"]],
  ["postgresql", "PostgreSQL", "后端", ["postgres", "pg"]],
  ["redis", "Redis", "后端", []],
  ["mongodb", "MongoDB", "后端", ["mongo"]],
  ["nginx", "Nginx", "后端", []],
  // AI
  ["llm", "大语言模型应用", "AI", ["大语言模型", "大模型", "large language model", "chatgpt", "gpt"]],
  ["rag", "RAG 检索增强", "AI", ["检索增强", "retrieval augmented"]],
  ["prompt", "Prompt 工程", "AI", ["提示词", "prompt engineering"]],
  ["agent", "Agent 智能体", "AI", ["智能体", "function calling", "tool calling"]],
  ["embedding", "向量化 / Embedding", "AI", ["向量检索", "语义检索", "bge"]],
  ["faiss", "FAISS", "AI", ["向量索引"]],
  ["langchain", "LangChain", "AI", []],
  ["llamaindex", "LlamaIndex", "AI", ["llama index"]],
  ["pytorch", "PyTorch", "AI", ["torch"]],
  ["transformers", "Transformers", "AI", ["huggingface", "hf"]],
  ["pandas", "Pandas", "数据", ["dataframe"]],
  ["numpy", "NumPy", "数据", []],
  ["spider", "爬虫", "数据", ["scrapy", "requests", "数据采集"]],
  ["echarts", "数据可视化", "数据", ["图表", "可视化", "chart"]],
  // 工程化
  ["git", "Git", "工程化", ["github", "gitlab", "版本控制"]],
  ["docker", "Docker", "工程化", ["容器化", "容器"]],
  ["linux", "Linux", "工程化", ["shell", "bash"]],
  ["ci", "CI/CD", "工程化", ["github actions", "自动化部署", "持续集成"]],
  ["vercel", "Vercel", "工程化", ["部署上线"]],
  ["testing", "单元测试", "工程化", ["jest", "vitest", "pytest", "测试用例"]],
  ["perf", "性能优化", "工程化", ["首屏", "lighthouse", "加载优化"]],
  // 通用
  ["communication", "沟通协作", "通用", ["团队协作", "跨部门"]],
  ["writing", "技术文档", "通用", ["文档输出", "技术写作"]],
];

export const SKILLS: SkillDef[] = RAW.map(([id, label, category, aliases]) => ({
  id,
  label,
  category,
  aliases,
}));

export const SKILL_BY_ID = new Map(SKILLS.map((s) => [s.id, s]));

/** alias(小写) -> 规范 id。同一个 alias 只允许指向一个技能，冲突在构建期直接暴露。 */
export const ALIAS_INDEX: Map<string, string> = (() => {
  const index = new Map<string, string>();
  for (const skill of SKILLS) {
    for (const alias of [skill.id, ...skill.aliases]) {
      const key = alias.toLowerCase().trim();
      if (index.has(key) && index.get(key) !== skill.id) {
        throw new Error(`技能词表别名冲突: "${key}" -> ${index.get(key)} / ${skill.id}`);
      }
      index.set(key, skill.id);
    }
  }
  return index;
})();

/** 词表按长度倒序，保证 "next.js" 先于 "js" 命中（长词优先，避免子串误伤）。 */
export const ALIASES_BY_LENGTH = [...ALIAS_INDEX.keys()].sort((a, b) => b.length - a.length);

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
