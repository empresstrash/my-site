import { notFound } from "next/navigation";
import { getJournalPost, journalPosts } from "@/lib/journal";

function formatDate(iso: string | null) {
  if (!iso) return "Undated";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export function generateStaticParams() {
  return journalPosts.map((post) => ({ slug: post.slug }));
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getJournalPost(slug);
  if (!post) notFound();

  return (
    <article className="journal">
      <a className="journal-back" href="/journal">
        All writing
      </a>
      <h1>{post.title}</h1>
      {post.subtitle ? <p className="journal-dek">{post.subtitle}</p> : null}
      <time className="journal-date" dateTime={post.publishedAt ?? undefined}>
        {formatDate(post.publishedAt)}
      </time>
      <div dangerouslySetInnerHTML={{ __html: post.html }} />
    </article>
  );
}
