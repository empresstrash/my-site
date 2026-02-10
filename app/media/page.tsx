"use client";

export default function MediaPage() {
  const mediaItems = [
    { title: 'CC Global Summit', url: 'https://www.youtube.com/watch?v=dcYwLPeDHYI' },
    { title: 'Click Create Malicious Compliance', url: 'https://www.youtube.com/watch?v=zYMzy0dYloY' },
    { title: 'NorCal and Shill Podcast', url: 'https://open.spotify.com/episode/5U0Bg8P01ybSkr3Qs2e28S?go=1&sp_cid=1c48825c2f6317ac390839332dc080c8&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=187c16893d794269' },
    { title: 'Arbitrarily Deterministic Podcast', url: 'https://open.spotify.com/episode/3smTgs81Bkc7UxmbWOQhbu?go=1&sp_cid=1c48825c2f6317ac390839332dc080c8&utm_source=embed_player_p&utm_medium=desktop&nd=1&dlsi=ca6a97d769fb495c' },
    { title: 'Unit London Pixel Generation', url: 'https://unitlondon.com/voices/the-pixel-generation/' },
    { title: 'FUBAR.space', url: 'https://fubar.space/2023/expo-art/' },
    { title: 'Childhood Dreams', url: 'https://exchange.art/allisonjoyful/exhibition' },
    { title: 'Avant Galerie', url: 'https://avant-galerie.com/en/trashart-nft-garbology' },
    { title: 'NFT Culture TED', url: 'https://www.nftculture.com/ted/' },
    { title: 'Filthy Trash Art Exhibition', url: 'https://www.youtube.com/watch?v=RMxq9-hJbMU' },
    { title: 'Forbes Web3', url: 'https://www.forbes.com/sites/digital-assets/2023/11/29/web3-travel-guides-top-digital-art-and-crypto-events-at-miami-basel/?sh=768f3468192d' },
    { title: 'Particle Collection', url: 'https://blog.particlecollection.com/which-artwork-changed-your-life-empress-trash-6689410190c6' },
    { title: 'Mint Gold Dust', url: 'https://79au.mintgolddust.com/blog/2023/10/12/the-future-is-rubbish-elevating-the-refuse-with-empress-trash/' },
    { title: 'FOMA Mag', url: 'https://heyzine.com/flip-book/98b0f82850.html' },
    { title: 'Jon Cates Interview', url: 'https://joncates.medium.com/empress-trash-dos-dao-discussions-part-one-a1a093f1dd8a' },
    { title: '#TrashTheSec', url: 'https://joncates.medium.com/empress-trash-dos-dao-discussions-part-one-a1a093f1dd8a' },
    { title: 'Kaloh Glitch Art', url: 'https://www.kaloh.xyz/p/glitch-glitch-glitch-art' },
    { title: 'Artnet Beyond Binary', url: 'https://news.artnet.com/market/sothebys-glitch-ism-nft-sale-paused-patrick-amadon-all-male-auction-2276264' },
    { title: 'NFT Now Beyond Binary', url: 'https://nftnow.com/features/sothebys-all-male-auction-shouldnt-surprise-web3/' },
    { title: 'Giphy Artists to Watch 2023', url: 'https://medium.com/giphy/giphy-arts-presents-artists-to-watch-for-2023-f397edce9552' },
    { title: 'NFT Culture Artist Interview', url: 'https://www.nftculture.com/nft-art/artist-interview-empress-trash/' },
    { title: 'Counterarts Interview', url: 'https://medium.com/counterarts/escaping-a-real-life-hell-with-art-bb794657bf57' },
    { title: 'WonderMundo Interview', url: 'https://wondermundo.medium.com/the-real-truth-behind-the-smolnft-movement-82fe57e4eb38' },
    { title: 'The Tickle Feature', url: 'https://teia.art/objkt/718756' },
    { title: 'DPD JOMO Summer', url: 'https://dospunksdao.tumblr.com/post/696149954822012928/jomosummer' },
    { title: 'Deathpunk Zine', url: 'https://og.rarible.com/deathpunkzine2/items' },
    { title: 'Mutant Musings Interview', url: 'https://www.youtube.com/watch?v=cOIXWufpOrs' },
    { title: 'NFT Girl Interview', url: 'https://www.youtube.com/watch?v=mgSfaMNmPrc' },
    { title: 'Undervalued', url: 'https://x.com/nowmedia/status/1590845978709721088' },
  ];

  return (
    <div className="media-page">
      <h1>Media & Features</h1>
      <div className="media-masonry">
        {mediaItems.map((item, idx) => (
          <a
            key={idx}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="media-box"
          >
            {item.title}
          </a>
        ))}
      </div>

      <style jsx>{`
        /* rainbow sheen animation for hover */
        @keyframes rainbowMove {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @keyframes pinkGlitch {
          0% { transform: translateY(0) skewX(0); }
          20% { transform: translateY(-4px) skewX(-2deg); }
          40% { transform: translateY(3px) skewX(2deg); }
          60% { transform: translateY(-2px) skewX(-1deg); }
          100% { transform: translateY(0) skewX(0); }
        }

        .media-page {
          max-width: 1200px;
          margin: 2rem auto;
          padding: 0 1rem;
          color: var(--color-text);
        }
        .media-page h1 {
          font-size: 2.5rem;
          margin-bottom: 2rem;
          text-align: center;
          color: var(--accent-pink);
        }
        .media-masonry {
          column-count: auto;
          column-width: 250px;
          gap: 1.5rem;
          column-gap: 1.5rem;
          margin-top: 2rem;
        }

        .media-box {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 120px;
          padding: 1.5rem;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.95);
          text-decoration: none;
          color: #ffffff;
          font-weight: 600;
          text-align: center;
          transition: transform 300ms ease, box-shadow 250ms ease, border-color 250ms ease;
          border-radius: 16px;
          margin-bottom: 1.5rem;
          break-inside: avoid;
          word-break: break-word;
          text-transform: lowercase;
          font-size: 0.95rem;
          line-height: 1.4;
          overflow: hidden;
        }

        .media-box:link,
        .media-box:visited,
        .media-box:focus {
          color: #ffffff;
          text-decoration: none;
        }

        /* holographic rainbow overlay (hidden until hover) */
        .media-box::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 16px;
          background: linear-gradient(90deg, rgba(255,0,128,0.08), rgba(0,200,255,0.08), rgba(200,255,0,0.08), rgba(200,0,255,0.08));
          background-size: 300% 100%;
          opacity: 0;
          mix-blend-mode: screen;
          pointer-events: none;
          transform: translateZ(0);
          transition: opacity 300ms ease;
        }

        .media-box:hover {
          transform: translateY(-8px);
          border-color: rgba(255,255,255,0.6);
        }
        .media-box:hover::before {
          opacity: 1;
          animation: rainbowMove 3s linear infinite;
        }

        /* pink glitch explosion on click */
        .media-box:active {
          background: rgba(255, 0, 127, 0.12);
          color: #ffffff;
          box-shadow: 0 6px 24px rgba(255,0,127,0.35), 0 0 40px rgba(255,0,127,0.18) inset;
          animation: pinkGlitch 280ms linear;
          transform: translateY(0);
        }

        /* small decorative shimmer lines for non-hover state on larger screens */
        .media-box::after {
          content: '';
          position: absolute;
          top: -40%;
          left: -20%;
          width: 140%;
          height: 200%;
          background: radial-gradient(circle at 20% 20%, rgba(255,255,255,0.03), transparent 10%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.02), transparent 10%);
          pointer-events: none;
          opacity: 1;
        }

        @media (max-width: 768px) {
          .media-page {
            padding: 0 0.75rem;
          }
          .media-page h1 {
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
          }
          .media-masonry {
            column-width: 150px;
            column-gap: 1rem;
            gap: 1rem;
          }
          .media-box {
            min-height: 100px;
            padding: 1rem;
            font-size: 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .media-masonry {
            column-count: 1;
            column-width: auto;
          }
          .media-page h1 {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}
