"use client";

import { useEffect, useId, useRef, useState } from "react";

type CvLink = {
  label: string;
  url: string;
};

type CvItem = {
  /** Sort key: YYYY-MM (or YYYY-MM-DD). Use mid-year for undated. */
  sortKey: string;
  /** Leading date label, e.g. "May 2026" or "Sept 2026 – Feb 2027" */
  date: string;
  /**
   * Institutional CV body after the date.
   * Convention: Title of exhibition/work, Venue/Institution, City, Country (as applicable).
   */
  entry: string;
  links?: CvLink[];
};

type CvYear = {
  year: string;
  items: CvItem[];
};

/**
 * CV timeline data. Links are only attached when a verifiable public proof
 * was found (museum page, platform listing, official event page, or primary
 * announcement). No invented URLs.
 */
const CV_TIMELINE: CvYear[] = [
  {
    year: "2026",
    items: [
      {
        sortKey: "2026-09",
        date: "Sept 2026 – Feb 2027",
        entry:
          "Wen Moon #850, permanent collection acquisition and exhibition Collection Francisco Carolinum: 3 Blockchains, one Collection, Francisco Carolinum Linz, Linz, Austria",
        links: [
          {
            label: "Exhibition (ooekultur.at)",
            url: "https://www.ooekultur.at/exhibition-detail/collection-francisco-carolinum",
          },
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/2082509244314665078",
          },
          {
            label: "Wen Moon collection",
            url: "https://opensea.io/collection/wen-moon-16",
          }
      ],
      },
      {
        sortKey: "2026-08",
        date: "Aug 2026",
        entry:
          "Artist Curator and featured artist, RGBMTL 5th edition × MUTEK Montréal, Montreal, Canada",
        links: [
          { label: "RGBMTL", url: "https://rgbmtl.objkt.com/" },
          {
            label: "Curator announcement",
            url: "https://x.com/EmpressTrash/status/2054549756681064559",
          },
          {
            label: "Featured update",
            url: "https://x.com/EmpressTrash/status/2082673449432977906",
          }
      ],
      },
      {
        sortKey: "2026-07",
        date: "July 2026",
        entry:
          "Opepen permanent collection via CONSTRAINT set (Opepen #4695)",
        links: [
          { label: "CONSTRAINT set", url: "https://opepen.art/sets/082" },
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/2082639995282600424",
          }
      ],
      },
      {
        sortKey: "2026-06",
        date: "June 2026",
        entry:
          "Body Mapping (Voluptechne 1/1), featured at exchgART × cycol_gallery booth, NFC Lisbon / NFT Lisbon, Lisbon, Portugal",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/2067343639966253283",
          }
      ],
      },
      {
        sortKey: "2026-05",
        date: "May–Aug 2026",
        entry:
          "Voluptechne, first Artist in Residence, PanelHaus (weekly OpenHaus sessions; Diana the Huntress sculpture retexturing series), Decentraland",
        links: [
          {
            label: "Decentraland event",
            url: "https://decentraland.org/whats-on?id=132e48e7-1c47-4189-977d-039f59213fa1",
          },
          {
            label: "Residency journal",
            url: "https://paragraph.com/@empresstrash/decentraland-decentraland-decentraland",
          },
          {
            label: "AIR announcement",
            url: "https://x.com/EmpressTrash/status/2059111566566437146",
          }
      ],
      },
      {
        sortKey: "2026-05",
        date: "May 2026",
        entry:
          "Body Mapping II, Síntesis, Ledger Leaders Week (VarArt Global × Vara Network × Foro Blockchain), Mexico City, Mexico",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/2052533981610954811",
          }
      ],
      },
      {
        sortKey: "2026-04-29",
        date: "April 2026",
        entry:
          "Body Mapping, Built to Create: Art in the Age of the Robot, TECHNE / mHUB Chicago, Chicago, IL",
        links: [
          {
            label: "Exhibition night (video)",
            url: "https://x.com/EmpressTrash/status/2049531372570542510",
          },
          {
            label: "Listing for Built to Create",
            url: "https://x.com/EmpressTrash/status/2049331036278882811",
          },
          {
            label: "Body Mapping on Exchange",
            url: "https://www.exchange.art/single/0x1259ba696527156c3b1cbdfc74243edbd57f1a82-35",
          }
      ],
      },
      {
        sortKey: "2026-03-24",
        date: "March 2026",
        entry:
          "Interview, Beyond the NFT with SinfulMeatStick, Decentraland",
        links: [
          {
            label: "YouTube (full interview)",
            url: "https://www.youtube.com/watch?v=9vbmFLMmQHU",
          },
          {
            label: "Birthday interview post",
            url: "https://x.com/EmpressTrash/status/2036509687558889601",
          },
          {
            label: "Event RSVP / announcement",
            url: "https://x.com/EmpressTrash/status/2035405101179797970",
          },
          {
            label: "Decentraland event",
            url: "https://decentraland.org/events/event/?id=a3e158dc-001d-4e80-819d-696d119c7d71",
          },
        ],
      },
      {
        sortKey: "2026-03-21",
        date: "March 2026",
        entry:
          "obey//resist, Obey and Resist (Beeple × Shepard Fairey), Beeple Studios, Charleston, SC",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/2035413024442609735",
          }
      ],
      },
      {
        sortKey: "2026-03-20",
        date: "March 2026",
        entry:
          "Cusp of Rebirth V1, open-call group exhibition and virtual birthday extravaganza (curator/artist; gallery build), SubstrataVR",
        links: [
          {
            label: "World",
            url: "https://substrata.info/world/empresstrash/Cusp+of+Rebirth+V1",
          },
          {
            label: "Open call",
            url: "https://x.com/EmpressTrash/status/2025874273772982533",
          }
      ],
      },
      {
        sortKey: "2026-03-01",
        date: "March 2026",
        entry:
          "Visible Violets V2, curator and artist with One Love Art DAO (gallery build), SubstrataVR",
        links: [
          {
            label: "World",
            url: "https://substrata.info/world/empresstrash/Visible+Violets+V2",
          }
      ],
      },
      {
        sortKey: "2026-01-01",
        date: "2026",
        entry:
          "Decentraland UGC Community Lead; official YouTube livestreamer and builder, L'Impératrice atelier, Decentraland",
        links: [
          {
            label: "Atelier",
            url: "https://decentraland.org/jump/?position=126%2C104",
          },
          {
            label: "YouTube",
            url: "https://www.youtube.com/@empresstrash",
          }
      ],
      }
      ],
  },
  {
    year: "2025",
    items: [
      {
        sortKey: "2025-12-31",
        date: "Dec 2025",
        entry:
          'Group drop BURN EVERYTHING (organizer mentalnoise_e), piece "Muñeco de Año Viejo: Poverty + Despair," objkt, 9000 editions',
        links: [
          {
            label: "Drop post (video + art)",
            url: "https://x.com/EmpressTrash/status/2006450594773397867",
          }
      ],
      },
      {
        sortKey: "2025-12-14",
        date: "Dec 2025",
        entry:
          'Short film / residency work "The Comet" immersive audio-reactive installation, Un Sueño Digital / Sincretismo Digital Art Residency exhibition, Mexico City, Mexico',
        links: [
          {
            label: "Opening night (photos + video)",
            url: "https://x.com/EmpressTrash/status/2000230719260377456",
          },
          {
            label: "The Comet (film)",
            url: "https://www.youtube.com/watch?v=g0jNJTDuceE",
          },
          {
            label: "Residency reflections",
            url: "https://paragraph.com/@empresstrash/reflections-on-sincretismo-digital-art-residency-birthing-the-comet-in-mexico-city",
          }
      ],
      },
      {
        sortKey: "2025-12-08",
        date: "Dec 2025",
        entry: "Completed Damsels collection",
        links: [
          {
            label: "Birth of Damsels",
            url: "https://paragraph.com/@empresstrash/the-birth-of-damsels-1",
          },
          {
            label: "Damsels part deux",
            url: "https://paragraph.com/@empresstrash/damsels-part-deux",
          },
          {
            label: "ETH collection",
            url: "https://opensea.io/collection/damsels",
          }
      ],
      },
      {
        sortKey: "2025-12-05",
        date: "Dec 2025",
        entry:
          'Commissioned drop "Yule Log 2025" with betrmint / Fireside, bp.fun',
        links: [
          {
            label: "Commission post (video)",
            url: "https://x.com/EmpressTrash/status/1997065573126062116",
          },
          {
            label: "Yule log preview",
            url: "https://x.com/EmpressTrash/status/1997070301075497335",
          }
      ],
      },
      {
        sortKey: "2025-12-19",
        date: "Dec 2025",
        entry:
          "Featured artist + interview, TezosCommons Artz Friday spaces",
        links: [
          {
            label: "Tezos Commons Artz Friday feature",
            url: "https://x.com/TezosCommons/status/2002082390081241284",
          },
          {
            label: "Tezos Commons spaces invite",
            url: "https://x.com/TezosCommons/status/2001715399914639416",
          },
          {
            label: "Spaces announcement",
            url: "https://x.com/EmpressTrash/status/2001717411125563394",
          },
        ],
      },
      {
        sortKey: "2025-10-01",
        date: "Oct 2025",
        entry:
          'Short film "Dance of the Skeletons," Las Flores Web3 Film Festival, Canadian Consulate, Mexico City, Mexico',
        links: [
          {
            label: "Screening note",
            url: "https://x.com/EmpressTrash/status/1983251841824723241",
          }
      ],
      },
      {
        sortKey: "2025-10-06",
        date: "Oct 2025",
        entry:
          "Accepted to Sincretismo Digital Art Residency, Wait and Hope Foundation, Mexico City, Mexico",
        links: [
          {
            label: "Acceptance post",
            url: "https://x.com/EmpressTrash/status/1975297119519916471",
          }
      ],
      },
      {
        sortKey: "2025-07-28",
        date: "July 2025",
        entry: "NEONCHAIN summer series drop with betrmint (Zero-G Aura)",
        links: [
          {
            label: "Zero-G Aura / NEONCHAIN post",
            url: "https://x.com/EmpressTrash/status/1949899211102728452",
          }
      ],
      },
      {
        sortKey: "2025-06-28",
        date: "June 2025",
        entry:
          '"Angel of Justice" billboard with One Love Art DAO, NFT NYC Midtown, New York, NY; Midjourney video work exhibited at Oculus Center',
        links: [
          {
            label: "Billboard mint post (video)",
            url: "https://x.com/EmpressTrash/status/1939774561777516954",
          },
          {
            label: "Angel of Justice live on Highlight",
            url: "https://x.com/EmpressTrash/status/1937380898200048005",
          },
          {
            label: "Oculus / One Love Midjourney video note",
            url: "https://x.com/EmpressTrash/status/1947782548404199751",
          }
      ],
      },
      {
        sortKey: "2025-05-05",
        date: "May 2025",
        entry:
          "Transmuta exhibition, Barco Utopia interactive museum, Mexico City, Mexico",
        links: [
          {
            label: "Opening night (photos + video)",
            url: "https://x.com/EmpressTrash/status/1919212149592772811",
          }
      ],
      },
      {
        sortKey: "2025-07-01",
        date: "2025",
        entry:
          "Partner Artist Ambassador for Gamma; curating drops and featured on Ordinals Calendar",
        links: [
          {
            label: "Gamma profile",
            url: "https://gamma.io/empresstrash/created",
          },
          {
            label: "Gamma glitch spotlight",
            url: "https://blog.gamma.io/ordinals-spotlight-glitch-art",
          }
      ],
      },
      {
        sortKey: "2025-06-15",
        date: "2025",
        entry:
          "Neon Noir models launch on Titles.xyz with custom AI training (ethical royalties, permissionless collabs)",
        links: [
          {
            label: "Titles profile",
            url: "https://titles.xyz/profile/313f8455-82ee-4b20-81fd-5a1a564b35cb",
          },
          {
            label: "Year highlights (Neon Noir launch)",
            url: "https://x.com/EmpressTrash/status/1994684061827183046",
          }
      ],
      },
      {
        sortKey: "2025-05-15",
        date: "2025",
        entry:
          "Debut speaking engagement, TIMEPieces spaces (artist series)",
        links: [
          {
            label: "2025 highlights (lists TIMEPieces debut)",
            url: "https://x.com/EmpressTrash/status/1994684061827183046",
          }
      ],
      },
      {
        sortKey: "2025-12-04",
        date: "Dec 2025",
        entry:
          "BrunchByFidel exhibition (presented by ClickCreate), Gates South Beach, Miami, FL",
        links: [
          {
            label: "Exhibition acceptance",
            url: "https://x.com/EmpressTrash/status/1993923081845285213",
          },
          {
            label: "Malicious Compliance on display (photo)",
            url: "https://x.com/EmpressTrash/status/1996686288381268390",
          }
      ],
      },
      {
        sortKey: "2025-01-01",
        date: "2025",
        entry:
          "Full moon airdrops to holders on Tezos and Base (ongoing)",
        links: [
          { label: "Full Moon Token page", url: "/full-moon" },
          {
            label: "Body Mapping full moon airdrop post",
            url: "https://x.com/EmpressTrash/status/2050504875205599399",
          }
      ],
      }
      ],
  },
  {
    year: "2024",
    items: [
      {
        sortKey: "2024-11-01",
        date: "Nov 2024",
        entry: "Follow the Marigolds group drop (curator), Gamma / Bitcoin Ordinals",
        links: [
          {
            label: "Sold-out post (video)",
            url: "https://x.com/EmpressTrash/status/1908036692914614666",
          },
          {
            label: "Mint-out gratitude",
            url: "https://x.com/EmpressTrash/status/1909442650547052831",
          },
          {
            label: "Gamma profile",
            url: "https://gamma.io/empresstrash/created",
          }
      ],
      },
      {
        sortKey: "2024-08-04",
        date: "Aug 2024",
        entry:
          "Times Square billboard during Summer Olympics (censorship tribute to George Carlin's 7 words), SuperchiefNFT, New York, NY",
        links: [
          {
            label: "Ordinals documentation photo",
            url: "https://x.com/EmpressTrash/status/1819980485755310422",
          },
          {
            label: "Self-censored video mint (Teia)",
            url: "https://x.com/EmpressTrash/status/1819988956525510732",
          },
          {
            label: "Instagram (Times Square photo)",
            url: "https://www.instagram.com/p/C-GhqBiy7LF/",
          }
      ],
      },
      {
        sortKey: "2024-06-10",
        date: "June 2024",
        entry:
          'AoTM curation "Whispers and Closed Doors," piece "I Love You, It\'s Ruining My Life" auctioned',
        links: [
          {
            label: "AOTM artist page",
            url: "https://aotm.gallery/artist/empress-trash/",
          },
          {
            label: "Whispers & Closed Doors collection",
            url: "https://aotm.gallery/collection/cypherpunk/",
          }
      ],
      },
      {
        sortKey: "2024-02-08",
        date: "Feb 2024",
        entry:
          "Cosomotology, Zona Maco digital display with PalmDAO and SuperchiefNFT, Mexico City, Mexico",
        links: [
          {
            label: "At the display (photo + video)",
            url: "https://x.com/EmpressTrash/status/1755426575309213982",
          },
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1752810625846149445",
          }
      ],
      },
      {
        sortKey: "2024-01-17",
        date: "Jan 2024",
        entry:
          "Belgium billboard takeover (780+ screens via ArtCrush Gallery × Clear Channel), Belgium",
        links: [
          {
            label: "ArtCrush reel post (video)",
            url: "https://x.com/EmpressTrash/status/1747667669245972755",
          }
      ],
      },
      {
        sortKey: "2024-01-01",
        date: "2024",
        entry: "Bitcoin Ordinals and Gamma Artist Ambassador",
        links: [
          {
            label: "Gamma profile",
            url: "https://gamma.io/empresstrash/created",
          },
          {
            label: "Gamma glitch spotlight",
            url: "https://blog.gamma.io/ordinals-spotlight-glitch-art",
          }
      ],
      }
      ],
  },
  {
    year: "2023",
    items: [
      {
        sortKey: "2023-12-30",
        date: "Dec 2023",
        entry:
          "Medusa / Bad Glitches Only Redux, SuperchiefNFT",
        links: [
          {
            label: "Announcement (photo)",
            url: "https://x.com/EmpressTrash/status/1740920921651560687",
          }
      ],
      },
      {
        sortKey: "2023-12-01",
        date: "Dec 2023",
        entry:
          "Spent, Cyberpunk Vol 5 at Oculus Center, SuperchiefNFT, New York, NY",
        links: [
          {
            label: "Oculus installation (photos)",
            url: "https://x.com/EmpressTrash/status/1730516400362672481",
          },
          {
            label: "FND release",
            url: "https://x.com/EmpressTrash/status/1724608567616127039",
          }
      ],
      },
      {
        sortKey: "2023-11-29",
        date: "Nov 2023",
        entry:
          "Forbes Web3 Travel Guides feature (Miami Basel digital art and crypto events)",
        links: [
          {
            label: "Forbes",
            url: "https://www.forbes.com/sites/digital-assets/2023/11/29/web3-travel-guides-top-digital-art-and-crypto-events-at-miami-basel/",
          }
      ],
      },
      {
        sortKey: "2023-11-20",
        date: "Nov 2023",
        entry:
          "AR Glitch Exhibit, Monaverse (virtual)",
      links: [
        {
          label: "2023 career highlights recap",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-11-18",
        date: "Nov 2023",
        entry:
          "Automata, Satyrus Meta Art, Inside Artificial Intelligence, Talent Garden, Rome, Italy",
        links: [
          {
            label: "Rome exhibition note",
            url: "https://x.com/EmpressTrash/status/1728839035584442449",
          },
          {
            label: "November mega exhibition schedule",
            url: "https://x.com/EmpressTrash/status/1724210769825345690",
          }
      ],
      },
      {
        sortKey: "2023-11-18-1",
        date: "Nov 2023",
        entry:
          "Rain on Me, Tokyo Solid Mexico, Nox Gallery, Monterrey, Mexico / Tokyo, Japan",
        links: [
          {
            label: "November mega exhibition schedule",
            url: "https://x.com/EmpressTrash/status/1724210769825345690",
          }
      ],
      },
      {
        sortKey: "2023-11-02",
        date: "Nov 2–4, 2023",
        entry:
          "Tzompantli, Opuntia Art Collective, NFTFactory, Paris, France",
      links: [
        {
          label: "XOXO skull live + NFTFactory exhibition note (video)",
          url: "https://x.com/EmpressTrash/status/1719410035015733458",
        },
        {
          label: "Skull contribution announcement (video)",
          url: "https://x.com/EmpressTrash/status/1717598146061377572",
        },
        {
          label: "Drop auctions underway (video)",
          url: "https://x.com/EmpressTrash/status/1719447242430681297",
        },
      
      ],
      },
      {
        sortKey: "2023-10-30",
        date: "Oct 2023",
        entry:
          "Here Be Dragons, WizardCon, Lawrence Fuller Private Home, \"Illuminations From The Chapel,\" Los Angeles, CA",
        links: [
          {
            label: "Void / Here Be Dragons announcement (video)",
            url: "https://x.com/EmpressTrash/status/1728120551535964317",
          }
      ],
      },
      {
        sortKey: "2023-10-27",
        date: "Oct 2023 – Feb 2024",
        entry:
          "The Poetry of The Blockchain, Flux Collective, SAP HQ, Walldorf, Germany",
      links: [
        {
          label: "2023 career highlights recap (lists Poetry of The Blockchain)",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-10-19",
        date: "Oct 2023",
        entry:
          "The Golden Age, Mint Gold Dust × SuperChief",
      links: [
        {
          label: "2023 career highlights recap (lists Golden Age)",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        },
        {
          label: "Mint Gold Dust feature",
          url: "https://www.mintgolddust.com/blog/2023/10/12/the-future-is-rubbish-elevating-the-refuse-with-empress-trash/",
        }
      ],
      },
      {
        sortKey: "2023-10-12",
        date: "Oct 2023",
        entry:
          "The Future is Rubbish: Elevating the Refuse with Empress Trash, Mint Gold Dust",
        links: [
          {
            label: "Mint Gold Dust",
            url: "https://www.mintgolddust.com/blog/2023/10/12/the-future-is-rubbish-elevating-the-refuse-with-empress-trash/",
          }
      ],
      },
      {
        sortKey: "2023-10-10",
        date: "Oct 2023",
        entry:
          "Childhood Dreams, fundraiser for Jack Martin Division of Pediatric Hematology & Oncology at Mt. Sinai Hospital, New York, NY",
        links: [
          {
            label: "Exhibition",
            url: "https://exchange.art/allisonjoyful/exhibition",
          }
      ],
      },
      {
        sortKey: "2023-10-07",
        date: "Oct–Dec 2023",
        entry:
          "FU:BAR GLITCH ART FESTIVAL, MaMa Zagreb + virtual, Zagreb, Croatia",
        links: [
          {
            label: "FUBAR.space",
            url: "https://fubar.space/2023/expo-art/",
          }
      ],
      },
      {
        sortKey: "2023-09-26",
        date: "Sept 2023",
        entry:
          "Digital Disobedience, Click Create (virtual)",
        links: [
          {
            label: "Click Create talk",
            url: "https://www.youtube.com/watch?v=zYMzy0dYloY",
          }
      ],
      },
      {
        sortKey: "2023-09-18",
        date: "Sept 2023",
        entry:
          "How Empress Trash's Career Blew Up in 2023, Makersplace",
        links: [
          {
            label: "2023 career highlights recap",
            url: "https://x.com/EmpressTrash/status/1722734076833026337",
          }
      ],
      },
      {
        sortKey: "2023-09-15",
        date: "Sept 2023",
        entry:
          "People of Tezos: Here + Now (virtual)",
      links: [
        {
          label: "2023 career highlights recap",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-09-06",
        date: "Sept 2023",
        entry:
          "Capitulation, Double Frieze billboard exhibition, Seoul, South Korea",
        links: [
          {
            label: "First billboard post (video)",
            url: "https://x.com/EmpressTrash/status/1698668803792711726",
          }
      ],
      },
      {
        sortKey: "2023-09-01",
        date: "Sept 1–8, 2023",
        entry:
          "Patchwork Glitch, curator and exhibitor, imNOTART, Chicago, IL + virtual",
      links: [
        {
          label: "imnotArt year highlight (co-curation)",
          url: "https://x.com/EmpressTrash/status/1740895547350028346",
        },
        {
          label: "2023 career highlights recap",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-09-01-1",
        date: "Sept 2023 – ongoing",
        entry:
          "Permissionless Pop Up Gallery, Seoul, Milan, Prague",
      links: [
        {
          label: "Permissionless 64-gal gallery (video)",
          url: "https://x.com/EmpressTrash/status/1728529810870390976",
        },
        {
          label: "Always Watching You / permissionless Miami",
          url: "https://x.com/EmpressTrash/status/1728741397073936524",
        }
      ],
      },
      {
        sortKey: "2023-08-07",
        date: "Aug 7 – Sept 18, 2023",
        entry:
          "NEO Noir Cycle, Artist in Residence, Makersplace (virtual)",
        links: [
        {
          label: "AIR reflection (video + photo)",
          url: "https://x.com/EmpressTrash/status/1704506518119297097",
        },
        {
          label: "The Crone / final cycle drop",
          url: "https://x.com/EmpressTrash/status/1704083008918097982",
        },
          {
            label: "2023 career highlights recap (lists Makersplace AIR)",
            url: "https://x.com/EmpressTrash/status/1722734076833026337",
          }
      ],
      },
      {
        sortKey: "2023-07-25",
        date: "July 2023",
        entry:
          "ARTTOWN Digital Art Showcase: Art on the Blockchain, Noble Parlor, Reno, NV",
      links: [
        {
          label: "Reno display announcement (video)",
          url: "https://x.com/EmpressTrash/status/1683916326274846720",
        },
        {
          label: "Reno + Tokyo recap day",
          url: "https://x.com/EmpressTrash/status/1683984989032157184",
        }
      ],
      },
      {
        sortKey: "2023-07-22",
        date: "July 2023",
        entry:
          "Cyberpunk Vol 5, Superchief, Miami, FL",
        links: [
          {
            label: "Cyberpunk Vol 5 FND world",
            url: "https://x.com/EmpressTrash/status/1740533160742637643",
          }
      ],
      },
      {
        sortKey: "2023-07-21",
        date: "July 2023",
        entry:
          "Cyberpunk Vol 5, Superchief × IHAM Gallery, Paris, France",
      links: [
        {
          label: "Paris IHAM display (video)",
          url: "https://x.com/EmpressTrash/status/1682769389483970561",
        },
        {
          label: "Paris video from Vandal",
          url: "https://x.com/EmpressTrash/status/1682588766144192512",
        }
      ],
      },
      {
        sortKey: "2023-07-21-1",
        date: "July 2023",
        entry:
          "Cyberpunk Vol 5, Superchief × Nox Gallery, Tokyo, Japan",
      links: [
        {
          label: "Tokyo Nox display announcement (video)",
          url: "https://x.com/EmpressTrash/status/1683969310182764547",
        },
        {
          label: "FND world listing",
          url: "https://x.com/EmpressTrash/status/1740533160742637643",
        }
      ],
      },
      {
        sortKey: "2023-07-14",
        date: "July 14–15, 2023",
        entry:
          "Cyberpunk Vol 5, Superchief @ NFT Show Europe, Valencia, Spain",
      links: [
        {
          label: "Valencia display pics (video)",
          url: "https://x.com/EmpressTrash/status/1679805820182343682",
        },
        {
          label: "Valencia display video + mint",
          url: "https://x.com/EmpressTrash/status/1681387502907555857",
        },
        {
          label: "Tour dates + Equilibrium",
          url: "https://x.com/EmpressTrash/status/1680242931100418050",
        }
      ],
      },
      {
        sortKey: "2023-06-07",
        date: "June 7–17, 2023",
        entry:
          "Hearts + Glitches, Aeon Studio @ Uncommon Gallery, Seoul, South Korea",
      links: [
        {
          label: "Seoul + Milan same day (photos)",
          url: "https://x.com/EmpressTrash/status/1666613093189943296",
        },
        {
          label: "Seoul opening day",
          url: "https://x.com/EmpressTrash/status/1666492611019051008",
        }
      ],
      },
      {
        sortKey: "2023-06-07-1",
        date: "June 2023",
        entry:
          "NFT Milan, Milan, Italy",
      links: [
        {
          label: "Human Rights//Down Bad in Milan",
          url: "https://x.com/EmpressTrash/status/1666492611019051008",
        },
        {
          label: "Seoul, Milan, Lisbon correction (video)",
          url: "https://x.com/EmpressTrash/status/1668713306222374912",
        }
      ],
      },
      {
        sortKey: "2023-06-07-0",
        date: "June 2023",
        entry:
          "Superchief Bad Glitches Only, NFC Summit, Lisbon, Portugal",
      links: [
        {
          label: "Seoul, Milan, Lisbon same time (video)",
          url: "https://x.com/EmpressTrash/status/1668713306222374912",
        },
        {
          label: "Foundation world",
          url: "https://foundation.app/world/bad-glitches-only",
        }
      ],
      },
      {
        sortKey: "2023-05-17",
        date: "May 17 – June 16, 2023",
        entry:
          "The Pixel Generation, Unit London × Right Click Save, London, UK",
        links: [
          {
            label: "Unit London",
            url: "https://unitlondon.com/voices/the-pixel-generation/",
          }
      ],
      },
      {
        sortKey: "2023-05-13",
        date: "May 2023 – ongoing",
        entry:
          "Vault + On Display, Colonna Contemporary, Philadelphia, PA",
      links: [
        {
          label: "2023 career highlights recap",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-05-06",
        date: "May 2023",
        entry:
          "Superchief Bad Glitches Only, co-curator and exhibitor, NFT Rome, Rome, Italy",
        links: [
        {
          label: "Rome exhibition pics/video",
          url: "https://x.com/EmpressTrash/status/1656746925050195987",
        },
        {
          label: "Co-curator announcement",
          url: "https://x.com/EmpressTrash/status/1651713991549362179",
        },
          {
            label: "Foundation world",
            url: "https://foundation.app/world/bad-glitches-only",
          }
      ],
      },
      {
        sortKey: "2023-04-19",
        date: "April 2023",
        entry:
          "#tezartconnect AR exhibition, Oslo, Norway",
        links: [
          {
            label: "Legacy press archive",
            url: "https://empresstrash.neocities.org/press.html",
          },
        ],
      },
      {
        sortKey: "2023-04-14",
        date: "April 14–16, 2023",
        entry:
          "Human Rights//Down Bad, Sotheby's Glitch: Beyond Binary, Sotheby's HQ, New York, NY",
        links: [
          {
            label: "Sotheby's lot",
            url: "https://www.sothebys.com/buy/a1af7125-fba4-48fa-b6cf-cb33ace50122/lots/722378bd-c906-4eae-9155-8a65acf34d5e",
          },
          {
            label: "SuperRare artwork",
            url: "https://superrare.com/artwork/eth/0x1259BA696527156C3B1cbdFC74243edBD57F1a82/1",
          },
          {
            label: "Auction announcement (video)",
            url: "https://x.com/EmpressTrash/status/1648477129989033984",
          },
          {
            label: "NFT Now coverage",
            url: "https://nftnow.com/features/sothebys-all-male-auction-shouldnt-surprise-web3/",
          }
      ],
      },
      {
        sortKey: "2023-04-13",
        date: "April 2023",
        entry:
          "Makersplace × King of Midtown Crypto Gallery, New York, NY",
      links: [
        {
          label: "NYC week schedule (King of Midtown)",
          url: "https://x.com/EmpressTrash/status/1644742664703848448",
        },
        {
          label: "Palm Dao photos + crypto gallery note",
          url: "https://x.com/EmpressTrash/status/1650857569806872584",
        }
      ],
      },
      {
        sortKey: "2023-04-12",
        date: "April 2023",
        entry:
          "Wwx3 Reprisal, Glass Ceiling Nomad, New York, NY",
      links: [
        {
          label: "NYC week schedule (Wwx3)",
          url: "https://x.com/EmpressTrash/status/1644742664703848448",
        }
      ],
      },
      {
        sortKey: "2023-04-12-1",
        date: "April 2023",
        entry:
          "Palm DAO × Pussy Riot Feminist Art Show, Lume Studios, New York, NY",
      links: [
        {
          label: "Palm DAO walls (largest IRL display)",
          url: "https://x.com/EmpressTrash/status/1651982793692389379",
        },
        {
          label: "Palm DAO video + photos",
          url: "https://x.com/EmpressTrash/status/1650857569806872584",
        },
        {
          label: "NYC week schedule",
          url: "https://x.com/EmpressTrash/status/1644742664703848448",
        }
      ],
      },
      {
        sortKey: "2023-04-11",
        date: "April 11–13, 2023",
        entry:
          "Frogs of Fiat, Fake Gallery, Tribeca, New York, NY",
      links: [
        {
          label: "NYC week schedule (Frogs over Fiat)",
          url: "https://x.com/EmpressTrash/status/1644742664703848448",
        }
      ],
      },
      {
        sortKey: "2023-04-11-1",
        date: "April 2023",
        entry:
          "Tezos Connect NFT Gallery, New York, NY",
      links: [
        {
          label: "NYC week schedule (Tezos Connect AR)",
          url: "https://x.com/EmpressTrash/status/1644742664703848448",
        }
      ],
      },
      {
        sortKey: "2023-04-01",
        date: "2023",
        entry:
          "Ozzy Osbourne CryptoBatz collab",
      links: [
        {
          label: "AncientBatz / CryptoBatz honor post",
          url: "https://x.com/EmpressTrash/status/2021030582575071727",
        },
        {
          label: "Aries recap (AncientBatz collab)",
          url: "https://x.com/EmpressTrash/status/1649195564217540610",
        },
        {
          label: "Pussy Riot + AncientBatz week",
          url: "https://x.com/EmpressTrash/status/1645091981591482369",
        }
      ],
      },
      {
        sortKey: "2023-03-29",
        date: "March 2023",
        entry:
          "Let's Get Trashed, Makersplace",
        links: [
          {
            label: "2023 career highlights recap",
            url: "https://x.com/EmpressTrash/status/1722734076833026337",
          }
      ],
      },
      {
        sortKey: "2023-03-22",
        date: "March 2023",
        entry:
          "Next Up: Five Ones to Watch, NFT Now",
        links: [
          {
            label: "NFT Now",
            url: "https://nftnow.com/features/next-up-five-ones-to-watch-in-march-2023/",
          }
      ],
      },
      {
        sortKey: "2023-03-03",
        date: "March 2023",
        entry:
          "Underground Violet Rave, Denver, CO",
      links: [
        {
          label: "2023 career highlights recap",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-02-24",
        date: "Feb 2023",
        entry:
          "NFT Factory Paris — Wwx3 × Makersplace exhibition, Paris, France",
      links: [
        {
          label: "2023 career highlights recap (lists Paris Makersplace)",
          url: "https://x.com/EmpressTrash/status/1722734076833026337",
        }
      ],
      },
      {
        sortKey: "2023-01-23",
        date: "Jan 23–25, 2023",
        entry:
          "Oshi Gallery Subgenre: Glitch, Melbourne / Nifty Gateway",
        links: [
          {
            label: "Nifty Gateway collection",
            url: "https://www.niftygateway.com/collections/oshi_subgenre_glitch",
          }
      ],
      },
      {
        sortKey: "2023-01-01",
        date: "2023 – ongoing",
        entry:
          "Felix Felix Felix Gallery (multiple locations)",
        links: [
          {
            label: "Felix Felix Felix",
            url: "https://www.felixfelixfelix.com/gallery",
          }
      ],
      },
      {
        sortKey: "2023-02-21",
        date: "2023",
        entry:
          "DOS Punk DAO artist and benefactor (with Jon Cates)",
        links: [
          {
            label: "DOS DAO discussions, pt. 1",
            url: "https://joncates.medium.com/empress-trash-dos-dao-discussions-part-one-a1a093f1dd8a",
          },
          {
            label: "DOS DAO discussions, pt. 2",
            url: "https://joncates.medium.com/empress-trash-dos-dao-discussions-part-two-b7046bdae595",
          }
      ],
      }
      ],
  },
  {
    year: "2022",
    items: [
      {
        sortKey: "2022-12-21",
        date: "Dec 2022",
        entry:
          "#teztrash saves christmas, Tezos drop (222 editions)",
        links: [
          {
            label: "Drop post (video)",
            url: "https://x.com/EmpressTrash/status/1605708753071898625",
          }
      ],
      },
      {
        sortKey: "2022-12-20",
        date: "Dec 2022",
        entry:
          "Damsels exhibited in Paris (first bonafide international gallery exhibition)",
        links: [
          {
            label: "Damsels in Paris (video)",
            url: "https://x.com/EmpressTrash/status/1605079686723145729",
          },
          {
            label: "First international exhibit note",
            url: "https://x.com/EmpressTrash/status/1604534199540539392",
          }
      ],
      },
      {
        sortKey: "2022-12-01",
        date: "Dec 1–4, 2022",
        entry:
          "Age of Aquarius, Miami Art Week group show + drop, Nifty Gateway × Spatial, Miami, FL",
        links: [
          {
            label: "Spatial exhibition",
            url: "https://www.spatial.io/s/Age-of-Aquarius-Miami-Art-Week-Exhibition-637d3af24297a9000151215a?share=4162247702037910055",
          },
          {
            label: "Miami host thank-you",
            url: "https://x.com/EmpressTrash/status/1605247228381081600",
          }
      ],
      },
      {
        sortKey: "2022-11-17",
        date: "Nov 2022",
        entry:
          "Paris Photo Fair, Felix Felix Felix Gallery, Paris, France",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1593284739820986370",
          }
      ],
      },
      {
        sortKey: "2022-11-13",
        date: "Nov 2022",
        entry:
          "#RIPHEN anniversary; Tezos NFT community celebration of HEN era",
        links: [
          {
            label: "RIPHEN post",
            url: "https://x.com/EmpressTrash/status/1591597914002190339",
          }
      ],
      },
      {
        sortKey: "2022-11-11",
        date: "Nov 2022",
        entry:
          "Person on the Internet (virtual)",
        links: [
          {
            label: "Feature note",
            url: "https://x.com/estelle_flores_/status/1579984002374852609",
          }
      ],
      },
      {
        sortKey: "2022-11-07",
        date: "Nov 2022",
        entry:
          "NonNFT Summit, exhibited + speaker, Mexico City, Mexico",
        links: [
          {
            label: "KnownOrigin post",
            url: "https://x.com/KnownOrigin_io/status/1589711032737419264",
          }
      ],
      },
      {
        sortKey: "2022-11-01",
        date: "Nov 1–5, 2022",
        entry:
          "New Rares: Vol. 3, curated by WMP (virtual)",
        links: [
          {
            label: "jpg.space exhibition",
            url: "https://jpg.space/WMP/exhibition/New-Rares%3A-Vol.-3",
          }
      ],
      },
      {
        sortKey: "2022-10-28",
        date: "Oct 2022",
        entry:
          "HNFT Fests, Felix Felix Felix Gallery, Barcelona, Spain",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1585982792004878336",
          }
      ],
      },
      {
        sortKey: "2022-10-27",
        date: "Oct 27 – Nov 22, 2022",
        entry:
          "Excedrin × Makersplace EqualBytes Program, curator",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1585768871117496320",
          }
      ],
      },
      {
        sortKey: "2022-09-15",
        date: "Sept 15–25, 2022",
        entry:
          "SuperRare SoHo Gallery, SoHo, New York, NY",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1572293353466642432",
          }
      ],
      },
      {
        sortKey: "2022-08-01",
        date: "Aug 2022",
        entry:
          "DOS Punk DAO Artist of the Month (virtual)",
        links: [
          {
            label: "OnCyber gallery",
            url: "https://oncyber.io/dospunksdao_empresstrash",
          }
      ],
      },
      {
        sortKey: "2022-07-01",
        date: "July 2022",
        entry:
          "KnownOrigin DCL Pride Collection, curated by FoodMasku (virtual)",
        links: [
          {
            label: "KnownOrigin post",
            url: "https://x.com/KnownOrigin_io/status/1542901409657638913",
          }
      ],
      },
      {
        sortKey: "2022-06-25",
        date: "June 2022",
        entry:
          "METAPRIDELAND, NYC Pride, New York, NY",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1540808756996366336",
          }
      ],
      },
      {
        sortKey: "2022-06-23",
        date: "June 2022",
        entry:
          "Stratosphere, curated by Sabet, NFT NYC, New York, NY",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1537599723032301568",
          }
      ],
      },
      {
        sortKey: "2022-06-22",
        date: "June 2022",
        entry:
          "Refraction DAO Festival, New York, NY",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1539733159532646400",
          }
      ],
      },
      {
        sortKey: "2022-06-21",
        date: "June 21–23, 2022",
        entry:
          "Shillr Billboard Van, NFT NYC, New York, NY",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1550236706032726017",
          }
      ],
      },
      {
        sortKey: "2022-06-21-1",
        date: "June 21–22, 2022",
        entry:
          "Visibility Gallery, 50MM Collective, NFT NYC, New York, NY",
        links: [
          {
            label: "Announcement",
            url: "https://x.com/EmpressTrash/status/1537599719760728064",
          }
      ],
      },
      {
        sortKey: "2022-06-21-0",
        date: "June 2022",
        entry:
          "FigureGlyphs AR, Times Square / NFT NYC, New York, NY",
        links: [
          {
            label: "SearchNFTs post",
            url: "https://x.com/SearchNFTs/status/1537846434468450309",
          },
          {
            label: "Edition Hotel Times Square note",
            url: "https://x.com/EmpressTrash/status/1539324121955201028",
          }
      ],
      },
      {
        sortKey: "2022-06-20",
        date: "June 2022",
        entry:
          "Damsels collection milestone (333 of 666 complete; multi-chain ETH + Tezos)",
        links: [
          {
            label: "Compilation video",
            url: "https://x.com/EmpressTrash/status/1539067081580085249",
          },
          {
            label: "OpenSea collection",
            url: "https://opensea.io/collection/damsels",
          }
      ],
      },
      {
        sortKey: "2022-05-30",
        date: "May 2022",
        entry:
          "Outer Realm NFT Podcast: Independence, Childhood Emancipation, and Damsels",
        links: [
          {
            label: "Podcast episode",
            url: "https://www.theouterrealm.io/podcast/episode-41-empress-trash-on-independence-childhood-emancipation-and-damsels",
          }
      ],
      },
      {
        sortKey: "2022-05-16",
        date: "May 2022",
        entry:
          "Full Moon Token launch, Hic et Nunc / Tezos (111 editions; ongoing full-moon airdrops)",
        links: [
          {
            label: "Full Moon Token page",
            url: "/full-moon",
          },
          {
            label: "Token on Tezos (Raster)",
            url: "https://raster.art/artwork/empress-trashs-full-moon-token-by-empress-trash-full-moon-token",
          }
      ],
      },
      {
        sortKey: "2022-05-12",
        date: "May 12 – Aug 22, 2022",
        entry:
          "FigureGlyphs, SearchLight Atelier, Cryptovoxels (virtual)",
        links: [
          {
            label: "SearchLight FigureGlyphs",
            url: "https://www.searchlight.art/figureglyphs",
          }
      ],
      },
      {
        sortKey: "2022-05-01",
        date: "May 2022",
        entry:
          "smolNFT movement (HEN / Tezos); featured in VerticalCrypto and WonderMundo",
        links: [
          {
            label: "WonderMundo",
            url: "https://wondermundo.medium.com/the-real-truth-behind-the-smolnft-movement-82fe57e4eb38",
          }
      ],
      },
      {
        sortKey: "2022-04-13",
        date: "April 2022",
        entry:
          "Glass Ceiling Disco, TED Talks conference — NFT Culture \"The Kids Are Alright,\" Vancouver, Canada",
        links: [
          {
            label: "TED exhibition announcement (photo)",
            url: "https://x.com/EmpressTrash/status/1514265884931489793",
          },
          {
            label: "NFT Culture TED",
            url: "https://www.nftculture.com/ted/",
          }
      ],
      },
      {
        sortKey: "2022-04-13-1",
        date: "April 2022",
        entry:
          "FylthyTrash Trash Art Exhibit, Los Angeles, CA",
        links: [
          {
            label: "YouTube documentary",
            url: "https://www.youtube.com/watch?v=RMxq9-hJbMU",
          },
          {
            label: "Same-day TED + dumpster post",
            url: "https://x.com/EmpressTrash/status/1514282266389753859",
          }
      ],
      },
      {
        sortKey: "2022-04-02",
        date: "April 2022",
        entry:
          "NFT.LA, Women.NFT: speaker / exhibited, Los Angeles, CA",
      links: [
        {
          label: "Women.NFT LA show note",
          url: "https://x.com/EmpressTrash/status/1508475860277469184",
        }
      ],
      },
      {
        sortKey: "2022-03-29",
        date: "March 29 – April 2, 2022",
        entry:
          "imnotArt Community Gallery #18, Los Angeles, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2022-03-26",
        date: "March 26 – May 28, 2022",
        entry:
          "#trashart: NFT Garbology, L'Avant Galerie Vossen, Paris, France",
        links: [
          {
            label: "Avant Galerie",
            url: "https://avant-galerie.com/en/trashart-nft-garbology",
          }
      ],
      },
      {
        sortKey: "2022-03-16",
        date: "March 2022",
        entry:
          "SXSW Women's Exhibition, The Cyvrverse Experience, South Congress Hotel, Austin, TX",
        links: [
          {
            label: "SXSW / TED exhibition history",
            url: "https://x.com/EmpressTrash/status/1514354552442552320",
          }
      ],
      },
      {
        sortKey: "2022-02-21",
        date: "Feb 2022",
        entry:
          "Artist Interview: Empress Trash, NFT Culture",
        links: [
          {
            label: "NFT Culture interview",
            url: "https://www.nftculture.com/nft-art/artist-interview-empress-trash/",
          }
      ],
      },
      {
        sortKey: "2022-02-01",
        date: "2022",
        entry:
          "Creative Commons Global Summit, speaking on crypto art and #cc0 ethos",
        links: [
          {
            label: "CC Global Summit talk",
            url: "https://www.youtube.com/watch?v=dcYwLPeDHYI",
          }
      ],
      },
      {
        sortKey: "2022-01-14",
        date: "Jan 2022",
        entry:
          "Collectors Crew (Hensday shill thread revival with ToppyEton and WonderMundo), Tezos community",
        links: [
          {
            label: "Collectors Crew launch",
            url: "https://x.com/EmpressTrash/status/1482058760054984704",
          }
      ],
      },
      {
        sortKey: "2022-01-07",
        date: "Jan 2022",
        entry:
          "XoB Stay Frosty 2022, group exhibition, Cryptovoxels (virtual)",
      links: [
        {
          label: "Stay Frosty mention",
          url: "https://x.com/EmpressTrash/status/1479348273601081347",
        }
      ],
      },
      {
        sortKey: "2022-01-01",
        date: "2022",
        entry:
          "GIPHY Arts Presents: Artists to Watch for 2023 (coverage of 2022 work)",
        links: [
          {
            label: "GIPHY Arts",
            url: "https://giphy.medium.com/giphy-arts-presents-artists-to-watch-for-2023-f397edce9552",
          }
      ],
      }
      ],
  },
  {
    year: "2021",
    items: [
      {
        sortKey: "2021-12-29",
        date: "Dec 2021",
        entry:
          "Damsels primary sales on OpenSea (ETH); multi-chain collection continues",
        links: [
          {
            label: "OpenSea primary post (video)",
            url: "https://x.com/EmpressTrash/status/1476105933860130818",
          },
          {
            label: "OpenSea collection",
            url: "https://opensea.io/collection/damsels",
          },
          {
            label: "Birth of Damsels",
            url: "https://paragraph.com/@empresstrash/the-birth-of-damsels-1",
          }
      ],
      },
      {
        sortKey: "2021-12-30",
        date: "Dec 2021",
        entry:
          "Dick Tits collab with DickspoFrens, Hic et Nunc (charity to ZEROCancer)",
        links: [
          {
            label: "Collab post (video)",
            url: "https://x.com/EmpressTrash/status/1476664358201540616",
          }
      ],
      },
      {
        sortKey: "2021-11-28",
        date: "Nov 28 – Dec 5, 2021",
        entry:
          "Art Basel, Fort NFT Gallery Metavirtual, Miami, FL",
        links: [
          {
            label: "Legacy press archive",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2021-11-01",
        date: "Nov 1–4, 2021",
        entry:
          "BBStudio + SearchLight.art, Mask Ephemera, Decentraland & New York, NY",
        links: [
          {
            label: "YouTube",
            url: "https://www.youtube.com/watch?v=5texaja3jR8",
          }
      ],
      },
      {
        sortKey: "2021-10-23",
        date: "Oct 2021",
        entry:
          "Flat Black Gallery, EVENT: Horizon, Palm Springs, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2021-09-30",
        date: "Sept 2021",
        entry:
          "Buy Art, Save Kittens, charity show for Kitty Bungalow, curated by Coldie, Cryptovoxels (virtual)",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2021-09-28",
        date: "Sept 28 – Nov 1, 2021",
        entry:
          "XoB Crypto Punks With Lunch, Artist in Residence exhibit, Cryptovoxels (virtual)",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        },
        {
          label: "DOS Punk OnCyber gallery",
          url: "https://oncyber.io/dospunksdao_empresstrash",
        }
      ],
      },
      {
        sortKey: "2021-08-11",
        date: "Aug 2021",
        entry:
          "Escaping a Real-Life Hell with Art, Counter Arts / Medium feature",
        links: [
          {
            label: "Medium article",
            url: "https://medium.com/counterarts/escaping-a-real-life-hell-with-art-bb794657bf57",
          }
      ],
      },
      {
        sortKey: "2021-07-28",
        date: "July 2021",
        entry:
          "Fort NFT Gallery, This Must Be The Place, Cryptovoxels (virtual)",
        links: [
          {
            label: "Legacy press archive",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2021-07-19",
        date: "July 2021",
        entry:
          "Drowning in Confetti collab (Empress Trash × MxSpite × Sleepylesbee), Foundation",
        links: [
          {
            label: "Foundation drop post (video)",
            url: "https://x.com/EmpressTrash/status/1416928965491519492",
          }
      ],
      },
      {
        sortKey: "2021-07-08",
        date: "July 8–11, 2021",
        entry:
          "Crypto Jazz Festival, MetaJax, Newport Beach, CA & virtual",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2021-06-28",
        date: "June 2021",
        entry:
          "BBStudios (ArtOrDai) interview & exhibition, Cryptovoxels (virtual)",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2021-06-18",
        date: "June 2021",
        entry:
          "smolNFT / Hic et Nunc community leadership; top Tezos influencer week",
        links: [
          {
            label: "HEN shopping / smolNFT post",
            url: "https://x.com/EmpressTrash/status/1405693392500137984",
          },
          {
            label: "WonderMundo smolNFT feature",
            url: "https://wondermundo.medium.com/the-real-truth-behind-the-smolnft-movement-82fe57e4eb38",
          }
      ],
      },
      {
        sortKey: "2021-03-21",
        date: "March 2021",
        entry:
          "Entry into crypto art; first NFT sales; Damsels collection begins (slow release; 10% to BAWS)",
        links: [
          {
            label: "Early shill / collector post",
            url: "https://x.com/EmpressTrash/status/1373780733672660992",
          },
          {
            label: "NFT Culture interview (career start)",
            url: "https://www.nftculture.com/nft-art/artist-interview-empress-trash/",
          },
          {
            label: "Birth of Damsels",
            url: "https://paragraph.com/@empresstrash/the-birth-of-damsels-1",
          }
      ],
      },
      {
        sortKey: "2021-03-01",
        date: "2021",
        entry:
          "Co-founded / co-built communities: Fam Jam, Smol Movement, Collectors Crew; DOS Punks DAO participation",
        links: [
          {
            label: "NFT Culture interview",
            url: "https://www.nftculture.com/nft-art/artist-interview-empress-trash/",
          },
          {
            label: "DOS DAO discussions, pt. 1",
            url: "https://joncates.medium.com/empress-trash-dos-dao-discussions-part-one-a1a093f1dd8a",
          }
      ],
      }
      ],
  },
  {
    year: "2019–2020",
    items: [
      {
        sortKey: "2020-06-07",
        date: "June 2020",
        entry:
          "Red Light Art Show, organizer/curator, Oakland, CA",
        links: [
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2020-04-15",
        date: "April 2020",
        entry:
          "Create//Destroy, co-exhibit with Dangercat, Oakland, CA",
        links: [
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2019-02-14",
        date: "Feb 2019",
        entry:
          "Art Will Never Break Your Heart, solo exhibition, Oakland, CA",
        links: [
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2019-01-01",
        date: "Jan 2019",
        entry:
          "NY Day Show, solo exhibition, Oakland, CA",
        links: [
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      }
      ],
  },
  {
    year: "2018",
    items: [
      {
        sortKey: "2018-09-01",
        date: "Sept 2018",
        entry:
          "Emotional Landscapes, solo exhibition, Philz Noe Valley, San Francisco, CA",
        links: [
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2018-08-28",
        date: "Aug 2018",
        entry:
          "Live painting, private wedding, Moraga, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2018-01-01",
        date: "2018",
        entry:
          "Member, Firehouse Art Collective, Bay Area, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        },
        {
          label: "Grokipedia (Firehouse / early career)",
          url: "https://grokipedia.com/page/empress-trash",
        }
      ],
      }
      ],
  },
  {
    year: "2017",
    items: [
      {
        sortKey: "2017-08-01",
        date: "Aug–Oct 2017",
        entry:
          "Exhibition, Alameda Arts, Alameda, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2017-08-01-1",
        date: "Aug 2017",
        entry:
          "I Can Breathe, solo exhibition, Snappy's Cafe, Hayward, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2017-08-01-0",
        date: "Aug 2017",
        entry:
          "Muralist, Philz Shattuck, Berkeley, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2017-03-01",
        date: "March 2017",
        entry:
          "Muralist, Philz Gilman, Berkeley, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2017-01-01",
        date: "2017",
        entry:
          "Member, Firehouse Art Collective, Bay Area, CA",
        links: [
          {
            label: "Legacy press archive",
            url: "https://empresstrash.neocities.org/press.html",
          },
          {
            label: "Grokipedia (Firehouse / early career)",
            url: "https://grokipedia.com/page/empress-trash",
          }
      ],
      }
      ],
  },
  {
    year: "2016",
    items: [
      {
        sortKey: "2016-08-10",
        date: "Aug 10–12, 2016",
        entry:
          "Gilman Art Walk, Berkeley, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2016-08-01",
        date: "Aug 2016",
        entry:
          "Sweet Release, solo exhibition, Philz Gilman, Berkeley, CA",
        links: [
          {
            label: "Grokipedia (notable exhibitions)",
            url: "https://grokipedia.com/page/empress-trash",
          },
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2016-07-01",
        date: "July 2016",
        entry:
          "Exhibition, Jack of All Trades, Oakland, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2016-05-01",
        date: "May 2016",
        entry:
          "Exhibition, Bothwell Arts Center, Livermore, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2016-04-01",
        date: "April 1–10, 2016",
        entry:
          "Dimond Public Art: Art in the Streets, Oakland, CA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2016-01-01",
        date: "2016",
        entry:
          "Member, Firehouse Art Collective, Bay Area, CA",
        links: [
          {
            label: "Legacy press archive",
            url: "https://empresstrash.neocities.org/press.html",
          },
          {
            label: "Grokipedia (Firehouse / early career)",
            url: "https://grokipedia.com/page/empress-trash",
          }
      ],
      }
      ],
  },
  {
    year: "2015",
    items: [
      {
        sortKey: "2015-06-01",
        date: "2015",
        entry:
          "Various Bay Area collaborations and underground curations; Firehouse Art Collective",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        },
        {
          label: "Grokipedia",
          url: "https://grokipedia.com/page/empress-trash",
        }
      ],
      }
      ],
  },
  {
    year: "2013–2014",
    items: [
      {
        sortKey: "2014-09-01",
        date: "Sept 2014 – 2015",
        entry:
          "Assistant, Ai Weiwei @ Large, Alcatraz Island, San Francisco, CA",
        links: [
          {
            label: "Grokipedia",
            url: "https://grokipedia.com/page/empress-trash",
          },
          {
            label: "Legacy press page",
            url: "https://empresstrash.neocities.org/press.html",
          }
      ],
      },
      {
        sortKey: "2014-05-01",
        date: "May 2014",
        entry:
          "Gingham Check, BFA solo exhibition, SAAH, Iowa City, IA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        },
        {
          label: "Grokipedia",
          url: "https://grokipedia.com/page/empress-trash",
        }
      ],
      },
      {
        sortKey: "2014-05-02",
        date: "May 2014",
        entry:
          "Nature Icons, solo exhibition, Old Brick Artist Series, Iowa City, IA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2014-05-03",
        date: "May 2014",
        entry:
          "Honors Group Exhibition, University of Iowa, Iowa City, IA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        },
        {
          label: "Grokipedia",
          url: "https://grokipedia.com/page/empress-trash",
        }
      ],
      },
      {
        sortKey: "2014-05-04",
        date: "May 2014",
        entry:
          "Small Works Show, Chait Gallery, Iowa City, IA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2014-04-05",
        date: "April 2014",
        entry:
          "Art Speaks, Riverbank Art Festival, Iowa City, IA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      },
      {
        sortKey: "2013-06-01",
        date: "June 2013",
        entry:
          "Emerging Artist Pavilion, Iowa City Arts Festival, Iowa City, IA",
      links: [
        {
          label: "Legacy press archive",
          url: "https://empresstrash.neocities.org/press.html",
        }
      ],
      }
      ],
  }
      ];

function sortItems(items: CvItem[]): CvItem[] {
  return [...items].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function CvEntryRow({ item }: { item: CvItem }) {
  const links = item.links ?? [];
  const multi = links.length > 1;
  const single = links.length === 1;
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const body = (
    <>
      <span className="cv-date">{item.date}</span>
      <span className="cv-sep" aria-hidden="true">
        —
      </span>
      <span className="cv-entry-text">{item.entry}</span>
    </>
  );

  if (single) {
    return (
      <li className="cv-item cv-item--linked">
        <a
          className="cv-entry-link"
          href={links[0].url}
          target={links[0].url.startsWith("http") ? "_blank" : undefined}
          rel={links[0].url.startsWith("http") ? "noopener noreferrer" : undefined}
        >
          {body}
        </a>
      </li>
    );
  }

  if (multi) {
    return (
      <li className={`cv-item cv-item--multi${open ? " is-open" : ""}`}>
        <div className="cv-multi-wrap" ref={wrapRef}>
          <button
            type="button"
            className="cv-entry-multi"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            {body}
            <span className="cv-multi-chevron" aria-hidden="true">
              {open ? "▴" : "▾"}
            </span>
          </button>
          {open && (
            <ul id={menuId} className="cv-link-menu" role="menu">
              {links.map((link) => (
                <li key={link.url} role="none">
                  <a
                    role="menuitem"
                    href={link.url}
                    target={link.url.startsWith("http") ? "_blank" : undefined}
                    rel={
                      link.url.startsWith("http")
                        ? "noopener noreferrer"
                        : undefined
                    }
                    onClick={() => setOpen(false)}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </li>
    );
  }

  return <li className="cv-item cv-item--plain">{body}</li>;
}

export default function BioPage() {
  return (
    <div className="bio-page">
      <h1>Empress Trash</h1>

      <section className="bio-intro">
        <p>
          Empress Trash (aka Dreya Jay) is a multiversatile artist experimenting at the crossroads of generative AI, crypto art, digital sovereignty, trauma alchemy, historical traditions and unfiltered expression. Rooted in glitch aesthetics and shadow work, her creations challenge hierarchies, blending web3 frontiers with introspective narratives to foster creative freedom and energetic integrity. Not for human consumption, her work invites exploration into avant-garde realms, from AI-trained models to extensive digital art creations and billboard features. Currently residing in Mexico City with her two rescue dogs, Glitch and Xochi, she continues to push boundaries in a life marked by resilience and radical self-acceptance.
        </p>
      </section>

      <section className="bio-section">
        <p>
          Born March 23, 1983, Empress Trash is a lifelong cross disciplinary artist who has created with physical and digital mediums rooting herself in traditional practices and understanding of art history while exploring and pioneering in the digital world. A survivor of childhood abuse and emancipating from her mother at 13, she transformed fucked-up isolation and chaos into a powerful creative force that critiques systemic inequities, media portrayals of femininity, intersectional feminism, consumerism, and mass media in a playfully controversial manner. Her moniker encapsulates her journey: &quot;Empress&quot; for sovereignty, &quot;Trash&quot; for origins as &quot;trailer trash.&quot;
        </p>

        <p>
          Empress Trash earned her BFA in Painting, Drawing, and Animation/Design from the University of Iowa in 2014, where she exhibited in events like the Iowa City Arts Festival Emerging Artist Pavilion (2013), Art Speaks at Riverbank Art Festival (2014), Nature Icons solo at Old Brick Artist Series (2014), Gingham Check BFA solo at SAAH (2014), Honors Group Exhibition at UIowa (2014), and Small Works Show at Chait Gallery (2014). During her time at University of Iowa, she worked multiple jobs including: cab driver, game store clerk, public access, art archives digitizing books and film slides for professors&apos; lectures and witnessed boundary-pushing MFA theses. She engaged in campus life, including being a founding member of EPX Studios a student group to advocate for gaming and animation curriculum, contributing to UN policy standard writing on climate change, Mortar Board Society, and end-of-semester dumpster diving rituals where communities salvaged discarded items from wealthy students for reuse, donation, or resale. Influences from this era include Frida Kahlo, Gustav Klimt, Vincent Van Gogh, Edward Gorey, Salvador Dali, Edo Period Prints, Picasso, and Arthur Rackham, alongside various religious/spiritual art practices across cultures, which she synthesizes to find harmonies and reject art elitism.
        </p>

        <p>
          After relocating to the Bay Area, she collaborated with local and international artists, participating in notable projects such as Ai Weiwei&apos;s Alcatraz exhibit (2014-2015) and contributing to the Firehouse Art Collective managed by Tom Franco (2015-2018). She curated underground shows from her home, a West Oakland punk/art-house, and held early shows like Sweet Release at Philz Gilman (2016), I Can Breathe at Snappy&apos;s Cafe (2017), and Emotional Landscapes at Philz Noe Valley (2018). Other pre-crypto highlights include murals for Philz Coffee (2017), group shows like Dimond Public Art: Art in the Streets (2016), Gilman Art Walk (2016), exhibitions at Bothwell Arts Center (2016), Jack of All Trades (2016), Alameda Arts (2017), and experimental shows as NY Day Show and Art Will Never Break Your Heart in Oakland (2019-2020), plus Create//Destroy co-exhibit with Dangercat (2020) and Red Light Art Show organized/curated to raise funds for BAWS (2020).
        </p>

        <p>
          Since venturing into crypto art in 2021, her work has exploded globally with well over 100 exhibitions, curations, and drops, emphasizing community uplift and innovation while escaping traditional art systems. Early crypto milestones include features at Sotheby&apos;s, SuperChief, Nox Gallery, and TED Vancouver, with exhibitions spanning Tokyo, Seoul, NYC, Paris, Palm Springs, Miami, Rome, LA, SXSW, Mexico City, and Melbourne. Beyond art exhibitions, she has spoke at the Creative Commons Global Summit on crypto art and #cc0 ethos, been featured in extensive podcasts, interviews and publications, and has rescued wild animals like a raccoon, opossum, and crow.
        </p>

        <p>
          Empress Trash&apos;s art embraces abstraction, surrealism, glitch aesthetics, and AI, continually seeking new accessible technologies like Midjourney for surreal visions and custom models on platforms like Titles.xyz. Her process-oriented approach leverages radical expressionism and self-acceptance, delving into meditative explorations of subconscious connections between emotional, physical, mental, sexual, and spiritual realms. Digital art is not new to her, with being an OG on DeviantArt as trash-empress (active since ~2003), she shared early digital portraits, line art, coloring pages, graphic weirdness, and sketches/quick draws, rejecting elitism and drawing from diverse influences. Her Instagram (@empress_trash), X (@empresstrash) and TikTok (@empress_trash) showcases the diverse works she creates.
        </p>

        <p>
          Empress Trash is also a metaverse builder, passionately creating virtual spaces to extend her artistic sovereignty. She has built galleries and experiences in Cryptovoxels, contributing to immersive environments that blend glitch, trash and digital outsider art with interactive experiences, including Dumpster Palace Gallery. She participated in XoB Gallery&apos;s virtual exhibitions as artist in residency, showcasing glitchy, avant-garde pieces in metaverse galleries, emphasizing digital ownership and accessibility. Currently, she focuses on Nifty Island, where she designs and curates islands that serve as digital sanctuaries for community engagement and creative rebellion, including her first Prismata island.
        </p>

        <p>
          As a very early adopter with new technology and systems, Empress Trash actively contributes to critiquing social medias and their evolution in web3, advocating for decentralized, artist-centric models that prioritize sovereignty, collaboration over centralized control. Her insights on building equitable ecosystems have influenced discussions on how these platforms can avoid repeating web2 pitfalls, fostering true community-driven innovation and exploring what equitable, merit based systems mean while exploring new technology being developed.
        </p>
      </section>

      <section className="bio-section">
        <h2>Exhibitions + Stuff</h2>
        <p className="cv-legend">
          <span className="cv-legend-swatch" aria-hidden="true" />
          Pink entries have proof links (click once for a single source, or open the menu when there are several). Plain white entries have no public link attached yet.
        </p>
        <div className="cv-timeline">
          {CV_TIMELINE.map((group) => (
            <div key={group.year} className="cv-year-block">
              <div className="cv-year-rail" aria-hidden="true">
                <span className="cv-year-dot" />
              </div>
              <div className="cv-year-body">
                <h3 className="cv-year-label">{group.year}</h3>
                <ul className="cv-items">
                  {sortItems(group.items).map((item) => (
                    <CvEntryRow
                      key={`${group.year}-${item.date}-${item.entry.slice(0, 48)}`}
                      item={item}
                    />
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .bio-page {
          max-width: 1000px;
          margin: 2rem auto;
          padding: 0 1rem 3rem;
          color: var(--color-text);
          line-height: 1.8;
          font-family: var(--font-family);
        }
        .bio-page h1 {
          font-size: 2.5rem;
          margin-bottom: 1.5rem;
          text-align: center;
          color: var(--accent-pink);
        }
        .bio-page h2 {
          font-size: 1.5rem;
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          color: var(--accent-pink);
        }
        .bio-intro {
          background: rgba(255, 0, 127, 0.05);
          padding: 1.5rem;
          border-left: 4px solid var(--accent-pink);
          margin-bottom: 2rem;
          font-style: italic;
        }
        .bio-section {
          margin-bottom: 2rem;
        }
        .bio-section p {
          margin-bottom: 1rem;
          text-align: left;
        }

        .cv-legend {
          display: flex;
          align-items: flex-start;
          gap: 0.55rem;
          margin: 0 0 1.25rem;
          font-size: 0.82rem;
          line-height: 1.45;
          color: rgba(255, 255, 255, 0.62);
        }
        .cv-legend-swatch {
          flex-shrink: 0;
          width: 0.7rem;
          height: 0.7rem;
          margin-top: 0.28rem;
          border-radius: 2px;
          background: var(--accent-pink);
          box-shadow: 0 0 8px rgba(255, 61, 110, 0.45);
        }

        .cv-timeline {
          position: relative;
          margin: 0;
          padding: 0;
        }
        .cv-year-block {
          display: grid;
          grid-template-columns: 1.75rem 1fr;
          gap: 0 1rem;
          position: relative;
        }
        .cv-year-rail {
          position: relative;
          display: flex;
          justify-content: center;
        }
        .cv-year-rail::before {
          content: "";
          position: absolute;
          top: 0.55rem;
          bottom: -0.25rem;
          left: 50%;
          width: 2px;
          transform: translateX(-50%);
          background: linear-gradient(
            to bottom,
            var(--accent-pink),
            rgba(255, 61, 110, 0.25)
          );
        }
        .cv-year-block:last-child .cv-year-rail::before {
          bottom: 1.5rem;
        }
        .cv-year-dot {
          position: relative;
          z-index: 1;
          width: 0.85rem;
          height: 0.85rem;
          margin-top: 0.45rem;
          border-radius: 50%;
          background: var(--accent-pink);
          box-shadow:
            0 0 0 3px rgba(255, 61, 110, 0.2),
            0 0 12px rgba(255, 61, 110, 0.45);
          flex-shrink: 0;
        }
        .cv-year-body {
          min-width: 0;
          padding-bottom: 1.75rem;
        }
        .cv-year-label {
          margin: 0 0 0.65rem;
          font-size: 1.15rem;
          font-weight: 600;
          letter-spacing: 0.04em;
          color: var(--accent-pink);
          line-height: 1.3;
          text-align: left;
        }
        .cv-items {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }

        /* Base row — left aligned, no link-like hover by default */
        :global(.cv-item) {
          position: relative;
          margin: 0;
          padding: 0;
          text-align: left;
        }
        :global(.cv-item--plain) {
          padding: 0.55rem 0.85rem 0.55rem 1rem;
          border-left: 2px solid rgba(255, 255, 255, 0.18);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 0 6px 6px 0;
          line-height: 1.5;
          font-size: 0.92rem;
          color: rgba(255, 255, 255, 0.88);
          text-align: left;
        }
        :global(.cv-date) {
          display: inline;
          font-weight: 600;
          letter-spacing: 0.02em;
          white-space: nowrap;
        }
        :global(.cv-sep) {
          display: inline;
          margin: 0 0.4rem;
          opacity: 0.55;
        }
        :global(.cv-entry-text) {
          display: inline;
        }

        /* Single-link entries */
        :global(.cv-item--linked) {
          border-radius: 0 6px 6px 0;
        }
        :global(.cv-entry-link) {
          display: block;
          padding: 0.55rem 0.85rem 0.55rem 1rem;
          border-left: 2px solid var(--accent-pink);
          background: rgba(255, 0, 127, 0.06);
          border-radius: 0 6px 6px 0;
          line-height: 1.5;
          font-size: 0.92rem;
          color: var(--accent-pink);
          text-decoration: none;
          text-align: left;
          transition: background 0.15s ease, filter 0.15s ease;
        }
        :global(.cv-entry-link:hover),
        :global(.cv-entry-link:focus-visible) {
          background: rgba(255, 0, 127, 0.12);
          text-decoration: underline;
          text-underline-offset: 0.18em;
          outline: none;
        }

        /* Multi-link entries + dropdown */
        :global(.cv-multi-wrap) {
          position: relative;
        }
        :global(.cv-entry-multi) {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          width: 100%;
          margin: 0;
          padding: 0.55rem 0.85rem 0.55rem 1rem;
          border: none;
          border-left: 2px solid var(--accent-pink);
          background: rgba(255, 0, 127, 0.06);
          border-radius: 0 6px 6px 0;
          line-height: 1.5;
          font-size: 0.92rem;
          font-family: inherit;
          color: var(--accent-pink);
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        :global(.cv-entry-multi:hover),
        :global(.cv-entry-multi:focus-visible),
        :global(.cv-item--multi.is-open .cv-entry-multi) {
          background: rgba(255, 0, 127, 0.12);
          outline: none;
        }
        :global(.cv-multi-chevron) {
          flex-shrink: 0;
          margin-left: auto;
          opacity: 0.85;
          font-size: 0.75rem;
          line-height: 1.6;
        }
        :global(.cv-link-menu) {
          list-style: none;
          margin: 0.25rem 0 0.35rem;
          padding: 0.35rem 0;
          border: 1px solid rgba(255, 61, 110, 0.35);
          border-radius: 8px;
          background: rgba(12, 8, 12, 0.97);
          box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
          z-index: 5;
        }
        :global(.cv-link-menu a) {
          display: block;
          padding: 0.55rem 0.9rem;
          color: var(--accent-pink);
          text-decoration: none;
          font-size: 0.88rem;
          text-align: left;
        }
        :global(.cv-link-menu a:hover),
        :global(.cv-link-menu a:focus-visible) {
          background: rgba(255, 0, 127, 0.12);
          outline: none;
        }

        @media (max-width: 768px) {
          .bio-page {
            padding: 0 0.75rem 2.5rem;
          }
          .bio-page h1 {
            font-size: 1.8rem;
          }
          .bio-page h2 {
            font-size: 1.2rem;
          }
          .bio-section p {
            font-size: 0.9rem;
          }
          .cv-year-block {
            grid-template-columns: 1.25rem 1fr;
            gap: 0 0.75rem;
          }
          .cv-year-label {
            font-size: 1.05rem;
          }
          :global(.cv-item--plain),
          :global(.cv-entry-link),
          :global(.cv-entry-multi) {
            font-size: 0.86rem;
            padding: 0.5rem 0.7rem 0.5rem 0.85rem;
          }
        }

        @media (max-width: 480px) {
          .bio-page {
            max-width: 100%;
            margin: 1rem auto;
            padding: 0 0.5rem 2rem;
          }
          .bio-page h1 {
            font-size: 1.4rem;
            margin-bottom: 1rem;
          }
          .bio-page h2 {
            font-size: 1rem;
            margin-top: 1.5rem;
          }
          .bio-intro {
            padding: 1rem;
            border-left: 3px solid var(--accent-pink);
          }
          .bio-section p {
            font-size: 0.85rem;
          }
          .cv-year-label {
            font-size: 0.98rem;
          }
          :global(.cv-item--plain),
          :global(.cv-entry-link),
          :global(.cv-entry-multi) {
            font-size: 0.8rem;
            line-height: 1.45;
          }
          :global(.cv-date) {
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}
