# 部署一页纸（不需要国外手机号）

> Vercel 对新账号做手机号风控，国内号基本过不了。本项目已改成 `output: "standalone"` + `Dockerfile`，
> 下面两个平台都不需要国外号码，且都有永久链接。

## 方案对比

| 平台 | 注册 | 费用 | 域名 | 适合 |
|---|---|---|---|---|
| **HuggingFace Spaces** | 邮箱（QQ 邮箱即可） | 免费 CPU 2vCPU/16G | `https://<user>-<space>.hf.space` | 最快，推荐先上这个 |
| **Render** | GitHub 登录 | 免费实例（15 分钟无访问会休眠） | `https://<name>.onrender.com` | 想挂 GitHub 徽章 / 自定义域名 |
| Railway / Zeabur | GitHub 登录 | 免费额度小 | 自定 | 备选 |
| 阿里云 / 腾讯云 | 实名 + 备案 | 收费 | 自有域名 | 长期正式站 |

## 方案一：HuggingFace Spaces（5 分钟）

1. https://huggingface.co/join 用邮箱注册（不需要手机号）
2. 右上角 New → **Space**
   - Space name：`offerlab`
   - License：MIT
   - **SDK 选 Docker** → 选 Blank
   - Hardware：CPU basic（免费）
3. **把 Space 的 README.md 换成下面这份**（HF 靠 frontmatter 识别 Docker，缺了会导致构建失败）：

```markdown
---
title: OfferLab
emoji: 🎯
colorFrom: green
colorTo: gray
sdk: docker
app_port: 3000
pinned: false
---

简历 × JD 的证据级匹配工具：按「缺失 / 仅列名 / 有场景 / 有量化」四档给技能分级打分。
```

4. 上传代码：仓库根目录（与 `Dockerfile` 同级）上传本项目内容，**排除** `node_modules`、`.next`、`.git`。
   - 网页上传：Files → Add file → Upload files，把解压后的内容拖进去
   - 或者用 git（把 `https://huggingface.co/spaces/<user>/offerlab` 当远端）
5. 等 3~5 分钟构建，日志出现 `Ready` 后访问 Space 页面里的 App 链接

> 若构建报 `port` 相关错误：确认 README 里 `app_port: 3000` 与 Dockerfile 的 `ENV PORT=3000` 一致。

## 方案二：Render（3 分钟，需要先有 GitHub 仓库）

1. 仓库根目录已带 `render.yaml`，Render 会自动读
2. https://dashboard.render.com → New → **Blueprint** → 连你的 GitHub 仓库
3. 它自动创建 web service（runtime: docker），首次构建约 5 分钟
4. 环境变量在 Dashboard → Environment 填（可选）：
   - `LLM_API_KEY`：开模型版；不填走规则版，功能完整
   - `API_ACCESS_TOKEN`：开鉴权；访问时用 `https://<域名>/?t=<token>` 打开一次

## 部署后自检（30 秒）

```bash
# 1) 三个页面
curl -I https://<你的域名>/            # 200
curl -I https://<你的域名>/analyze     # 200
curl -I https://<你的域名>/jobs        # 200

# 2) 静态资产
curl -I https://<你的域名>/models/hero-orb.glb   # 200, content-type: model/gltf-binary

# 3) 接口（无鉴权时）
curl -s -X POST https://<你的域名>/api/resume -F "file=@简历.txt" | head -c 200

# 4) 有鉴权时：无 token 必须 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://<你的域名>/api/advise \
  -H "content-type: application/json" -d '{"resumeText":"...","jd":{}}'
```

全部通过后，把链接填进简历：

> **OfferLab ｜ 简历与岗位证据级匹配工具**（在线演示：`https://...` ｜ GitHub）

## 已知限制

- HF 免费 CPU 实例冷启动约 10~30 秒（首次访问慢，属正常）
- Render 免费实例 15 分钟无访问会休眠，下次访问唤醒约 20 秒
- 内存限流在多实例下不精确（单实例够用）
