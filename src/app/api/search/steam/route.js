export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { sanitizeInputString } from "@/lib/sanitize";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const searchQuery = sanitizeInputString(searchParams.get("q"));
  if (!searchQuery) return NextResponse.json({ items: [] });

  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", searchQuery);
  url.searchParams.set("l", "japanese");
  url.searchParams.set("cc", "jp");
  url.searchParams.set("limit", "10");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { "User-Agent": "gemureco/1.0" },
  });

  if (!res.ok) {
    let body;
    try {
      body = await res.json();
    } catch {
      body = { raw: await res.text() };
    }
    return NextResponse.json(
      { error: "Steam API error", status: res.status, body },
      { status: 500 },
    );
  }

  const data = await res.json();

  const items = (data?.items ?? []).slice(0, 10).map((item) => {
    const appId = item.id ? String(item.id) : "";
    return {
      source: "steam",
      id: appId,
      title: sanitizeInputString(item.name),
      imageUrl: sanitizeInputString(item.tiny_image),
      url: appId
        ? `https://store.steampowered.com/app/${appId}/?l=japanese`
        : "",
      releaseDate: "",
    };
  });

  return NextResponse.json({ items });
}
