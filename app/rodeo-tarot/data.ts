/**
 * Empress Trash Major Arcana — Rodeo / Base collection.
 * OpenSea: https://opensea.io/collection/empress-trash-rodeo-exquisite-corpse
 * Contract (Base): 0xc31fc511fd753ba784d226729c88e0c0c9ee5cb9
 *
 * Meanings: succinct classical Major Arcana upright / reversed keywords
 * for entertainment readings only — not advice or prediction.
 */

export type TarotCard = {
  /** Arcana number 0–21 */
  number: number;
  /** Display name (title case) */
  name: string;
  /** On-chain / OpenSea title as minted */
  mintName: string;
  tokenId: string;
  /** Primary image (Arweave or OpenSea CDN) */
  image: string;
  /** Fallback image URL */
  imageFallback?: string;
  opensea: string;
  upright: string;
  reversed: string;
};

const CONTRACT = "0xc31fc511fd753ba784d226729c88e0c0c9ee5cb9";
const OS = (tokenId: string) =>
  `https://opensea.io/item/base/${CONTRACT}/${tokenId}`;
const AR = (id: string) => `https://arweave.net/${id}`;

export const COLLECTION_URL =
  "https://opensea.io/collection/empress-trash-rodeo-exquisite-corpse";

export const MAJOR_ARCANA: TarotCard[] = [
  {
    number: 0,
    name: "The Fool",
    mintName: "~0~ The Fool",
    tokenId: "18",
    image: AR("UQ9-PcdoywhpRXtdS2KWApPJYPFxHiYn0twqnCqqJds"),
    opensea: OS("18"),
    upright:
      "New beginnings, leap of faith, free spirit, innocence, open road.",
    reversed:
      "Recklessness, naivety, holding back, foolish risk, false start.",
  },
  {
    number: 1,
    name: "The Magician",
    mintName: "~1~ The Magician",
    tokenId: "19",
    image: AR("QhOdayut4mvxVvxB9NFhpw4aFx5Tm9rIx1dFx_ufOoE"),
    opensea: OS("19"),
    upright:
      "Manifestation, skill, willpower, resourcefulness — tools in hand.",
    reversed:
      "Manipulation, untapped talent, trickery, scattered or blocked will.",
  },
  {
    number: 2,
    name: "The High Priestess",
    mintName: "~2~ The High Priestess",
    tokenId: "20",
    image: AR("IPf4-S2HaqwVDRz1t-LHE3jOyfI-tXpTLVplQNNIm7E"),
    opensea: OS("20"),
    upright:
      "Intuition, mystery, inner voice, sacred knowledge, still waters.",
    reversed:
      "Secrets withheld, intuition muted, surface answers, inner noise.",
  },
  {
    number: 3,
    name: "The Empress",
    mintName: "~3~ The Empress",
    tokenId: "21",
    image: AR("Z9ednt5CHz9Wpdq7m9RlXUHFLhq0tP4zcpwiTTxd8yE"),
    opensea: OS("21"),
    upright:
      "Abundance, nurture, creativity, fertility, beauty, embodied care.",
    reversed:
      "Creative block, dependence, smothering, neglect of self or body.",
  },
  {
    number: 4,
    name: "The Emperor",
    mintName: "~4~ The Emperor",
    tokenId: "22",
    image: AR("XnvsRIEc6aBZ5FRh4MopklNW2IYHuCWJo35OlX_s3hk"),
    opensea: OS("22"),
    upright:
      "Structure, authority, stability, leadership, solid foundations.",
    reversed:
      "Tyranny, rigidity, loss of control, weak or abusive boundaries.",
  },
  {
    number: 5,
    name: "The Hierophant",
    mintName: "~5~ The Hierophant",
    tokenId: "24",
    image: AR("sfVzJIshXWLFDAJTa6Is1kpvI1d3QbDF-MfAN6NF4Q4"),
    opensea: OS("24"),
    upright:
      "Tradition, spiritual guidance, shared values, teaching, ritual.",
    reversed:
      "Dogma, rebellion, unconventional path, institutions that no longer serve.",
  },
  {
    number: 6,
    name: "The Lovers",
    mintName: "~6~ The Lovers",
    tokenId: "28",
    image: AR("3nxuAWgFxlPo-mk_UCM9ycLmeIo2yzKtgUZcakSMt4A"),
    opensea: OS("28"),
    upright:
      "Union, meaningful choice, harmony, aligned values, deep connection.",
    reversed:
      "Disharmony, misaligned values, indecision, unbalanced bonds.",
  },
  {
    number: 7,
    name: "The Chariot",
    mintName: "~7~ The Chariot",
    tokenId: "30",
    image: AR("lH09cZamN5GNBcNx0HkezVXJfHmqR_AARxmeEKcJN8E"),
    opensea: OS("30"),
    upright:
      "Willpower, victory, clear direction, determination, forward motion.",
    reversed:
      "Lack of control, aggression, lost direction, stalled drive.",
  },
  {
    number: 8,
    name: "Strength",
    mintName: "~8~ strength",
    tokenId: "32",
    image: AR("fyObNWpnJBQDJ3fa07W6LY_55LtTVZAXFN_yGOkKU9E"),
    opensea: OS("32"),
    upright:
      "Courage, compassion, inner power, patience, gentle mastery.",
    reversed:
      "Self-doubt, force without grace, insecurity, impatience.",
  },
  {
    number: 9,
    name: "The Hermit",
    mintName: "~9~ The Hermit",
    tokenId: "33",
    image: AR("PzdJKyj_9o92Kk9SJa3oqAUAFugYot_ZD_Zjk5UpP00"),
    opensea: OS("33"),
    upright:
      "Solitude, introspection, inner guidance, hard-won wisdom.",
    reversed:
      "Isolation, withdrawal, loneliness, refusing needed counsel.",
  },
  {
    number: 10,
    name: "Wheel of Fortune",
    mintName: "~10~ Wheel of Fortune",
    tokenId: "34",
    image: AR("39j-OUTjoSOh1HvJFzq_c1Qc1RJ1bbWjkbrpmN45LbE"),
    opensea: OS("34"),
    upright:
      "Cycles, destiny, turning point, luck, the wheel is moving.",
    reversed:
      "Resistance to change, poor timing, setbacks, stuck loop.",
  },
  {
    number: 11,
    name: "Justice",
    mintName: "~11~ Justice",
    tokenId: "35",
    image: AR("3W3kKry-2v2iu2ecUEHO5-b6-NUQITqdZqHMj782xA8"),
    opensea: OS("35"),
    upright:
      "Fairness, truth, accountability, clear cause and effect.",
    reversed:
      "Unfairness, denial, imbalance, dodging responsibility.",
  },
  {
    number: 12,
    name: "The Hanged Man",
    mintName: "~12~ The Hanged Man",
    tokenId: "36",
    image: AR("7L9S6KuV9UuGOKpTgKco-6dRfQwIqyfJIiMEa8IFA_Y"),
    opensea: OS("36"),
    upright:
      "Surrender, new perspective, sacred pause, willing sacrifice.",
    reversed:
      "Stalling, martyrdom, resistance, delay without insight.",
  },
  {
    number: 13,
    name: "Death",
    mintName: "~13~ death",
    tokenId: "39",
    image: AR("za3cu0DAKhJQu423GTPp8wxU0nVGJZS6FgGWMNgB8hg"),
    opensea: OS("39"),
    upright:
      "Transformation, endings, rebirth, necessary release — not literal death.",
    reversed:
      "Resistance to change, stagnation, fear of what must end.",
  },
  {
    number: 14,
    name: "Temperance",
    mintName: "~14~ Temperance",
    tokenId: "41",
    image: AR("ciZ9ZKyY2ei6IEt1cyWPEBbmYUmoHBPu7oVN5FgHwKk"),
    opensea: OS("41"),
    upright:
      "Balance, moderation, patience, alchemy, blending opposites.",
    reversed:
      "Excess, imbalance, impatience, forces that will not mix.",
  },
  {
    number: 15,
    name: "The Devil",
    mintName: "~15~ The Devil",
    tokenId: "44",
    image: AR("rnFEIly8Suyh8qMyprsbBFbJWusQu60ukxmVHIKkHmE"),
    opensea: OS("44"),
    upright:
      "Attachment, shadow, temptation, materialism, self-forged chains.",
    reversed:
      "Breaking free, reclaiming power, releasing what bound you.",
  },
  {
    number: 16,
    name: "The Tower",
    mintName: "~16~ The Tower",
    tokenId: "46",
    image: AR("TmuhhOSHa9CJqCSr-38uBbpHn-tyYQ30Gxovkk6rl3E"),
    opensea: OS("46"),
    upright:
      "Sudden upheaval, revelation, false structures falling, breakthrough by break.",
    reversed:
      "Delayed collapse, fear of change, clinging to what is already cracked.",
  },
  {
    number: 17,
    name: "The Star",
    mintName: "~17~ the star",
    tokenId: "50",
    image: AR("1TSlBrv_NS1SqoXnTfUM5tb8f5KNrYWnbXYH48KWAjo"),
    opensea: OS("50"),
    upright:
      "Hope, healing, inspiration, faith after the storm, quiet renewal.",
    reversed:
      "Despair, disconnection, lost faith, dimmed self-trust.",
  },
  {
    number: 18,
    name: "The Moon",
    mintName: "~18~ The Moon",
    tokenId: "52",
    image: AR("gEOwVbEeuYGj_xFcdFDeACtlvtzFSbzXb8IpqrQfd4I"),
    opensea: OS("52"),
    upright:
      "Illusion, dreams, deep intuition, the unconscious, uncertainty.",
    reversed:
      "Clarity returning, anxiety easing, deception brought to light.",
  },
  {
    number: 19,
    name: "The Sun",
    mintName: "~19~ The Sun",
    tokenId: "55",
    image: AR("4p2gTNj7pX1K0z_lhWD5LtFNEukYSRBKd7P1q3IY2E4"),
    imageFallback:
      "https://i2c.seadn.io/base/0xc31fc511fd753ba784d226729c88e0c0c9ee5cb9/1f4a151f3f04e767a58614971e6909/841f4a151f3f04e767a58614971e6909.gif",
    opensea: OS("55"),
    upright:
      "Joy, success, vitality, clarity, celebration, warm truth.",
    reversed:
      "Temporary cloud, ego glare, overconfidence, joy delayed not denied.",
  },
  {
    number: 20,
    name: "Judgement",
    mintName: "~XX~ Judgement",
    tokenId: "63",
    image: AR("jQnrhJJCj5HIehGup16w1BRanneJwwVNgw3wq85xNn4"),
    opensea: OS("63"),
    upright:
      "Awakening, reckoning, renewal, a calling answered, absolution.",
    reversed:
      "Harsh self-judgment, refusing the lesson, guilt without growth.",
  },
  {
    number: 21,
    name: "The World",
    mintName: "~21~ The World",
    tokenId: "70",
    image: AR("5koNZ5ahGrfMSt_LPlhZegamSi2wqyvpK-6jE6gCxN0"),
    opensea: OS("70"),
    upright:
      "Completion, wholeness, achievement, integration, full circle.",
    reversed:
      "Incomplete cycle, shortcuts, unfinished business, almost-there.",
  },
];

export type SpreadId = "one" | "three";

export type SpreadDef = {
  id: SpreadId;
  label: string;
  positions: string[];
};

/** Common Major Arcana–only spreads offered on the page. */
export const SPREADS: SpreadDef[] = [
  {
    id: "one",
    label: "1 card",
    positions: ["Focus"],
  },
  {
    id: "three",
    label: "3 card",
    positions: ["Past", "Present", "Future"],
  },
];

export type DrawnCard = {
  card: TarotCard;
  reversed: boolean;
  position: string;
};

/** Cryptographic random integer in [0, maxExclusive). */
function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  const buf = new Uint32Array(1);
  // Rejection sampling so every index is equiprobable
  const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0]!;
  } while (x >= limit);
  return x % maxExclusive;
}

/** True 50/50 coin flip (least significant bit of a CSPRNG byte). */
function fairCoinHeads(): boolean {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return (buf[0]! & 1) === 1;
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Draw without replacement.
 * Each position independently gets a true 50/50 upright vs reversed orientation.
 */
export function drawReading(spread: SpreadDef): DrawnCard[] {
  const deck = shuffleInPlace([...MAJOR_ARCANA]);
  const count = spread.positions.length;
  return deck.slice(0, count).map((card, i) => ({
    card,
    // fairCoinHeads === true → reversed; false → upright (exactly 50/50)
    reversed: fairCoinHeads(),
    position: spread.positions[i],
  }));
}
