import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITES = {
  emporium: {
    origin: "https://emporium.empresstrash.com",
    homePath: "/",
  },
} as const;

type SiteKey = keyof typeof SITES;

function isSiteKey(value: string): value is SiteKey {
  return value === "emporium";
}

function stripScripts(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]+rel=["'](?:modulepreload|preload)["'][^>]+as=["']script["'][^>]*>/gi, "");
}

/**
 * Printify sets frame-ancestors so a raw iframe of emporium.empresstrash.com is
 * blank. We proxy HTML, but <base href> would resolve /frame/... back onto
 * their origin and break product clicks. Keep assets on Printify; keep in-store
 * links on this origin.
 */
function prepareHtml(html: string, origin: string, site: SiteKey): string {
  const framePrefix = `/frame/${site}`;
  let next = html.replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
  next = stripScripts(next);

  next = next.replace(
    /((?:href|src)=["'])(\/_next\/[^"']+)(["'])/gi,
    `$1${origin}$2$3`,
  );

  next = next.replace(
    /href=(["'])(?:https:\/\/emporium\.empresstrash\.com)?(\/[^"']*)\1/gi,
    (full, quote: string, path: string) => {
      if (path.startsWith("/_next") || path.startsWith("/frame/")) return full;
      return `href=${quote}${framePrefix}${path}${quote}`;
    },
  );

  next = next.replace(
    /href=(["'])https:\/\/emporium\.empresstrash\.com\/?\1/gi,
    `href=$1${framePrefix}/$1`,
  );

  const stayInFrame = `<script>
(function(){
  var origin = ${JSON.stringify(origin)};
  var prefix = ${JSON.stringify(framePrefix)};
  document.addEventListener("click", function(e){
    var node = e.target;
    if (node && node.nodeType === 3) node = node.parentElement;
    var a = node && node.closest ? node.closest("a") : null;
    if (!a || !a.getAttribute("href")) return;
    try {
      var u = new URL(a.href, location.origin);
      var path = u.pathname + u.search + u.hash;
      if (u.origin === location.origin && path.indexOf(prefix) === 0) return;
      if (u.origin === origin || (u.origin === location.origin && path.indexOf("/product/") === 0)) {
        e.preventDefault();
        e.stopPropagation();
        location.href = prefix + (u.pathname || "/") + u.search + u.hash;
      }
    } catch (err) {}
  }, true);
})();
</script>`;

  if (/<head[^>]*>/i.test(next)) {
    return next.replace(/<head[^>]*>/i, (open) => `${open}${stayInFrame}`);
  }
  return `${stayInFrame}${next}`;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ site: string; path?: string[] }> },
) {
  const { site, path } = await context.params;
  if (!isSiteKey(site)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const config = SITES[site];
  const suffix = path?.length ? `/${path.join("/")}` : config.homePath;
  const target = new URL(suffix, config.origin);
  target.search = req.nextUrl.search;

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      redirect: "follow",
      headers: {
        accept: req.headers.get("accept") || "text/html,application/xhtml+xml",
        "accept-language": req.headers.get("accept-language") || "en-US,en;q=0.9",
        "user-agent":
          req.headers.get("user-agent") ||
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
  } catch {
    return new NextResponse("Embed upstream failed", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") || "text/html; charset=utf-8";
  const headers = new Headers();
  headers.set("content-type", contentType);
  headers.set("cache-control", "public, max-age=30");
  headers.set("x-frame-options", "SAMEORIGIN");

  if (contentType.includes("text/html")) {
    const html = prepareHtml(await upstream.text(), config.origin, site);
    return new NextResponse(html, { status: upstream.status, headers });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, { status: upstream.status, headers });
}
