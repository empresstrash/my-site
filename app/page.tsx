'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type HomeView = 'substack' | 'emporium';

type SalonPost = {
  title: string;
  subtitle: string;
  slug: string;
  date: string;
  url: string;
  image: string;
};

type SalonArticle = SalonPost & { html: string };

const POST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseHomeView(value: string | null): HomeView {
  return value === 'emporium' ? 'emporium' : 'substack';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function SubscribePopup({ onClose }: { onClose: () => void }) {
  return (
    <div className="salon-pop" role="dialog" aria-modal="true" aria-labelledby="salon-pop-title">
      <button type="button" className="salon-pop-scrim" aria-label="Close subscribe" onClick={onClose} />
      <div className="salon-pop-card">
        <div className="salon-pop-bar">
          <p id="salon-pop-title">subscribe</p>
          <button type="button" onClick={onClose}>close</button>
        </div>
        <iframe
          src="https://empresstrash.substack.com/embed?transparent=1&light=1"
          title="Subscribe to Salon de l'Empress"
          width={480}
          height={320}
          style={{ border: 0, background: 'transparent' }}
          scrolling="no"
          sandbox="allow-scripts allow-forms allow-same-origin"
        />
      </div>
    </div>
  );
}

function plainBio(text: string): string {
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\bmerch:\s*/gi, '')
    .replace(/@\w+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function BioCard() {
  const [xProfile, setXProfile] = useState<{ name: string; bio: string } | null>(null);
  const [avatarOk, setAvatarOk] = useState(true);

  useEffect(() => {
    fetch('/api/x')
      .then((response) => response.json())
      .then((data: { name?: string; bio?: string }) => {
        setXProfile({
          name: data.name || 'Empress Trash',
          bio: plainBio(data.bio || ''),
        });
      })
      .catch(() => {});
  }, []);

  return (
    <Link href="/bio" className="menu-glass-panel salon-bio">
      {avatarOk ? (
        <img src="/api/x/avatar" alt="" referrerPolicy="no-referrer" onError={() => setAvatarOk(false)} />
      ) : null}
      <div>
        <h2>{xProfile?.name || 'Empress Trash'}</h2>
        {xProfile?.bio ? <p>{xProfile.bio}</p> : null}
      </div>
    </Link>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseHomeView(searchParams.get('embed'));
  const requestedPost = searchParams.get('post');
  const postSlug = requestedPost && POST_SLUG.test(requestedPost) ? requestedPost : null;
  const [visitedEmporium, setVisitedEmporium] = useState(view === 'emporium');
  const [posts, setPosts] = useState<SalonPost[] | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const [article, setArticle] = useState<SalonArticle | null>(null);
  const [articleFailed, setArticleFailed] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(view === 'substack');

  useEffect(() => {
    if (view === 'emporium') setVisitedEmporium(true);
  }, [view]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/salon')
      .then((response) => {
        if (!response.ok) throw new Error('salon');
        return response.json() as Promise<{ posts?: SalonPost[] }>;
      })
      .then((payload) => {
        if (!cancelled) setPosts(Array.isArray(payload.posts) ? payload.posts : []);
      })
      .catch(() => {
        if (!cancelled) setListFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!postSlug) return;
    let cancelled = false;
    setArticle(null);
    setArticleFailed(false);
    fetch(`/api/salon/${postSlug}`)
      .then((response) => {
        if (!response.ok) throw new Error('post');
        return response.json() as Promise<SalonArticle>;
      })
      .then((payload) => {
        if (!cancelled) setArticle(payload);
      })
      .catch(() => {
        if (!cancelled) setArticleFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [postSlug]);

  const tabHref = (id: HomeView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('paragraph');
    if (id === 'emporium') params.set('embed', 'emporium');
    else params.delete('embed');
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  const openPost = (slug: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('paragraph');
    params.set('post', slug);
    router.replace(`/?${params.toString()}`, { scroll: false });
  };

  const closePost = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('paragraph');
    params.delete('post');
    const query = params.toString();
    router.replace(query ? `/?${query}` : '/', { scroll: false });
  };

  return (
    <div className="home-embed">
      <nav className="home-embed-tabs" role="tablist" aria-label="homepage embeds">
        <Link
          href={tabHref('substack')}
          role="tab"
          aria-selected={view === 'substack'}
          className={`home-embed-tab${view === 'substack' ? ' is-on' : ''}`}
          scroll={false}
        >
          salon
        </Link>
        <Link
          href={tabHref('emporium')}
          role="tab"
          aria-selected={view === 'emporium'}
          className={`home-embed-tab${view === 'emporium' ? ' is-on' : ''}`}
          scroll={false}
        >
          emporium shop
        </Link>
      </nav>

      <div className="home-embed-stage">
        <div className="home-embed-pane" role="tabpanel" hidden={view !== 'substack'} aria-hidden={view !== 'substack'}>
          <div className="salon-pane">
            <header className="salon-mast">
              <h1>
                <span className="salon-hue-btn">salon</span>
                <span className="salon-cross" aria-hidden="true">×</span>
                <span className="salon-hue-btn">empress</span>
                <span className="salon-cross" aria-hidden="true">×</span>
                <button type="button" className="salon-sub-btn salon-hue-btn" onClick={() => setSubscribeOpen(true)}>
                  subscribe
                </button>
              </h1>
            </header>

            <div className="salon-scroll">
            {postSlug ? (
              <div className="salon-read">
                <div className="salon-read-bar">
                  <button type="button" onClick={closePost}>all posts</button>
                  <a href={article?.url ?? `https://empresstrash.substack.com/p/${postSlug}`} target="_blank" rel="noopener noreferrer">
                    open on substack
                  </a>
                </div>
                {articleFailed ? (
                  <p className="salon-status">This post didn’t load.</p>
                ) : !article ? (
                  <p className="salon-status">Loading…</p>
                ) : (
                  <article className="salon-article">
                    <time dateTime={article.date}>{formatDate(article.date)}</time>
                    <h1>{article.title}</h1>
                    {article.subtitle ? <p className="salon-dek">{article.subtitle}</p> : null}
                    <div className="salon-body" dangerouslySetInnerHTML={{ __html: article.html }} />
                  </article>
                )}
              </div>
            ) : (
              <div className="salon-feed">
                {listFailed ? (
                  <p className="salon-status">
                    The posts didn’t load.{' '}
                    <a href="https://empresstrash.substack.com/" target="_blank" rel="noopener noreferrer">
                      Read them on Substack
                    </a>
                    .
                  </p>
                ) : posts === null ? (
                  <p className="salon-status">Loading…</p>
                ) : (
                  <ol className="salon-list">
                    {posts.map((post) => (
                      <li key={post.slug} className="menu-glass-panel">
                        <button type="button" onClick={() => openPost(post.slug)}>
                          {post.image ? (
                            <span className="salon-thumb-frame">
                              <img className="salon-thumb" src={post.image} alt="" />
                            </span>
                          ) : null}
                          <span className="salon-copy">
                            <time dateTime={post.date}>{formatDate(post.date)}</time>
                            <span className="salon-title">{post.title}</span>
                            {post.subtitle ? <span className="salon-meta">{post.subtitle}</span> : null}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
                <BioCard />
              </div>
            )}
            </div>
          </div>
        </div>

        {visitedEmporium && (
          <div className="home-embed-pane" role="tabpanel" hidden={view !== 'emporium'} aria-hidden={view !== 'emporium'}>
            <iframe src="/frame/emporium" className="home-embed-frame" allow="fullscreen *" allowFullScreen title="Emporium shop" />
          </div>
        )}
      </div>

      {view === 'substack' && subscribeOpen ? <SubscribePopup onClose={() => setSubscribeOpen(false)} /> : null}
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="home-embed">
      <nav className="home-embed-tabs" aria-hidden="true">
        <span className="home-embed-tab is-on">salon</span>
        <span className="home-embed-tab">emporium shop</span>
      </nav>
      <div className="home-embed-stage" />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeContent />
    </Suspense>
  );
}
