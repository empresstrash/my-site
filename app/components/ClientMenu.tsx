"use client";

import type { ReactNode } from 'react';
import React, { useState, useEffect, useRef } from 'react';
import { FaInstagram, FaTiktok, FaXTwitter } from 'react-icons/fa6';
import { FaYoutube, FaTumblr, FaEnvelope, FaDiscord } from 'react-icons/fa';
import { usePathname } from 'next/navigation';

interface MenuItem {
  label: string;
  path?: string;
  external?: string;
  children?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { label: 'home', path: '/' },
  {
    label: 'support + commission',
    children: [
      { label: '18+ patreon', external: 'https://www.patreon.com/EmpressTrash' },
      { label: 'fiverr', external: 'https://www.fiverr.com/empresstrash/create-you-an-ai-portrait-you-will-love' },
      { label: 'zora creator coin', external: 'https://zora.co/@empresstrash' },
    ],
  },
  {
    label: 'crypto art',
    children: [
      {
        label: 'damsels',
        children: [
          { label: 'eth collection', external: 'https://opensea.io/collection/damsels' },
          { label: 'tez collection', external: 'https://objkt.com/@empresstrash' },
          { label: 'legacy page', external: 'https://empresstrash.neocities.org/damsels' },
          { label: 'oncyber gallery', external: 'https://oncyber.io/line412' },
        ],
      },
      {
        label: 'ethereum art',
        children: [
          { label: 'superrare', external: 'https://superrare.com/empresstrash' },
          { label: 'networked', external: 'https://networked.art/profile/0x8469b7b08d30c63fea3a248a198de9d634b63d70' },
          { label: 'foundation', external: 'https://foundation.app/@empresstrash' },
          { label: 'highlight', external: 'https://highlight.xyz/user/@empresstrash.eth' },
          { label: 'titles', external: 'https://titles.xyz/profile/0x8469b7b08d30c63fea3a248a198de9d634b63d70' },
          { label: 'zora', external: 'https://zora.co/@empresstrash' },
          { label: 'manifold', external: 'https://manifold.xyz/@empresstrash' },
          { label: 'opensea', external: 'https://opensea.io/EmpressTrash' },
          { label: 'blueprint', external: 'https://bp.fun/creator/empress-trash?tab=media' },
          { label: 'mint gold dust', external: 'https://www.mintgolddust.com/profile/0x8469B7b08D30C63fEA3a248a198dE9D634B63d70/' },
        ],
      },
      {
        label: 'tezos',
        children: [
          { label: 'objkt', external: 'https://objkt.com/@empresstrash' },
          { label: 'teia', external: 'https://teia.art/empresstrash' },
          { label: 'zeroart', external: 'https://www.zeroart.app/tezos/zeroview/tokens.html?contract=KT1NAkxTuLq1MFr3GKHGSqLXh5jX2Ksn8RqJ' },
        ],
      },
      {
        label: 'bitcoin art',
        children: [
          { label: 'gamma', external: 'https://gamma.io/empresstrash/created' },
        ],
      },
    ],
  },
  {
    label: 'metaverses',
    children: [
      {
        label: 'livestream',
        children: [
          { label: 'x', external: 'https://x.com/EmpressTrash' },
          { label: 'twitch', external: 'https://www.twitch.tv/empresstrash' },
          { label: 'streamlabs', external: 'https://dreamyweirdodanceclub.live/' },
        ],
      },
      {
        label: 'builds',
        children: [
          { label: 'neocities', external: 'https://empresstrash.neocities.org/' },
          { label: 'nifty island', external: 'https://www.niftyisland.com/profile/empresstrash' },
          { label: 'oncyber', external: 'https://oncyber.io/@empresstrash' },
          { label: 'spatial', external: 'https://www.spatial.io/@empress_trash_48979' },
          { label: 'dpd gallery', external: 'https://oncyber.io/dospunksdao_empresstrash' },
        ],
      },
      {
        label: 'games',
        children: [
          { label: 'glitch block party on remix.gg', external: 'https://remix.gg/g/57bd911d-aacb-45ba-b3f6-cf3ee7f5dda1?version=28b4e045-8dff-4263-ac9c-1a4563ebeb14' },
        ],
      },
    ],
  },
  {
    label: 'about empress trash',
    children: [
      { label: 'bio', path: '/bio' },
      { label: 'media', path: '/media' },
      { label: 'grokipedia', external: 'https://grokipedia.com' },
    ],
  },
  {
    label: 'connect',
    children: [
      { label: 'deca', external: 'https://deca.art/EmpressTrash' },
      { label: 'deviant art', external: 'https://www.deviantart.com/trash-empress' },
      
      { label: 'farcaster', external: 'https://farcaster.xyz/empresstrash' },
      { label: 'giphy', external: 'https://giphy.com/empresstrash' },
      { label: 'hey', external: 'https://hey.xyz/u/empresstrash' },
      { label: 'paragraph', external: 'https://paragraph.com/@empresstrash' },
      { label: 'zeroone', external: 'https://zeroone.art/profile/empresstrash' },
    ],
  },
];

function MenuItem({ item, level = 0, pathname, keyPath, expandedMap, toggleExpand }: { item: MenuItem; level?: number; pathname: string; keyPath: string; expandedMap: Record<string, boolean>; toggleExpand: (key: string) => void; }): React.ReactNode {
  const isExpanded = !!expandedMap[keyPath];
  const isActive = item.path && pathname === item.path;

  const handleClick = (e: React.MouseEvent) => {
    if (item.external) {
      e.preventDefault();
      window.open(item.external, '_blank', 'noopener,noreferrer');
    } else if (item.children) {
      e.preventDefault();
      toggleExpand(keyPath);
    }
    // if it's a normal internal link (item.path) we do nothing special -- navigation will occur
  };

  return (
    <li className={`menu-item ${isExpanded ? 'expanded' : ''} ${isActive ? 'active' : ''} level-${level}`}>
      {item.children ? (
        <>
          <button
            className="menu-button"
            onClick={handleClick}
            style={{ paddingLeft: `${1.25 + level * 0.75}rem` }}
          >
            {item.label}
            <span className={`toggle ${isExpanded ? 'open' : ''}`}>▶</span>
          </button>
          {isExpanded && (
            <ul className="menu-submenu">
              {item.children.map((child, idx) => (
                <MenuItem key={idx} item={child} level={level + 1} pathname={pathname} keyPath={`${keyPath}/${child.label}`} expandedMap={expandedMap} toggleExpand={toggleExpand} />
              ))}
            </ul>
          )}
        </>
      ) : (
        <a
          href={item.path || '#'}
          onClick={handleClick}
          className={`menu-link ${isActive ? 'active' : ''}`}
          style={{ paddingLeft: `${1.25 + level * 0.75}rem` }}
        >
          {item.label}
        </a>
      )}
    </li>
  );
}

export default function ClientMenu(): React.ReactNode {
  const pathname = usePathname();

  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // load saved expansion state
    try {
      const raw = localStorage.getItem('menuExpanded');
      if (raw) setExpandedMap(JSON.parse(raw));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    // persist
    try {
      localStorage.setItem('menuExpanded', JSON.stringify(expandedMap));
    } catch (e) {}
  }, [expandedMap]);

  // detect mobile viewport on client only
  useEffect(() => {
    function update() {
      setIsMobile(window.innerWidth < 769);
    }
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // close mobile menu when navigating
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const toggleExpand = (key: string) => {
    setExpandedMap(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // expand parents for current path only once on initial mount to avoid flicker on navigation
  const _initRef = useRef(false);
  useEffect(() => {
    if (_initRef.current) return;
    _initRef.current = true;

    function findAncestors(items: MenuItem[], target: string | null, parents: string[] = []): string[] | null {
      for (const it of items) {
        if (it.path && it.path === target) return parents;
        if (it.children) {
          const res = findAncestors(it.children, target, [...parents, it.label]);
          if (res) return res;
        }
      }
      return null;
    }

    const ancestors = findAncestors(menuItems, pathname);
    if (ancestors) {
      setExpandedMap(prev => {
        const copy = { ...prev };
        let key = '';
        for (let i = 0; i < ancestors.length; i++) {
          key = i === 0 ? `${ancestors[i]}` : `${key}/${ancestors[i]}`;
          copy[key] = true;
        }
        return copy;
      });
    }
  }, []);

  return (
    <>
      {isMobile && mobileOpen && (
        <div className="menu-backdrop" onClick={() => setMobileOpen(false)} />
      )}
      <aside className={`side-menu ${mobileOpen ? 'open' : ''}`} role="navigation" aria-hidden={isMobile && !mobileOpen}>
        <ul className="side-list">
          {menuItems.map((item, idx) => (
            <MenuItem key={idx} item={item} pathname={pathname} keyPath={item.label} expandedMap={expandedMap} toggleExpand={toggleExpand} />
          ))}
        </ul>
        <div className="side-socials">
          <a href="https://x.com/EmpressTrash" target="_blank" rel="noreferrer" title="X"><FaXTwitter /></a>
          <a href="https://www.instagram.com/empress_trash/" target="_blank" rel="noreferrer" title="Instagram"><FaInstagram /></a>
          <a href="https://www.tiktok.com/@empresstrash" target="_blank" rel="noreferrer" title="TikTok"><FaTiktok /></a>
          <a href="https://www.tumblr.com/empresstrash-art" target="_blank" rel="noreferrer" title="Tumblr"><FaTumblr /></a>
          <a href="https://www.youtube.com/@empresstrash" target="_blank" rel="noreferrer" title="YouTube"><FaYoutube /></a>
          <a href="https://discord.com/invite/NxssyY4dZU" target="_blank" rel="noreferrer" title="Discord"><FaDiscord /></a>
          <a href="mailto:empresstrash@gmail.com" title="Email"><FaEnvelope /></a>
        </div>
      </aside>

      <header className="header header-with-side">
        {isMobile && (
          <button
            className="mobile-menu-button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileOpen(v => !v)}
          >
            ☰
          </button>
        )}
        <div className="logo centered-logo">
          <img src="/et logo animated.gif" alt="ET Crown" />
        </div>
      </header>
    </>
  );
}
