/**
 * Rebuild app/full-moon/data.ts with EVERY full moon airdrop we can find on-chain.
 */
import fs from "fs";

const OBJKT = "https://data.objkt.com/v3/graphql";
const CREATOR = "tz1YbJAyfmSwqLbLwCrUTfEMeLgCncM9jj3z";

const moonNames = {
  "2022-05": "Origin · Full Moon Lunar Eclipse",
  "2022-06": "Strawberry Supermoon",
  "2022-07": "Full Moon",
  "2022-08": "Sturgeon Supermoon",
  "2022-09": "Full Moon",
  "2022-10": "Hunter's Moon",
  "2022-11": "Full Moon",
  "2022-12": "Full Moon",
  "2023-01": "Cancer Full Moon",
  "2023-02": "Snow Moon",
  "2023-03": "Worm Moon",
  "2023-04": "Pink Moon",
  "2023-05": "Flower Moon Lunar Eclipse · Year One",
  "2023-06": "Full Moon",
  "2023-07": "Capricorn Super Moon",
  "2023-08-sturgeon": "Sturgeon Super Moon",
  "2023-08-blue": "Blue Moon",
  "2023-09": "Harvest Super Moon",
  "2023-10": "Hunter's Moon",
  "2023-11": "Beaver Moon",
  "2023-12-solstice": "Winter Solstice",
  "2023-12-cold": "Cold Moon",
  "2024-01": "Full Moon",
  "2024-02": "Full Moon",
  "2024-03": "Lunar Eclipse",
  "2024-04": "Pink Moon",
  "2024-05": "Full Moon",
  "2024-06": "Summer Solstice Full Moon",
  "2024-07": "Full Moon",
  "2024-08": "Full Moon",
  "2024-09": "Lunar Eclipse",
  "2024-10": "Aries Full Moon",
  "2024-11": "Full Moon",
  "2024-12": "Full Moon",
  "2025-01": "Wolf Moon",
  "2025-02": "Snow Moon",
  "2025-03": "Blood Moon",
  "2025-04": "Pink Moon",
  "2025-05": "Flower Moon",
  "2025-06": "Full Moon",
  "2025-07": "Full Moon",
  "2025-08": "Full Moon",
  "2025-09": "Lunar Eclipse",
  "2025-10": "Hunter's Moon",
  "2025-11": "Full Moon",
  "2025-12": "Cold Moon",
  "2026-01": "Wolf Moon",
  "2026-02": "Snow Moon",
  "2026-03": "Blood Moon Lunar Eclipse",
  "2026-04": "Pink Moon · Artemis II",
  "2026-05-flower": "Flower Moon",
  "2026-05-blue": "Blue Moon",
  "2026-06": "Full Moon",
  "2026-07": "Buck Moon",
};

/** Override moonKey for known edge cases (same month, two moons) */
function moonKeyFor(date, name, desc) {
  const d = date.slice(0, 10);
  const ym = d.slice(0, 7);
  const n = `${name} ${desc}`.toLowerCase();

  if (ym === "2023-08") {
    if (n.includes("blue")) return "2023-08-blue";
    return "2023-08-sturgeon";
  }
  if (ym === "2023-12") {
    if (n.includes("solstice") || n.includes("x-ray") || n.includes("teztrash"))
      return "2023-12-solstice";
    return "2023-12-cold";
  }
  if (ym === "2026-05") {
    if (n.includes("blue")) return "2026-05-blue";
    return "2026-05-flower";
  }
  if (ym === "2026-06" && n.includes("blue")) return "2026-05-blue";
  return ym;
}

function esc(s) {
  return JSON.stringify(s ?? "");
}

function cid(uri) {
  if (!uri) return "";
  return String(uri).replace(/^ipfs:\/\//, "");
}

async function gql(query) {
  const res = await fetch(OBJKT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const data = await gql(`{
  token(
    where: {
      creators: { creator_address: { _eq: "${CREATOR}" } }
      description: { _ilike: "%full moon%" }
    }
    order_by: { timestamp: asc }
    limit: 300
  ) {
    name
    token_id
    fa_contract
    supply
    display_uri
    thumbnail_uri
    description
    timestamp
  }
}`);

// Also grab airdrops that say "full moon token" without "full moon" alone edge cases
// (already covered) + Rebirth etc.

const skip = new Set([
  // key tokens (handled separately)
  "KT1RJ6PbjHpwc3M5rw5s2Nbmefwbuwbdxton:734839",
  "KT1VwBoE3zk36D32VN1i7dvFL7VxuQuwUvWZ:47", // burned/zero key dupe
  // not airdrop editions
  "KT1GF9gugbeTirYFh8UrETXZixvdcisi8NMr:87", // 1/1 photo
  "KT1QK69Z94UxoxCSux36aEKjD6fWHKg7CsQG:4", // selfie series #4
]);

function isFullMoonAirdrop(t) {
  const key = `${t.fa_contract}:${t.token_id}`;
  if (skip.has(key)) return false;
  if (Number(t.supply) === 0) return false;
  const d = (t.description || "").toLowerCase();
  const n = (t.name || "").toLowerCase();
  if (n.includes("moon worshippers")) return false;
  if (n.includes("full moon token") && Number(t.supply) <= 111 && d.includes("holders of this token"))
    return false; // key
  // Must be clearly an airdrop edition for the cycle
  const airdropish =
    d.includes("airdrop") ||
    d.includes("airdropped") ||
    d.includes("full moon token holder") ||
    d.includes("holders of the full moon") ||
    d.includes("full moon airdrop") ||
    (d.includes("full moon") && Number(t.supply) >= 100);
  return airdropish;
}

const tez = data.token.filter(isFullMoonAirdrop);

// Ensure Aura / Speak / Body Mapping II / solstice included even if desc edge cases
const extraIds = [
  ["KT1UXZ8HF2aEHhYrYvAmArD5QGjBq61qCFPc", "40"],
  ["KT1UXZ8HF2aEHhYrYvAmArD5QGjBq61qCFPc", "43"],
  ["KT1UXZ8HF2aEHhYrYvAmArD5QGjBq61qCFPc", "67"],
  ["KT1UXZ8HF2aEHhYrYvAmArD5QGjBq61qCFPc", "25"],
  ["KT1UXZ8HF2aEHhYrYvAmArD5QGjBq61qCFPc", "33"],
];

for (const [fa, tid] of extraIds) {
  if (tez.some((t) => t.fa_contract === fa && t.token_id === tid)) continue;
  const extra = await gql(`{
    token(where: { fa_contract: { _eq: "${fa}" }, token_id: { _eq: "${tid}" } }, limit: 1) {
      name token_id fa_contract supply display_uri thumbnail_uri description timestamp
    }
  }`);
  if (extra.token[0]) tez.push(extra.token[0]);
}

tez.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

const tezLines = tez.map((t) => {
  const date = (t.timestamp || "").slice(0, 10);
  const moonKey = moonKeyFor(date, t.name, t.description || "");
  const moonName = moonNames[moonKey] || t.name || "Full Moon";
  const image = cid(t.display_uri || t.thumbnail_uri);
  const fallback = cid(t.thumbnail_uri);
  const fb =
    fallback && fallback !== image ? `, imageFallback: ${esc(fallback)}` : "";
  const id = `t-${t.fa_contract.slice(-6)}-${t.token_id}`;
  const url = `https://objkt.com/tokens/${t.fa_contract}/${t.token_id}`;
  const blurb = (t.description || "").replace(/\s+/g, " ").trim().slice(0, 180);
  return `  { id: ${esc(id)}, name: ${esc(t.name)}, chain: "tezos", image: ${esc(image)}${fb}, url: ${esc(url)}, date: ${esc(date)}, moonKey: ${esc(moonKey)}, moonName: ${esc(moonName)}, blurb: ${esc(blurb)} },`;
});

const baseAirdrops = [
  {
    id: "b2",
    name: "Taurean (eth edition)",
    image: "https://arweave.net/_lz9UojBKxn6-tBgLPi8ET5kFDmTJECzf3x06Q_Gsjc",
    tid: 2,
    date: "2025-11-05",
    moonKey: "2025-11",
  },
  {
    id: "b3",
    name: "Cold Moon",
    image: "https://arweave.net/cxpik-0k82UcobJpfmbpSNtyaR-Jn1IHW0yeIwacnSM",
    tid: 3,
    date: "2025-12-12",
    moonKey: "2025-12",
  },
  {
    id: "b4",
    name: "Full Moon, Wolf Moon",
    image: "https://arweave.net/KZA_x227uiCI4U5mcmXia0fAQW0P5Wy5HZ_DUQujBWk",
    tid: 4,
    date: "2026-01-04",
    moonKey: "2026-01",
  },
  {
    id: "b5",
    name: "Angel Gets Her Wings",
    image: "https://arweave.net/YMdeEWzSnBR99hnr4YNluR8AK_9Bycc_YB5as49l0Ys",
    tid: 5,
    date: "2026-02-01",
    moonKey: "2026-02",
  },
  {
    id: "b6",
    name: "Blood Moon Lunar Eclipse (base variant)",
    image: "https://arweave.net/4z5rMzt8yWrlQX0NI_QlgFijd5DfaXEwa6blTn3N1G0",
    tid: 6,
    date: "2026-03-03",
    moonKey: "2026-03",
  },
  {
    id: "b7",
    name: "Artemis II Launch (Found Glitch Art II)",
    image: "https://arweave.net/tbeomW7Qgenei9mE7Cfubhw-JIf2cLQDwb4_OEC94ZM",
    tid: 7,
    date: "2026-04-02",
    moonKey: "2026-04",
  },
  {
    id: "b8",
    name: "Body Mapping III",
    image: "https://pbs.twimg.com/amplify_video_thumb/2050696116031664128/img/G249pASh_aw8kBkh.jpg",
    tid: 8,
    date: "2026-05-02",
    moonKey: "2026-05-flower",
  },
  {
    id: "b9",
    name: "Blue Moon (Base Variant)",
    image: "https://arweave.net/Le9oqn4-lrFxlZZjo3Z3WICPngCZZqF2bGWr2X41GEU",
    tid: 9,
    date: "2026-05-31",
    moonKey: "2026-05-blue",
  },
  {
    id: "b10",
    name: "Not Real Art II",
    image: "https://arweave.net/l9dzbk81ckkpieRt-Zxq_eempgb_tBAPtm5T7tr8B9s",
    tid: 10,
    date: "2026-06-29",
    moonKey: "2026-06",
  },
  {
    id: "b11",
    name: "Archangel Barachiel: Guardian of Provision",
    image: "https://pbs.twimg.com/media/HOeM3SJWwAAkW8t.jpg",
    tid: 11,
    date: "2026-07-29",
    moonKey: "2026-07",
  },
  {
    id: "bHarvest",
    name: "Harvest Glitch Dance",
    image: "https://arweave.net/_IHN59HKfl8IF-s2z6gil2u8814aK3VrqhK9Ny4aLa4",
    date: "2025-10-06",
    moonKey: "2025-10",
    url: "https://opensea.io/item/base/0x064c2f29cb656c6cd1a629873c935427d331f367/3",
  },
];

const baseLines = baseAirdrops.map((b) => {
  const moonName = moonNames[b.moonKey] || "Full Moon";
  const url =
    b.url ||
    `https://opensea.io/item/base/0x28aa49080b332805e5c1fecec92019fd5b3ff151/${b.tid}`;
  return `  { id: ${esc(b.id)}, name: ${esc(b.name)}, chain: "base", image: ${esc(b.image)}, url: ${esc(url)}, date: ${esc(b.date)}, moonKey: ${esc(b.moonKey)}, moonName: ${esc(moonName)} },`;
});

const out = `export type Chain = "tezos" | "base";

export interface MoonWork {
  id: string;
  name: string;
  chain: Chain;
  image: string;
  imageFallback?: string;
  url: string;
  date: string;
  moonKey: string;
  moonName: string;
  blurb?: string;
  isKey?: boolean;
}

export interface MoonGroup {
  moonKey: string;
  moonName: string;
  date: string;
  works: MoonWork[];
}

/** Hold these to receive airdrops on their chain */
export const KEY_TOKENS: MoonWork[] = [
  {
    id: "tez-key",
    name: "Empress Trash's Full Moon Token",
    chain: "tezos",
    image: "https://gateway.pinata.cloud/ipfs/QmPeoFNiHAK3J9nxHrLQcU3F6hgVFfYTpUihHB328xgUoS",
    imageFallback: "https://gateway.pinata.cloud/ipfs/QmNrhZHUaEqxhyLfqoq1mtHSipkWHeT31LNHb1QEbDHgnc",
    url: "https://objkt.com/tokens/hicetnunc/734839",
    date: "2022-05-15",
    moonKey: "2022-05-key",
    moonName: "Origin",
    isKey: true,
  },
  {
    id: "base-key",
    name: "Empress Trash' Full Moon Token",
    chain: "base",
    image: "https://arweave.net/I-4pZWzNy1N2eKVneLFNsN5nVY2YGSsOyILBYwyceBQ",
    url: "https://opensea.io/item/base/0x28aa49080b332805e5c1fecec92019fd5b3ff151/1",
    date: "2025-09-07",
    moonKey: "2025-09-key",
    moonName: "Base Extension",
    isKey: true,
  },
];

/** Every Tezos full moon airdrop found on-chain (all contracts) */
export const TIMELINE: MoonWork[] = [
${tezLines.join("\n")}
];

/** Base full moon airdrops (FMT contract + Harvest on Empress BASED) */
export const BASE_AIRDROPS: MoonWork[] = [
${baseLines.join("\n")}
];

export function allTimelineWorks(): MoonWork[] {
  return [...TIMELINE, ...BASE_AIRDROPS];
}

export function timelineByMoon(): MoonGroup[] {
  const works = allTimelineWorks();
  const map = new Map<string, MoonGroup>();
  for (const w of works) {
    const existing = map.get(w.moonKey);
    if (existing) {
      existing.works.push(w);
      if (w.date > existing.date) existing.date = w.date;
    } else {
      map.set(w.moonKey, {
        moonKey: w.moonKey,
        moonName: w.moonName,
        date: w.date,
        works: [w],
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}
`;

fs.writeFileSync("app/full-moon/data.ts", out);
console.log("TEZOS AIRDROPS:", tez.length);
console.log("BASE AIRDROPS:", baseAirdrops.length);
console.log("TOTAL WORKS:", tez.length + baseAirdrops.length);
console.log(
  "MOONS:",
  new Set([...tez.map((t) => moonKeyFor(t.timestamp.slice(0, 10), t.name, t.description || "")), ...baseAirdrops.map((b) => b.moonKey)]).size,
);
console.log(
  "sample early:",
  tez
    .filter((t) => t.timestamp < "2023-04-01")
    .map((t) => `${t.timestamp.slice(0, 10)} ${t.name}`)
    .join(" | "),
);
