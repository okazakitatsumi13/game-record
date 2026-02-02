export const runtime = "nodejs";

function normalize(str) {
  return (str ?? "").toString().trim();
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const q = normalize(searchParams.get("q"));

  if (!q) {
    return Response.json({ items: [] });
  }

  const url = new URL("https://store.steampowered.com/api/storesearch/");
  url.searchParams.set("term", q);
  url.searchParams.set("l", "japanese");
  url.searchParams.set("cc", "jp");
  url.searchParams.set("limit", "10");

  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: {
      // 一部環境で弾かれにくくするため
      "User-Agent": "gemureco/1.0",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: 500 });
  }

  const data = await res.json();

  const items = (data?.items ?? []).map((it) => {
    const appid = String(it.id ?? "");
    const storeUrl = appid
      ? `https://store.steampowered.com/app/${appid}/?l=japanese`
      : "";

    return {
      source: "steam",
      id: appid,
      title: normalize(it.name),
      imageUrl: normalize(it.tiny_image),
      url: storeUrl,
      releaseDate: "",
    };
  });

  return Response.json({ items });
}
