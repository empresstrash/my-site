import { stationById, type NowPlaying } from "@/lib/vr/stations";

const EMPTY: NowPlaying = { line: "Now playing unavailable", detail: "", art: "", next: "" };

async function readJson(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error(`Radio metadata ${response.status}`);
  return response.json();
}

export async function nowPlaying(id: string): Promise<NowPlaying> {
  const station = stationById(id);
  if (!station) return EMPTY;
  try {
    if (station.meta.kind === "azura") {
      const body = (await readJson(`https://radioislanegra.org/api/nowplaying/${station.meta.short}`)) as {
        now_playing?: { song?: { artist?: string; title?: string; album?: string; art?: string; text?: string } };
        playing_next?: { song?: { artist?: string; title?: string; text?: string } };
      };
      const song = body.now_playing?.song;
      const next = body.playing_next?.song;
      return {
        line: song?.text || [song?.artist, song?.title].filter(Boolean).join(" — ") || "On air",
        detail: song?.album || station.blurb,
        art: song?.art || "",
        next: next?.text || [next?.artist, next?.title].filter(Boolean).join(" — "),
      };
    }
    if (station.meta.kind === "rp") {
      const body = (await readJson("https://api.radioparadise.com/api/now_playing?chan=0")) as {
        artist?: string;
        title?: string;
        album?: string;
        year?: string;
        cover_med?: string;
      };
      return {
        line: [body.artist, body.title].filter(Boolean).join(" — ") || "On air",
        detail: [body.album, body.year].filter(Boolean).join(" · ") || station.blurb,
        art: body.cover_med || "",
        next: "",
      };
    }
    if (station.meta.kind !== "nts") return { ...EMPTY, detail: station.blurb };
    const channel = station.meta.channel;
    const body = (await readJson("https://www.nts.live/api/v2/live")) as {
      results?: {
        channel_name?: string;
        now?: {
          broadcast_title?: string;
          embeds?: { details?: { description?: string; media?: { picture_large?: string } } };
        };
      }[];
    };
    const show = body.results?.find((item) => item.channel_name === channel);
    const details = show?.now?.embeds?.details;
    const description = details?.description?.replace(/<[^>]+>/g, "").trim() || station.blurb;
    return {
      line: show?.now?.broadcast_title || "On air",
      detail: description,
      art: details?.media?.picture_large || "",
      next: "",
    };
  } catch {
    return { ...EMPTY, detail: station.blurb };
  }
}
