import { journalPosts } from "@/lib/journal";

function formatDate(iso: string | null) {
  if (!iso) return "Undated";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso));
}

export default function JournalIndex() {
  return (
    <div className="journal">
      <h1>Salon de l’Empress</h1>
      <p className="journal-note">
        Temporary copy of the Paragraph archive, for import. Nothing on this page is emailed.
      </p>
      <ul className="journal-list">
        {journalPosts.map((post) => (
          <li key={post.slug}>
            <a href={`/journal/${post.slug}`}>{post.title}</a>
            {post.draft ? <span className="journal-draft">draft</span> : null}
            <span className="journal-date">{formatDate(post.publishedAt)}</span>
            {post.subtitle ? <span className="journal-dek">{post.subtitle}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
