export type StationMeta =
  | { kind: "azura"; short: string }
  | { kind: "rp" }
  | { kind: "nts"; channel: "1" | "2" };

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
    meta: { kind: "rp" },
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
