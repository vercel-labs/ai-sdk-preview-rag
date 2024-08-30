import type { NextFetchEvent, NextRequest } from "next/server";
import { kasadaHandler } from "@/lib/kasada/kasada-server";
import { kv } from "@vercel/kv";

const MAX_REQUESTS = 20;

export async function middleware(req: NextRequest, ev: NextFetchEvent) {
  if (req.method === "POST") {
    const realIp = req.headers.get("x-real-ip") || "no-ip";
    const pipeline = kv.pipeline();

    pipeline.incr(`rate-limit:${realIp}`);
    pipeline.expire(`rate-limit:${realIp}`, 60 * 60 * 24, "NX");

    const [requests] = (await pipeline.exec()) as [number];

    if (process.env.NODE_ENV === "development") {
      return undefined;
    }

    if (requests > MAX_REQUESTS) {
      return new Response("Too many requests", { status: 429 });
    }

    return kasadaHandler(req, ev);
  }
}

export const config = {
  matcher: ["/"],
};