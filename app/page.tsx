'use client';

import Link from 'next/link';
import { Suspense, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import { TwinkleRule } from './components/SpaceTwinkles';
import BioPage from './bio/page';
import DamselsLanding from './damsels/DamselsLanding';
import FullMoonPage from './full-moon/page';
import GalleryStack from './gallery/GalleryStack';

type HomeView = 'gallery' | 'full-moon' | 'damsels' | 'substack' | 'emporium' | 'bio';

const HOME_TABS: { id: HomeView; label: string }[] = [
  { id: 'gallery', label: 'gallery' },
  { id: 'full-moon', label: 'full moon art' },
  { id: 'damsels', label: 'damsels' },
  { id: 'substack', label: 'substack' },
  { id: 'emporium', label: 'merch shop' },
  { id: 'bio', label: 'bio' },
];

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
  if (value === 'full-moon') return 'full-moon';
  if (value === 'damsels') return 'damsels';
  if (value === 'substack') return 'substack';
  if (value === 'emporium') return 'emporium';
  if (value === 'bio') return 'bio';
  return 'gallery';
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
  const [sent, setSent] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div className="salon-pop" role="dialog" aria-modal="true" aria-labelledby="salon-pop-title">
      <button type="button" className="salon-pop-scrim" aria-label="Close subscribe" onClick={onClose} />
      <div className="salon-pop-card">
        <div className="salon-pop-bar">
          <p id="salon-pop-title">subscribe</p>
          <button type="button" onClick={onClose}>close</button>
        </div>
        {sent ? (
          <p className="salon-pop-blurb">Check your inbox to confirm.</p>
        ) : (
          <form
            className="salon-pop-form"
            action="https://empresstrash.substack.com/api/v1/free?nojs=true"
            method="post"
            target="salon-subscribe"
            onSubmit={() => setSent(true)}
          >
            <h2>Salon de l&apos;Empress</h2>
            <p className="salon-pop-blurb">
              Empress&apos;s journal and guide to art on and off the blockchain, celebrating creativity in all its wild, unfiltered forms.
            </p>
            <div className="salon-pop-row">
              <input type="email" name="email" required placeholder="Type your email..." aria-label="Email" autoComplete="email" />
              <button type="submit" className="salon-sub-btn">subscribe</button>
            </div>
            <input type="hidden" name="first_url" value="https://empresstrash.substack.com/" />
            <p className="salon-pop-legal">
              By subscribing you agree to{' '}
              <a href="https://empresstrash.substack.com/tos" target="_blank" rel="noopener noreferrer">
                Substack&apos;s Terms of Use
              </a>
              ,{' '}
              <a href="https://empresstrash.substack.com/privacy" target="_blank" rel="noopener noreferrer">
                our Privacy Policy
              </a>{' '}
              and{' '}
              <a href="https://substack.com/ccpa#personal-data-collected" target="_blank" rel="noopener noreferrer">
                our Information collection notice
              </a>
              .
            </p>
          </form>
        )}
        <iframe name="salon-subscribe" title="Subscribe result" hidden />
      </div>
    </div>,
    document.body,
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
  const [visitedGallery, setVisitedGallery] = useState(view === 'gallery');
  const [visitedFullMoon, setVisitedFullMoon] = useState(view === 'full-moon');
  const [visitedDamsels, setVisitedDamsels] = useState(view === 'damsels');
  const [visitedSubstack, setVisitedSubstack] = useState(view === 'substack');
  const [visitedEmporium, setVisitedEmporium] = useState(view === 'emporium');
  const [visitedBio, setVisitedBio] = useState(view === 'bio');
  if (view === 'gallery' && !visitedGallery) setVisitedGallery(true);
  if (view === 'full-moon' && !visitedFullMoon) setVisitedFullMoon(true);
  if (view === 'damsels' && !visitedDamsels) setVisitedDamsels(true);
  if (view === 'substack' && !visitedSubstack) setVisitedSubstack(true);
  if (view === 'emporium' && !visitedEmporium) setVisitedEmporium(true);
  if (view === 'bio' && !visitedBio) setVisitedBio(true);
  const [posts, setPosts] = useState<SalonPost[] | null>(null);
  const [listFailed, setListFailed] = useState(false);
  const [article, setArticle] = useState<SalonArticle | null>(null);
  const [articleFailed, setArticleFailed] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(true);

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

  useLayoutEffect(() => {
    document.body.classList.add('gallery-wide');
    window.dispatchEvent(new CustomEvent('home-menu'));
    return () => {
      document.body.classList.remove('gallery-wide');
      window.dispatchEvent(new CustomEvent('home-menu'));
    };
  }, []);

  useEffect(() => {
    if (!visitedSubstack) return;
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
  }, [visitedSubstack]);

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
    if (id === 'gallery') params.delete('embed');
    else params.set('embed', id);
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
        {HOME_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tabHref(tab.id)}
            role="tab"
            aria-selected={view === tab.id}
            className={`home-embed-tab${view === tab.id ? ' is-on' : ''}`}
            scroll={false}
          >
            <span className="home-embed-tab-label">{tab.label}</span>
          </Link>
        ))}
      </nav>

      <div className="home-embed-stage">
        {visitedGallery && (
          <div className="home-embed-pane" role="tabpanel" hidden={view !== 'gallery'} aria-hidden={view !== 'gallery'}>
            <GalleryStack />
          </div>
        )}
        {visitedFullMoon && (
          <div className="home-embed-pane" role="tabpanel" hidden={view !== 'full-moon'} aria-hidden={view !== 'full-moon'}>
            <FullMoonPage />
          </div>
        )}
        {visitedDamsels && (
          <div className="home-embed-pane" role="tabpanel" hidden={view !== 'damsels'} aria-hidden={view !== 'damsels'}>
            <DamselsLanding />
          </div>
        )}
        {visitedSubstack && (
        <div className="home-embed-pane" role="tabpanel" hidden={view !== 'substack'} aria-hidden={view !== 'substack'}>
          <div className="salon-pane">
            <header className="salon-mast">
              <TwinkleRule />
              <h1>Salon de l&apos;Empress</h1>
              <button type="button" className="salon-sub-btn" onClick={() => setSubscribeOpen(true)}>
                subscribe
              </button>
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
                    {posts.map((post, index) => (
                      <li key={post.slug} className="menu-glass-panel">
                        <button type="button" onClick={() => openPost(post.slug)}>
                          {post.image ? (
                            <span className="salon-thumb-frame">
                              <img
                                className="salon-thumb"
                                src={post.image}
                                alt=""
                                loading={index < 2 ? "eager" : "lazy"}
                                decoding="async"
                                fetchPriority={index === 0 ? "high" : "low"}
                              />
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
        )}

        {visitedEmporium && (
          <div className="home-embed-pane" role="tabpanel" hidden={view !== 'emporium'} aria-hidden={view !== 'emporium'}>
            <iframe src="/frame/emporium" className="home-embed-frame" allow="fullscreen *" allowFullScreen title="Emporium shop" />
          </div>
        )}
        {visitedBio && (
          <div className="home-embed-pane home-embed-pane-scroll" role="tabpanel" hidden={view !== 'bio'} aria-hidden={view !== 'bio'}>
            <BioPage />
          </div>
        )}
      </div>

      {subscribeOpen ? <SubscribePopup onClose={() => setSubscribeOpen(false)} /> : null}
    </div>
  );
}

function HomeFallback() {
  return (
    <div className="home-embed">
      <nav className="home-embed-tabs" aria-hidden="true">
        <span className="home-embed-tab is-on"><span className="home-embed-tab-label">gallery</span></span>
        <span className="home-embed-tab"><span className="home-embed-tab-label">full moon art</span></span>
        <span className="home-embed-tab"><span className="home-embed-tab-label">damsels</span></span>
        <span className="home-embed-tab"><span className="home-embed-tab-label">substack</span></span>
        <span className="home-embed-tab"><span className="home-embed-tab-label">merch shop</span></span>
        <span className="home-embed-tab"><span className="home-embed-tab-label">bio</span></span>
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
