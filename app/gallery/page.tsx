"use client";

import { useEffect, useState } from 'react';

interface NFT {
  id: string | number;
  title: string;
  description?: string;
  mediaUrl: string;
  mediaType: 'video' | 'image' | 'gif';
  url: string;
}

export default function GalleryPage() {
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load from local JSON file
        const response = await fetch('/superrare-nfts.json');
        const data = await response.json();

        if (data.nfts && Array.isArray(data.nfts) && data.nfts.length > 0) {
          const processedNFTs = data.nfts.map((nft: NFT) => {
            const mediaUrl = nft.mediaUrl;
            const mediaType = nft.mediaType || getMediaTypeFromUrl(mediaUrl);
            return {
              ...nft,
              mediaType,
            };
          });
          setNfts(processedNFTs);
        } else {
          setError('No SuperRare NFTs found in gallery data');
          setNfts([]);
        }
      } catch (err) {
        console.error('Error loading SuperRare NFTs:', err);
        setError('Failed to load gallery. Please check the superrare-nfts.json file.');
        setNfts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNFTs();
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? nfts.length - 1 : prevIndex - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex === nfts.length - 1 ? 0 : prevIndex + 1));
  };

  if (loading) {
    return (
      <div className="gallery-container">
        <h1>select 1/1</h1>
        <div className="gallery-loading">
          <p>loading superrare collection...</p>
        </div>
      </div>
    );
  }

  if (error || nfts.length === 0) {
    return (
      <div className="gallery-container">
        <h1>select 1/1</h1>
        <div className="gallery-error">
          <p>{error || 'No SuperRare NFTs found'}</p>
          <a href="https://superrare.com/empresstrash" target="_blank" rel="noreferrer" className="button">
            View on SuperRare
          </a>
        </div>
      </div>
    );
  }

  const currentNFT = nfts[currentIndex];

  return (
    <div className="gallery-container">
      <h1>select 1/1</h1>
      
      <div className="carousel-wrapper">
        <div className="carousel">
          <button className="carousel-button prev" onClick={goToPrevious} aria-label="Previous">
            ←
          </button>

          <div className="carousel-content">
            <div className="carousel-media-wrapper">
              {currentNFT.mediaType === 'video' ? (
                <video
                  src={currentNFT.mediaUrl}
                  className="carousel-media"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : currentNFT.mediaType === 'gif' ? (
                <img
                  src={currentNFT.mediaUrl}
                  alt={currentNFT.title}
                  className="carousel-media carousel-gif"
                />
              ) : (
                <img
                  src={currentNFT.mediaUrl}
                  alt={currentNFT.title}
                  className="carousel-media"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23222" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" fill="%23fff" font-size="16" text-anchor="middle" dominant-baseline="middle"%3EMedia not available%3C/text%3E%3C/svg%3E';
                  }}
                />
              )}
            </div>

            <div className="carousel-info">
              <h2>{currentNFT.title}</h2>
              {currentNFT.description && (
                <p className="nft-description">{currentNFT.description}</p>
              )}
              <p className="nft-number">
                {currentIndex + 1} / {nfts.length}
              </p>
              <a
                href={currentNFT.url}
                target="_blank"
                rel="noreferrer"
                className="superrare-link"
              >
                view on superrare →
              </a>
            </div>
          </div>

          <button className="carousel-button next" onClick={goToNext} aria-label="Next">
            →
          </button>
        </div>

        <div className="carousel-indicators">
          {nfts.map((_, idx) => (
            <button
              key={idx}
              className={`indicator ${idx === currentIndex ? 'active' : ''}`}
              onClick={() => setCurrentIndex(idx)}
              aria-label={`Go to item ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        .gallery-container {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 0 1rem;
          color: var(--color-text);
        }

        .gallery-container h1 {
          font-size: 2.5rem;
          margin-bottom: 2rem;
          text-align: center;
          color: var(--accent-pink);
          text-transform: lowercase;
        }

        .gallery-loading,
        .gallery-error {
          text-align: center;
          padding: 4rem 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.3);
        }

        .gallery-error p {
          margin-bottom: 1.5rem;
          font-size: 1.1rem;
        }

        .button {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--accent-pink);
          color: var(--accent-pink);
          text-decoration: none;
          border-radius: 8px;
          transition: all 200ms ease;
        }

        .button:hover {
          background: var(--accent-pink);
          color: #000;
        }

        .carousel-wrapper {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .carousel {
          display: grid;
          grid-template-columns: auto 1fr auto;
          gap: 2rem;
          align-items: center;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 12px;
          background: rgba(0, 0, 0, 0.2);
        }

        .carousel-button {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 50px;
          height: 50px;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: transparent;
          color: #fff;
          font-size: 1.5rem;
          cursor: pointer;
          border-radius: 8px;
          transition: all 200ms ease;
          flex-shrink: 0;
        }

        .carousel-button:hover {
          border-color: var(--accent-pink);
          color: var(--accent-pink);
          transform: scale(1.1);
        }

        .carousel-content {
          display: flex;
          gap: 2rem;
          align-items: center;
          justify-content: center;
        }

        .carousel-image-wrapper {
          flex: 0 0 auto;
          max-width: 400px;
          aspect-ratio: 1;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .carousel-media-wrapper {
          flex: 0 0 auto;
          max-width: 400px;
          aspect-ratio: 1;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .carousel-image {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 300ms ease;
        }

        .carousel-media {
          width: 100%;
          height: 100%;
          object-fit: contain;
          transition: transform 300ms ease;
        }

        .carousel-image-wrapper:hover .carousel-image {
          transform: scale(1.05);
        }

        .carousel-media-wrapper:hover .carousel-media {
          transform: scale(1.05);
        }

        .carousel-info {
          flex: 1;
          min-width: 250px;
        }

        .carousel-info h2 {
          font-size: 1.8rem;
          margin-bottom: 1rem;
          color: #fff;
          text-transform: lowercase;
          line-height: 1.3;
        }

        .nft-number {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 1.5rem;
        }

        .nft-description {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 1.5rem;
          line-height: 1.6;
          max-height: 150px;
          overflow-y: auto;
        }

        .superrare-link {
          display: inline-block;
          padding: 0.75rem 1.5rem;
          border: 1px solid var(--accent-pink);
          color: var(--accent-pink);
          text-decoration: none;
          border-radius: 8px;
          transition: all 200ms ease;
          font-weight: 600;
        }

        .superrare-link:hover {
          background: var(--accent-pink);
          color: #000;
          transform: translateY(-2px);
        }

        .carousel-indicators {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .indicator {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1px solid rgba(255, 255, 255, 0.4);
          background: transparent;
          cursor: pointer;
          transition: all 200ms ease;
        }

        .indicator.active {
          background: var(--accent-pink);
          border-color: var(--accent-pink);
          transform: scale(1.2);
        }

        .indicator:hover {
          border-color: rgba(255, 255, 255, 0.8);
        }

        @media (max-width: 900px) {
          .carousel {
            grid-template-columns: 1fr;
            gap: 1.5rem;
          }

          .carousel-content {
            flex-direction: column;
            width: 100%;
          }

          .carousel-image-wrapper,
          .carousel-media-wrapper {
            max-width: 100%;
            width: 100%;
            max-height: 400px;
          }

          .carousel-button {
            width: 40px;
            height: 40px;
            font-size: 1.2rem;
          }
        }

        @media (max-width: 600px) {
          .gallery-container h1 {
            font-size: 1.8rem;
            margin-bottom: 1.5rem;
          }

          .carousel {
            padding: 1rem;
            gap: 1rem;
          }

          .carousel-info h2 {
            font-size: 1.3rem;
          }

          .carousel-image-wrapper,
          .carousel-media-wrapper {
            max-height: 300px;
          }

          .carousel-button {
            width: 35px;
            height: 35px;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
}

function getMediaTypeFromUrl(url: string): 'video' | 'image' | 'gif' {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.endsWith('.mp4') || lowerUrl.includes('.mp4?')) return 'video';
  if (lowerUrl.endsWith('.gif') || lowerUrl.includes('.gif?')) return 'gif';
  return 'image';
}
