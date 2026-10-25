import { timingSafeEqual } from "node:crypto";

/**
 * 接口守卫：鉴权 + 限流。
 *
 * 已知局限（写在代码里而不是藏在注释里）：
 * - 计数存在进程内存里，多实例部署时每个实例各算一份，不是全局精确限流；
 *   要精确得上 Redis/Upstash。对"防止被白嫖 token"这个目标，内存版足够。
 * - 鉴权是单 token 模式，够个人项目用；要做多用户得换成会话/JWT。
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 5000; // 防止被刷爆内存

function jsonError(message: string, status: number, extraHeaders: Record<string, string> = {}): Response {
  return Response.json({ error: message }, { status, headers: { "cache-control": "no-store", ...extraHeaders } });
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export interface GuardOptions {
  scope: string;
  /** 每窗口允许的请求数，默认 20 */
  limit?: number;
  /** 窗口长度，默认 60s */
  windowMs?: number;
}

/**
 * 通过返回 null；拦截返回一个可直接 return 的 Response。
 * 未配置 API_ACCESS_TOKEN 时不启用鉴权（本地开发/演示不设门槛）。
 */
export function guard(req: Request, opts: GuardOptions): Response | null {
  const expected = process.env.API_ACCESS_TOKEN?.trim();
  if (expected) {
    const given = req.headers.get("x-access-token")?.trim() ?? "";
    if (!given || !safeEqual(given, expected)) {
      return jsonError("未授权：请求头 x-access-token 缺失或不匹配", 401);
    }
  }

  const limit = opts.limit ?? 20;
  const windowMs = opts.windowMs ?? 60_000;
  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0]!.trim() || "local";
  const key = `${opts.scope}:${ip}`;
  const now = Date.now();

  if (buckets.size > MAX_KEYS) buckets.clear();

  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return jsonError(`请求过于频繁：每分钟最多 ${limit} 次，请 ${retryAfter} 秒后再试`, 429, {
      "retry-after": String(retryAfter),
    });
  }
  return null;
}
