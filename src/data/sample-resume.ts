/**
 * 演示用简历（真实结构，非编造经历）：用来验证解析与证据分级是否工作。
 * 刻意保留"项目里有量化结果"和"只列名字"两类技能，方便对照两档证据等级。
 */
export const SAMPLE_RESUME = `胡世杰 ｜ 求职意向：AI 应用开发 / 前端开发 ｜ 长沙
电话 176-xxxx-xxxx ｜ 邮箱 hushijie@example.com

专业技能
熟悉 Python、JavaScript、TypeScript；了解 React、Vue、Tailwind CSS；熟悉 Flask、FastAPI、MySQL、Redis；
了解 RAG 检索增强、Embedding 向量检索、Prompt 工程；使用 Git 进行版本管理，了解 Docker 与 Linux 部署。

项目经历
心屿 MindCare —— 基于 RAG 与大语言模型的心理健康对话系统（毕业设计，独立完成）
负责后端与检索链路：基于 Flask + SQLAlchemy 搭建接口层，接入 DeepSeek 流式 SSE 对话；
使用 bge-small-zh-v1.5 对 49 条权威科普语料向量化，构建 FAISS 内积索引，Top-K=3；
设置双阈值（0.45 注入上下文 / 0.52 展示引用），把"答不上来"降级为普通对话，减少编造；
实现三级安全护栏与 DFA 词典扫描，危机等级下确定性注入求助渠道；
用 PyInstaller + 便携 MySQL 打包，双击即用，自动选择空闲端口。
结果：对话引用可追溯率 100%，危机话术不再依赖模型临场发挥；打包体积 571MB。

个人求职网站
使用 Vite + React 19 + TypeScript + Tailwind CSS 实现，含项目列表、详情、简历下载；
通过 dev proxy 解决第三方接口跨域，请求失败自动降级到本地快照，页面不白屏。

教育背景
长沙南方职业学院 ｜ 人工智能技术应用 ｜ 2027 届

自我评价
能独立完成从需求到部署的完整链路，习惯把踩过的坑写进文档。`;
