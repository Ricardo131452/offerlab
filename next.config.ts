import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // standalone：产出 node 可直接跑的独立服务，不依赖平台适配器。
  // 好处：Render / HuggingFace Spaces / Railway / 阿里云 / 自建 VM 全都能部署，
  // 不再被 Vercel 的手机号风控卡住。
  output: "standalone",
};

export default nextConfig;
