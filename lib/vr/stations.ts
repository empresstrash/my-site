export type StationMeta =
  | { kind: "azura"; short: string }
  | { kind: "rp"; chan: number }
  | { kind: "nts"; channel: "1" | "2" }
  | { kind: "kexp" }
  | { kind: "fip" }
  | { kind: "airtime"; info: string };

export type Station = {
  id: string;
  group: string;
  name: string;
  blurb: string;
  stream: string;
  fallback?: string;
  meta: StationMeta;
};

export type NowPlaying = {
  line: string;
  detail: string;
  art: string;
  next: string;
};

export const STATIONS: Station[] = [
  {
    id: "rin",
    group: "Radio Isla Negra",
    name: "Radio Isla Negra",
    blurb: "Hand-picked, no ads, since 1999.",
    stream: "https://radioislanegra.org/listen/rin/stream",
    meta: { kind: "azura", short: "rin" },
  },
  {
    id: "slow",
    group: "Radio Isla Negra",
    name: "Slowbeat",
    blurb: "Downtempo and ambient from the same station.",
    stream: "https://radioislanegra.org/listen/slow/basic.aac",
    meta: { kind: "azura", short: "slow" },
  },
  {
    id: "up",
    group: "Radio Isla Negra",
    name: "Upbeat",
    blurb: "The faster Isla Negra channel.",
    stream: "https://radioislanegra.org/listen/up/basic.aac",
    meta: { kind: "azura", short: "up" },
  },
  {
    id: "rp",
    group: "Radio Paradise",
    name: "Main Mix",
    blurb: "One eclectic DJ-free mix. Commercial-free.",
    stream: "https://stream.radioparadise.com/aac-320",
    meta: { kind: "rp", chan: 0 },
  },
  {
    id: "rp-mellow",
    group: "Radio Paradise",
    name: "Mellow Mix",
    blurb: "The quieter Paradise mix. Still a person, not a shuffle.",
    stream: "https://stream.radioparadise.com/mellow-320",
    meta: { kind: "rp", chan: 1 },
  },
  {
    id: "rp-rock",
    group: "Radio Paradise",
    name: "Rock Mix",
    blurb: "The louder Paradise mix.",
    stream: "https://stream.radioparadise.com/rock-320",
    meta: { kind: "rp", chan: 2 },
  },
  {
    id: "rp-global",
    group: "Radio Paradise",
    name: "Global Mix",
    blurb: "World, jazz, and the records that do not fit a format.",
    stream: "https://stream.radioparadise.com/world-etc-320",
    meta: { kind: "rp", chan: 3 },
  },
  {
    id: "fip",
    group: "FIP",
    name: "FIP",
    blurb: "Paris public radio. Jazz, rock, and the world, no ads.",
    stream: "https://icecast.radiofrance.fr/fip-midfi.mp3",
    meta: { kind: "fip" },
  },
  {
    id: "kexp",
    group: "KEXP",
    name: "KEXP",
    blurb: "Seattle. DJs on the air, and the song is logged as it plays.",
    stream: "https://kexp.streamguys1.com/kexp160.aac",
    meta: { kind: "kexp" },
  },
  {
    id: "dublab",
    group: "dublab",
    name: "dublab",
    blurb: "Los Angeles. Future roots radio. Live DJs do not always log the song.",
    stream: "https://dublab.out.airtime.pro/dublab_a",
    meta: { kind: "airtime", info: "https://dublab.airtime.pro/api/live-info-v2" },
  },
  {
    id: "nts-1",
    group: "NTS",
    name: "Channel 1",
    blurb: "Live shows. The line is the song when NTS has posted the tracklist.",
    stream: "https://streams.radiomast.io/nts1",
    meta: { kind: "nts", channel: "1" },
  },
  {
    id: "nts-2",
    group: "NTS",
    name: "Channel 2",
    blurb: "The second live NTS channel.",
    stream: "https://streams.radiomast.io/nts2",
    meta: { kind: "nts", channel: "2" },
  },
];

export function stationById(id: string): Station | undefined {
  return STATIONS.find((station) => station.id === id);
}
