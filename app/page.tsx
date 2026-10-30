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
};

type SalonArticle = SalonPost & { html: string };

const SUBSTACK_HOME = 'https://empresstrash.substack.com/';
const SUBSCRIBE_ACTION = 'https://empresstrash.substack.com/api/v1/free?nojs=true';
const POST_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function parseHomeView(value: string | null): HomeView {
  return value === 'emporium' ? 'emporium' : 'substack';
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
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
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (view === 'emporium') setVisitedEmporium(true);
  }, [view]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.documentElement.style.overscrollBehavior = 'none';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
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

  useEffect(() => {
    let cancelled = false;
    fetch('/api/salon')
      .then((response) => {
        if (!response.ok) throw new Error('salon');
        return response.json() as Promise<{ posts?: SalonPost[] }>;
      })
      .then((payload) => {
        if (cancelled) return;
        setPosts(Array.isArray(payload.posts) ? payload.posts : []);
      })
      .catch(() => {
        if (!cancelled) setListFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tabHref = (id: HomeView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('paragraph');
    if (id === 'emporium') params.set('embed', 'emporium');
    else params.delete('embed');
    const query = params.toString();
    return query ? `/?${query}` : '/';
  };

  const selected = postSlug ? posts?.find((post) => post.slug === postSlug) : undefined;

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
          substack
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
        <div
          className="home-embed-pane"
          role="tabpanel"
          hidden={view !== 'substack'}
          aria-hidden={view !== 'substack'}
        >
          <div className="salon-pane">
            {subscribed ? (
              <p className="salon-subscribed">Check your email to confirm.</p>
            ) : (
              <form
                className="salon-subscribe"
                action={SUBSCRIBE_ACTION}
                method="post"
                target="salon-subscribe"
                onSubmit={() => {
                  window.setTimeout(() => setSubscribed(true), 0);
                }}
              >
                <input type="hidden" name="source" value="embed" />
                <label className="salon-email">
                  <input
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="email for salon de l'empress"
                    aria-label="Email"
                  />
                </label>
                <button type="submit">subscribe</button>
              </form>
            )}
            <iframe name="salon-subscribe" title="Subscribe result" hidden />

            {postSlug ? (
              <div className="salon-read">
                <div className="salon-read-bar">
                  <button type="button" onClick={closePost}>
                    all posts
                  </button>
                  <a href={article?.url ?? selected?.url ?? `${SUBSTACK_HOME}p/${postSlug}`} target="_blank" rel="noopener noreferrer">
                    open on substack
                  </a>
                </div>
                {articleFailed ? (
                  <p className="salon-status">
                    This post didn’t load.{' '}
                    <a href={`${SUBSTACK_HOME}p/${postSlug}`} target="_blank" rel="noopener noreferrer">
                      Read it on Substack
                    </a>
                    .
                  </p>
                ) : !article ? (
                  <p className="salon-status">Loading the post…</p>
                ) : (
                  <article className="salon-article">
                    <h1>{article.title}</h1>
                    {article.subtitle ? <p className="salon-dek">{article.subtitle}</p> : null}
                    {article.date ? <time dateTime={article.date}>{formatDate(article.date)}</time> : null}
                    <div className="salon-body" dangerouslySetInnerHTML={{ __html: article.html }} />
                  </article>
                )}
              </div>
            ) : (
              <div className="salon-list-wrap">
                {listFailed ? (
                  <p className="salon-status">
                    The post list didn’t load.{' '}
                    <a href={SUBSTACK_HOME} target="_blank" rel="noopener noreferrer">
                      Read it on Substack
                    </a>
                    .
                  </p>
                ) : posts === null ? (
                  <p className="salon-status">Loading the salon…</p>
                ) : (
                  <ul className="salon-list">
                    {posts.map((post) => (
                      <li key={post.slug}>
                        <button type="button" onClick={() => openPost(post.slug)}>
                          <span className="salon-title">{post.title}</span>
                          <span className="salon-meta">
                            {[formatDate(post.date), post.subtitle].filter(Boolean).join(' — ')}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {visitedEmporium && (
          <div
            className="home-embed-pane"
            role="tabpanel"
            hidden={view !== 'emporium'}
            aria-hidden={view !== 'emporium'}
          >
            <iframe
              src="/frame/emporium"
              className="home-embed-frame"
              allow="fullscreen *"
              allowFullScreen
              title="Emporium shop"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="home-embed">
      <nav className="home-embed-tabs" aria-hidden="true">
        <span className="home-embed-tab is-on">substack</span>
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
