export const runtime = "nodejs";

import { NextResponse } from "next/server";

function sanitizeInputString(inputValue) {
  if (inputValue === null || inputValue === undefined) {
    return "";
  }
  return inputValue.toString().trim();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const searchQuery = sanitizeInputString(searchParams.get("q"));

  if (!searchQuery) {
    return NextResponse.json({ items: [] });
  }

  // 非公式のストア検索API (例: Storefront API) を叩く例
  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", searchQuery);
  url.searchParams.set("l", "japanese");
  url.searchParams.set("cc", "jp");
  url.searchParams.set("limit", "10"); // このAPIではlimitが効かない場合があるため、後で絞る

  const res = await fetch(url.toString(), {
    // 検索系はキャッシュさせない方が無難
    cache: "no-store",
    headers: {
      // 一部環境で弾かれにくくするため
      "User-Agent": "gemureco/1.0",
    },
  });

  let apiResponseBody;
  if (!res.ok) {
    try {
      apiResponseBody = await res.json();
    } catch (e) {
      apiResponseBody = { raw: await res.text() };
    }
    return NextResponse.json(
      { error: "Steam API error", status: res.status, body: apiResponseBody },
      { status: 500 },
    );
  }

  apiResponseBody = await res.json();

  let steamSearchResults = [];
  if (apiResponseBody && Array.isArray(apiResponseBody.items)) {
    steamSearchResults = apiResponseBody.items.map((steamGameItem) => {
      const { id, name, tiny_image } = steamGameItem;
      const appIdString = id ? String(id) : "";
      const storeUrl = appIdString
        ? `https://store.steampowered.com/app/${appIdString}/?l=japanese`
        : "";

      return {
        source: "steam",
        id: appIdString,
        title: sanitizeInputString(name || ""),
        imageUrl: sanitizeInputString(tiny_image || ""),
        url: storeUrl,
        releaseDate: "", // このAPIでは発売日が取れないことが多い
      };
    });
  }

  // 表示件数を絞る
  if (steamSearchResults.length > 10) {
    steamSearchResults.length = 10;
  }

  return NextResponse.json({ items: steamSearchResults });
}
