import { extractText, getDocumentProxy } from "unpdf";
import { guard } from "@/lib/guard";

/**
 * 简历解析接口：文件只在内存里过一遍，不落盘、不入库。
 * 为什么放在服务端：pdfjs 的 worker 在客户端打包会多出 ~1MB，且不同浏览器
 * canvas 字体差异会导致同一份 PDF 抽出不同文本——求职报告的输入必须是确定的。
 */
export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: Request) {
  const blocked = guard(req, { scope: "resume", limit: 10 });
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "请求格式错误，需要 multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "没有收到文件字段 file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: `文件超过 5MB（当前 ${(file.size / 1024 / 1024).toFixed(1)}MB）` }, { status: 413 });
  }

  const buf = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      const text = new TextDecoder("utf-8").decode(buf);
      return Response.json({ text, pages: 1, chars: text.length, kind: "text" });
    }
    if (!name.endsWith(".pdf")) {
      return Response.json({ error: "目前支持 .pdf / .txt / .md" }, { status: 415 });
    }

    const pdf = await getDocumentProxy(buf);
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    const normalized = text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();

    if (normalized.length < 80) {
      return Response.json(
        { error: "PDF 里几乎没抽到文字，可能是扫描件/图片型简历——需要 OCR，当前版本不支持。" },
        { status: 422 },
      );
    }
    return Response.json({ text: normalized, pages: totalPages, chars: normalized.length, kind: "pdf" });
  } catch (err) {
    return Response.json(
      { error: `解析失败：${err instanceof Error ? err.message : String(err)}` },
      { status: 500 },
    );
  }
}
