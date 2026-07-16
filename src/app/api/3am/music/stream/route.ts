import { isAllowedStreamUrl } from "@/threeam/audio/logic";

export async function GET(req: Request) {
  const u = new URL(req.url).searchParams.get("u");
  if (!u || !isAllowedStreamUrl(u)) {
    return new Response("bad target", { status: 400 });
  }
  let upstream: Response;
  try {
    upstream = await fetch(u, { cache: "no-store" });
  } catch {
    return new Response("upstream failed", { status: 502 });
  }
  if (!upstream.ok || !upstream.body) {
    return new Response("upstream failed", { status: 502 });
  }
  if (!isAllowedStreamUrl(upstream.url)) {
    return new Response("upstream failed", { status: 502 });
  }
  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "audio/mp4",
      "cache-control": "public, max-age=86400, immutable",
    },
  });
}
