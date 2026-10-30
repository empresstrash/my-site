"""Build the temporary /journal archive from a Paragraph posts export.

Writes data/journal/posts.json and data/journal/feed.xml.
Pictures stay on their existing public URLs (Paragraph's image host).
Copying them into this repo was about 700MB, mostly GIFs, which is too
big for a free Vercel deploy. Substack downloads each image when it imports.

Usage:
  python scripts/build-journal.py d:\\paragraph-posts-es5TVh5SEYo7JOsgMWm1.json
"""

from __future__ import annotations

import json
import re
import sys
import traceback
from datetime import datetime, timezone
from email.utils import format_datetime
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "journal"
SITE = "https://www.empresstrash.com"
FEED_PATH = "/journal/feed.xml"

# Tried on 2026-10-30. These are editor chrome or already gone.
DROP_IMAGES = {
    "https://paragraph.com/editor/youtube/play.png",
    "https://paragraph.com/editor/twitter/heart.png",
    "https://paragraph.com/editor/twitter/logo.png",
    "https://pbs.substack.com/media/Fq8-YQVaMAAAzic.png",
    "https://substackcdn.com/image/twitter_name/w_96/aaasonipse.jpg",
    "https://pbs.substack.com/media/Fp6IrviaYAERYZZ.jpg",
}


def esc(value: str) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def cdata(value: str) -> str:
    return "<![CDATA[" + value.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def youtube_watch(src: str) -> str | None:
    match = re.search(r"(?:youtube(?:-nocookie)?\.com/embed/|youtu\.be/)([\w-]{6,})", src or "")
    if not match:
        return None
    return f"https://www.youtube.com/watch?v={match.group(1)}"


def load_meta(raw):
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str) and raw.strip():
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


class Cleaner(HTMLParser):
    """Keep writing, images, and links. Drop embed chrome and blur placeholders."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.skip_tag: str | None = None
        self.skip_depth = 0
        self.stack: list[str] = []

    def begin_skip(self, tag: str) -> None:
        self.skip_tag = tag
        self.skip_depth = 1

    def handle_starttag(self, tag: str, attrs) -> None:
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth += 1
            return
        attr = {key: value or "" for key, value in attrs}
        if tag in ("script", "style", "svg", "noscript", "canvas", "form"):
            self.begin_skip(tag)
            return
        if tag == "iframe":
            src = attr.get("src", "")
            watch = youtube_watch(src)
            href = watch or (src if src.startswith("http") else "")
            if href:
                self.out.append(f'<p><a href="{esc(href)}">{esc(href)}</a></p>')
            self.begin_skip("iframe")
            return
        if tag == "div" and attr.get("data-type") == "embedly":
            self.out.append(render_embedly(attr.get("src", ""), attr.get("data", "")))
            self.begin_skip("div")
            return
        if tag == "img":
            src = attr.get("src", "")
            if src.startswith("http"):
                self.out.append(f'<img src="{esc(src)}" alt="{esc(attr.get("alt", ""))}">')
            return
        if tag == "a":
            href = attr.get("href", "").strip()
            if href.startswith("http://") or href.startswith("https://") or href.startswith("mailto:"):
                self.out.append(f'<a href="{esc(href)}">')
                self.stack.append("a")
            return
        if tag in ("br", "hr"):
            self.out.append(f"<{tag}>")
            return
        if tag == "figcaption":
            self.out.append("<p><em>")
            self.stack.append("figcaption")
            return
        if tag in ("p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "blockquote", "strong", "em", "u"):
            self.out.append(f"<{tag}>")
            self.stack.append(tag)
            return

    def handle_endtag(self, tag: str) -> None:
        if self.skip_tag:
            if tag == self.skip_tag:
                self.skip_depth -= 1
                if self.skip_depth <= 0:
                    self.skip_tag = None
                    self.skip_depth = 0
            return
        if tag == "figcaption" and self.stack and self.stack[-1] == "figcaption":
            self.stack.pop()
            self.out.append("</em></p>")
            return
        if self.stack and self.stack[-1] == tag:
            self.stack.pop()
            self.out.append(f"</{tag}>")

    def handle_data(self, data: str) -> None:
        if self.skip_tag or not data:
            return
        self.out.append(esc(data))

    def handle_entityref(self, name: str) -> None:
        if not self.skip_tag:
            self.out.append(f"&{name};")

    def handle_charref(self, name: str) -> None:
        if not self.skip_tag:
            self.out.append(f"&#{name};")


def render_embedly(src: str, raw) -> str:
    meta = load_meta(raw)
    title = str(meta.get("title") or "")
    thumb = str(meta.get("thumbnail_url") or meta.get("thumbnailUrl") or "")
    parts: list[str] = []
    if thumb.startswith("http"):
        parts.append(f'<p><img src="{esc(thumb)}" alt="{esc(title)}"></p>')
    if src.startswith("http"):
        parts.append(f'<p><a href="{esc(src)}">{esc(title or src)}</a></p>')
    return "".join(parts)


def clean_html(raw: str) -> str:
    parser = Cleaner()
    parser.feed(raw or "")
    parser.close()
    html = "".join(parser.out)
    return strip_empty(html)


def strip_empty(html: str) -> str:
    html = re.sub(r"<a href=\"[^\"]*\"></a>", "", html)
    previous = None
    while previous != html:
        previous = html
        html = re.sub(
            r"<(p|h[1-6]|li|blockquote|strong|em|u|ul|ol)>(?:\s|<br>)*</\1>",
            "",
            html,
        )
        html = re.sub(r"<p><em>\s*</em></p>", "", html)
    return html


def render_node(node) -> str:
    if isinstance(node, list):
        return "".join(render_node(child) for child in node)
    if not isinstance(node, dict):
        return ""
    kind = node.get("type")
    attrs = node.get("attrs") or {}
    inner = render_node(node.get("content") or [])
    if kind == "text":
        text = esc(node.get("text") or "")
        for mark in node.get("marks") or []:
            mark_type = mark.get("type")
            mark_attrs = mark.get("attrs") or {}
            if mark_type == "link":
                href = str(mark_attrs.get("href") or "")
                if href.startswith("http") or href.startswith("mailto:"):
                    text = f'<a href="{esc(href)}">{text}</a>'
            elif mark_type == "bold":
                text = f"<strong>{text}</strong>"
            elif mark_type == "italic":
                text = f"<em>{text}</em>"
            elif mark_type == "underline":
                text = f"<u>{text}</u>"
        return text
    if kind == "paragraph":
        return f"<p>{inner}</p>" if inner.strip() else ""
    if kind == "heading":
        try:
            level = int(attrs.get("level") or 2)
        except (TypeError, ValueError):
            level = 2
        level = min(6, max(2, level))
        return f"<h{level}>{inner}</h{level}>"
    if kind == "hardBreak":
        return "<br>"
    if kind == "horizontalRule":
        return "<hr>"
    if kind == "bulletList":
        return f"<ul>{inner}</ul>"
    if kind == "orderedList":
        return f"<ol>{inner}</ol>"
    if kind == "listItem":
        return f"<li>{inner}</li>"
    if kind == "blockquote":
        return f"<blockquote>{inner}</blockquote>"
    if kind == "figcaption":
        return f"<p><em>{inner}</em></p>" if inner.strip() else ""
    if kind == "image":
        src = str(attrs.get("src") or attrs.get("url") or "")
        alt = str(attrs.get("alt") or attrs.get("title") or "")
        href = str(attrs.get("href") or "")
        if not src.startswith("http"):
            return inner
        image = f'<img src="{esc(src)}" alt="{esc(alt)}">'
        if href.startswith("http"):
            return f'<p><a href="{esc(href)}">{image}</a></p>'
        return f"<p>{image}</p>"
    if kind == "imageLink":
        href = str(attrs.get("href") or "")
        if href.startswith("http") and inner.strip():
            return f'<p><a href="{esc(href)}">{inner}</a></p>'
        return inner
    if kind == "youtube":
        video_id = str(attrs.get("videoId") or "")
        if not video_id:
            return ""
        url = f"https://www.youtube.com/watch?v={video_id}"
        return f'<p><a href="{esc(url)}">{esc(url)}</a></p>'
    if kind in ("twitter", "tweet"):
        url = str(attrs.get("tweetUrl") or "")
        if not url and attrs.get("tweetId"):
            url = f"https://x.com/i/status/{attrs.get('tweetId')}"
        if url.startswith("http"):
            return f'<p><a href="{esc(url)}">{esc(url)}</a></p>'
        return ""
    if kind == "embedly":
        return render_embedly(str(attrs.get("src") or ""), attrs.get("data"))
    if kind in ("customButton", "subscribeButton", "shareButton"):
        href = str(attrs.get("href") or "")
        label = str(attrs.get("label") or attrs.get("text") or href)
        if href.startswith("http"):
            return f'<p><a href="{esc(href)}">{esc(label)}</a></p>'
        return ""
    return inner


def plain_text(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def slugify(value: str) -> str:
    ascii_value = value.encode("ascii", "ignore").decode().lower()
    slug = re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")
    return slug[:80].strip("-")


def when(ms) -> datetime | None:
    if ms in (None, ""):
        return None
    try:
        value = int(ms)
    except (TypeError, ValueError):
        return None
    if value < 10_000_000_000:
        value *= 1000
    return datetime.fromtimestamp(value / 1000, timezone.utc)


def categories_of(post: dict) -> list[str]:
    raw = post.get("categories") or []
    names: list[str] = []
    if isinstance(raw, list):
        for item in raw:
            if isinstance(item, str) and item.strip():
                names.append(item.strip())
            elif isinstance(item, dict):
                name = item.get("name") or item.get("title") or item.get("slug")
                if name:
                    names.append(str(name).strip())
    return names


def worthwhile(html: str) -> bool:
    text = plain_text(html)
    return len(text) >= 20 or "<img " in html


def supplement(html: str, doc) -> str:
    """Add images and links that were only stored on the editor document."""
    if not doc:
        return html
    extras: list[str] = []

    def walk(node) -> None:
        if isinstance(node, list):
            for child in node:
                walk(child)
            return
        if not isinstance(node, dict):
            return
        kind = node.get("type")
        attrs = node.get("attrs") or {}
        if kind == "image":
            src = str(attrs.get("src") or attrs.get("url") or "")
            if src.startswith("http") and src not in html and esc(src) not in html:
                extras.append(render_node(node))
        elif kind == "youtube":
            video_id = str(attrs.get("videoId") or "")
            if video_id and video_id not in html:
                extras.append(render_node(node))
        elif kind in ("twitter", "tweet"):
            url = str(attrs.get("tweetUrl") or "")
            token = url.split("?")[0]
            if token.startswith("http") and token not in html:
                extras.append(render_node(node))
        elif kind == "embedly":
            src = str(attrs.get("src") or "").split("?")[0]
            if src.startswith("http") and src not in html:
                extras.append(render_node(node))
        elif kind in ("customButton", "subscribeButton"):
            href = str(attrs.get("href") or "").split("?")[0]
            if href.startswith("http") and href not in html:
                extras.append(render_node(node))
        for value in node.values():
            if isinstance(value, (dict, list)):
                walk(value)

    walk(doc)
    if not extras:
        return html
    return html + "".join(extras)


# Paragraph still had this marked draft. It was posted, so it stays in the import.
KEEP_DRAFT_SLUGS = {"damsels-part-deux"}


def include_post(post: dict) -> bool:
    if post.get("publishState") == "published":
        return True
    slug = (post.get("slug") or "").strip().lower()
    return slug in KEEP_DRAFT_SLUGS


def build_posts(posts: list[dict], fallback: datetime) -> list[dict]:
    built: list[dict] = []
    used: dict[str, int] = {}
    for index, post in enumerate(posts):
        if not include_post(post):
            continue
        raw_html = post.get("staticHtml") or ""
        doc = None
        raw_json = post.get("contentJson")
        if raw_json:
            try:
                doc = json.loads(raw_json) if isinstance(raw_json, str) else raw_json
            except json.JSONDecodeError:
                doc = None
        if raw_html.strip():
            html = clean_html(raw_html)
            html = supplement(html, doc)
        else:
            html = strip_empty(render_node(doc) if doc else "")
        cover = str(post.get("coverImageUrl") or "")
        if cover.startswith("http") and cover not in html and esc(cover) not in html:
            html = f'<p><img src="{esc(cover)}" alt=""></p>' + html
        html = strip_empty(html)
        if not worthwhile(html):
            continue
        title = (post.get("title") or "").strip() or "Untitled"
        base = slugify(str(post.get("slug") or "")) or slugify(title)
        if not base:
            stamp = when(post.get("publishedAt"))
            base = "untitled-" + (stamp.strftime("%Y-%m-%d") if stamp else str(index))
        count = used.get(base, 0) + 1
        used[base] = count
        slug = base if count == 1 else f"{base}-{count}"
        published = when(post.get("publishedAt")) or when(post.get("scheduledAt"))
        built.append(
            {
                "slug": slug,
                "title": title,
                "subtitle": (post.get("subtitle") or "").strip(),
                "publishedAt": published.strftime("%Y-%m-%dT%H:%M:%SZ") if published else None,
                "rfc822": format_datetime(published or fallback, usegmt=True),
                "draft": False,
                "html": html,
                "categories": categories_of(post),
                "sourceId": post.get("sourceId") or "",
                "paragraphSlug": post.get("slug") or "",
            }
        )
    built.sort(key=lambda item: item["publishedAt"] or "", reverse=True)
    return built


def drop_dead_images(html: str) -> str:
    def replace(match: re.Match[str]) -> str:
        src = match.group(1).replace("&amp;", "&")
        if src in DROP_IMAGES or src.startswith("https://paragraph.com/editor/"):
            return ""
        return match.group(0)

    html = re.sub(r'<img src="([^"]*)" alt="([^"]*)">', replace, html)
    return strip_empty(html)


def build_feed(posts: list[dict], generated: datetime) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0"',
        '  xmlns:content="http://purl.org/rss/1.0/modules/content/"',
        '  xmlns:dc="http://purl.org/dc/elements/1.1/"',
        '  xmlns:atom="http://www.w3.org/2005/Atom"',
        '  xmlns:media="http://search.yahoo.com/mrss/">',
        "<channel>",
        f"<title>{cdata('Salon de l’Empress')}</title>",
        f"<link>{SITE}/journal</link>",
        f"<description>{cdata('Writing and pictures by Empress Trash.')}</description>",
        "<language>en</language>",
        f"<lastBuildDate>{format_datetime(generated, usegmt=True)}</lastBuildDate>",
        f'<atom:link href="{SITE}{FEED_PATH}" rel="self" type="application/rss+xml"/>',
    ]
    for post in posts:
        link = f"{SITE}/journal/{post['slug']}"
        lines.append("<item>")
        lines.append(f"<title>{cdata(post['title'])}</title>")
        lines.append(f"<link>{link}</link>")
        lines.append(f'<guid isPermaLink="true">{link}</guid>')
        lines.append(f"<pubDate>{post['rfc822']}</pubDate>")
        lines.append(f"<dc:creator>{cdata('Empress Trash')}</dc:creator>")
        description = post["subtitle"] or plain_text(post["html"])[:280]
        lines.append(f"<description>{cdata(description)}</description>")
        for category in post["categories"]:
            lines.append(f"<category>{cdata(category)}</category>")
        image = re.search(r'<img src="([^"]+)"', post["html"])
        if image:
            lines.append(
                f'<media:content url="{image.group(1)}" medium="image"/>'
            )
        lines.append(f"<content:encoded>{cdata(post['html'])}</content:encoded>")
        lines.append("</item>")
    lines.append("</channel>")
    lines.append("</rss>")
    return "\n".join(lines) + "\n"


def validate(feed: str, posts: list[dict]) -> None:
    import xml.etree.ElementTree as ET

    root = ET.fromstring(feed)
    ns = {"content": "http://purl.org/rss/1.0/modules/content/"}
    items = root.findall("./channel/item")
    if len(items) != len(posts):
        raise SystemExit(f"feed items {len(items)} != posts {len(posts)}")
    for item, post in zip(items, posts):
        encoded = item.find("content:encoded", ns)
        title = item.findtext("title") or ""
        link = item.findtext("link") or ""
        body = encoded.text if encoded is not None else ""
        if body != post["html"]:
            raise SystemExit(
                f"feed body mismatch {post['slug']}: feed {len(body or '')} post {len(post['html'])}"
            )
        if title != post["title"]:
            raise SystemExit(f"title mismatch: {post['slug']}")
        if not link.startswith(f"{SITE}/journal/"):
            raise SystemExit(f"bad link: {link}")
        if "blurdataurl" in (encoded.text or "").lower():
            raise SystemExit(f"blur data left in {post['slug']}")
        if "<script" in (encoded.text or "").lower():
            raise SystemExit(f"script left in {post['slug']}")
        for src in re.findall(r'<img src="([^"]+)"', encoded.text or ""):
            if not src.startswith("https://"):
                raise SystemExit(f"relative image in {post['slug']}: {src}")
    if "blurdataurl" in feed.lower():
        raise SystemExit("blur data left in feed")
    print(f"feed ok: {len(items)} items, {len(feed)} bytes", flush=True)


def main() -> None:
    source = Path(sys.argv[1] if len(sys.argv) > 1 else r"d:\paragraph-posts-es5TVh5SEYo7JOsgMWm1.json")
    print(f"reading {source}", flush=True)
    payload = json.loads(source.read_text(encoding="utf-8"))
    generated = datetime.now(timezone.utc)
    posts = build_posts(payload["posts"], generated)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    for post in posts:
        post["html"] = drop_dead_images(post["html"])
    public_posts = []
    for post in posts:
        public_posts.append(
            {
                "slug": post["slug"],
                "title": post["title"],
                "subtitle": post["subtitle"],
                "publishedAt": post["publishedAt"],
                "draft": post["draft"],
                "html": post["html"],
                "categories": post["categories"],
            }
        )
    (DATA_DIR / "posts.json").write_text(
        json.dumps({"generatedAt": generated.strftime("%Y-%m-%dT%H:%M:%SZ"), "posts": public_posts}, ensure_ascii=False),
        encoding="utf-8",
    )
    feed = build_feed(posts, generated)
    (DATA_DIR / "feed.xml").write_text(feed, encoding="utf-8")
    validate(feed, posts)
    drafts = [post["title"] for post in posts if post["draft"]]
    images = [src for post in posts for src in re.findall(r'<img src="([^"]+)"', post["html"])]
    print(f"posts {len(posts)} drafts {len(drafts)} images {len(images)}", flush=True)
    for title in drafts:
        print(f"  draft: {title}", flush=True)


if __name__ == "__main__":
    try:
        main()
    except Exception:
        traceback.print_exc()
        raise
