# OfferLab

> 简历 × JD 的**证据级**匹配：不看关键词出现过没有，只看它**被证明到什么程度**。

## 它解决什么问题

求职者最常做的两件事，恰好都没什么用：

1. 把 JD 里的词全部塞进简历（关键词堆砌）——ATS 分数上去了，面试一问就露；
2. 拿一份通用简历投 100 个岗位——匹配度自己都说不清。

OfferLab 把"匹配"拆成可解释的四档证据等级，逐条给原文出处，再告诉你怎么把弱证据补成强证据。

| 等级 | 含义 | 处理方式 |
|---|---|---|
| 0 缺失 | JD 提到，简历完全没有 | 补最小可交付项目，或换岗位 |
| 1 仅列名 | 只在「专业技能」里出现 | 补场景：用它做过什么 |
| 2 有场景 | 在项目经历里用过 | 补结果：提升/覆盖/下降了多少 |
| 3 强证据 | 项目里用过且有量化结果 | 提到简历最前面 |

## 功能

- **诊断**：上传 PDF / 粘贴简历 → 选或粘贴 JD → 四档报告 + 缺口补法 + 改写模板。
- **改写建议（流式）**：服务端重算报告后交给 LLM 润色；无 Key 自动回退规则版。
- **模拟面试（流式多轮）**：面试官专挑「有场景没结果」「只列名字」的技能追问。
- **岗位词频看板**：把你导入的 JD 与内置样例聚合，按「出现次数 → 硬性占比」排序。

## 关键设计（为什么这样写）

- **打分是确定性的**：同一简历 + 同一 JD 永远得同一个分。规则为 `Σ(w × must权重 × level/3) / Σ(w × must权重)`，不含 LLM 随机性——用户才能验证，面试官才能追问。
- **LLM 不参与打分**：它只适合把结构化结论讲成人话；一旦让它打分，结论就不可复现、不可解释。
- **服务端重算报告**：`/api/advise`、`/api/interview` 只接收「简历 + JD」，报告由服务端重新计算。客户端无法伪造分数，UI 与 LLM 看到的是同一份结论。
- **流式是自己写的**：不引 openai/langchain，手写 `fetch` + SSE 解析（半包缓冲、`[DONE]`、HTTP 200 但流内 error 的上游）。
- **长词优先 + 单词边界**：词表按长度倒序匹配，拉丁词加边界断言，避免 `go` 命中 `django`、`ts` 命中 `artifacts`。
- **简历分段是启发式的**：只认「专业技能 / 项目经历 / 教育背景」这类常见小标题。分段失败时退化为全文扫描，并在报告里明确提示——宁可提示，不要静默给错分。
- **简历不出内存**：`/api/resume` 只做一次解析，不落盘、不入库；导入的 JD 存浏览器 localStorage。

## 技术栈

Next.js 16（App Router / Turbopack）· React 19 · TypeScript · Tailwind CSS v4 · framer-motion · react-three-fiber + drei · unpdf · zod

## 目录

```
src/
  app/
    page.tsx                门面：定位、三步说明、3D hero
    analyze/page.tsx        主流程：上传简历 → 选 JD → 报告 + 建议 + 面试
    jobs/page.tsx           岗位技能词频看板
    api/resume/route.ts     PDF/TXT → 纯文本（仅内存）
    api/advise/route.ts     改写建议：SSE 流式，无 Key 回退规则版
    api/interview/route.ts  模拟面试：SSE 流式多轮
  components/
    hero-canvas.tsx         R3F 门面（程序化几何，无外部资产）
    report-view.tsx         证据分环 + 四档分组
    advice-panel.tsx        流式建议面板
    interview-panel.tsx     多轮面试面板
  lib/
    taxonomy.ts             技能词表与别名归一（47 项技能）
    match.ts                分段、证据分级、加权打分
    jd.ts                   JD 文本 → 结构化要求
    advice.ts               缺口补法 / 改写模板（规则生成）
    llm.ts                  OpenAI 兼容客户端 + SSE 解析
    prompt.ts               prompt 组装与事实清单
    api-schema.ts           zod 请求校验 + 服务端重算入口
    store.ts                localStorage：导入 JD / 诊断记录
    types.ts                领域模型
  data/
    jd-samples.json         8 条人工精编岗位样例
    sample-resume.ts        演示简历（真实结构）
```

## 本地运行

```bash
npm install
cp .env.example .env.local   # 可选：不配也能跑（规则版）
npm run dev                  # http://localhost:3000
npm run build                # 生产构建
npm run typecheck            # tsc --noEmit
```

环境变量（全部可选）：

| 变量 | 默认 | 说明 |
|---|---|---|
| `LLM_API_KEY` | 空 | 为空则走规则版；也接受 `DEEPSEEK_API_KEY` / `OPENAI_API_KEY` |
| `LLM_BASE_URL` | `https://api.deepseek.com/v1` | 任意 OpenAI 兼容端点 |
| `LLM_MODEL` | `deepseek-chat` | 模型名 |

> Windows 沙箱注意：npm 的 cache 必须指向工作区内，否则 `EPERM`；`next build` 需要能 spawn 子进程。

## 部署（不依赖 Vercel）

Vercel 对新账号做手机号风控，国内号码基本过不了。所以本项目用 `output: "standalone"` + `Dockerfile`，**任何能跑 Node 或 Docker 的平台都能部署**。

| 平台 | 是否需要手机号 | 难度 | 备注 |
|---|---|---|---|
| **Hugging Face Spaces**（Docker） | 否，邮箱注册即可 | 低 | 永久域名 `https://<用户名>-<space>.huggingface.co`，免费 CPU 够用 |
| **Render**（Docker / Blueprint） | 否，GitHub 登录 | 低 | 仓库里有 `render.yaml`，连上仓库即自动建服务 |
| Railway / Zeabur | 否 | 低 | 免费额度小，可能要求绑卡 |
| 阿里云 / 腾讯云 | 实名 | 中 | 长期最稳，但备案要 2~3 周 |
| Vercel | **是**（风控） | 低 | 有国外号码才顺 |

三种部署方式，任选其一：

```bash
# 1) 本机验证 standalone 产物（等价于线上行为）
npm run build
mkdir -p .next/standalone/.next && cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
cd .next/standalone && PORT=3200 node server.js

# 2) Docker（Render / HF Spaces / 任意云主机都吃这个）
docker build -t offerlab . && docker run -p 3000:3000 offerlab

# 3) Vercel（有国外号码时）
vercel --prod
```

环境变量（不配则自动规则版，功能完整）：

| 变量 | 作用 |
|---|---|
| `LLM_API_KEY` / `LLM_BASE_URL` / `LLM_MODEL` | 开启模型版改写与面试 |
| `API_ACCESS_TOKEN` | 开启接口鉴权，访问时用 `?t=<token>` 打开一次 |

`.env.local` 已在 `.gitignore` 里，密钥不会进仓库。

## 已存在的验证

- `tsc --noEmit` 通过；`next build` 通过。
- 匹配引擎 12 条断言全过：确定性、分数区间、硬性覆盖、缺失项识别、证据等级、单调性（补量化证据后 54→71）、四档划分互斥完备、`django` 不误命中 `go`。
- 真实冒烟：`/`、`/analyze`、`/jobs` 返回 200；`POST /api/resume` 正确抽文本；`POST /api/advise`、`POST /api/interview` 在无 Key 下返回规则版文本。
- 流式链路用本地 mock 的 OpenAI 兼容服务验证：能按 chunk 增量到达，`x-llm-mode: model`。

## 已知限制（诚实清单）

- 内置 8 条 **人工精编样例**，不是爬取的真实 JD；产品里明确标注「样例 JD」，真实岗位请用「粘贴 JD」导入。
- 扫描件/图片型简历不支持（需 OCR）。
- 无服务端持久化：导入 JD 与诊断记录只存浏览器 localStorage，换设备不可迁移。
- 词表 47 项，覆盖常见前后端/AI 岗，冷门技术不参与打分（宁缺毋滥，避免无法解释的分数）。
- 3D 目前是程序化几何；Blender 资产接入点已预留（替换 `hero-canvas.tsx` 中的 mesh 为 `useGLTF`）。

## 路线图

1. 报告导出 PDF / 分享链接（当前报告只能看，不能带走）。
2. JD 批量导入（一次粘贴多条，词频样本才够大）。
3. 面试录音/转写，复盘用词问题。
4. Blender 低模资产（glb < 2MB）替换程序化几何。
