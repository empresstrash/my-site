import { stationById, type NowPlaying } from "@/lib/vr/stations";

const EMPTY: NowPlaying = { line: "Now playing unavailable", detail: "", art: "", next: "" };

type NtsTrack = {
  artist?: string;
  title?: string;
  offset?: number | null;
  duration?: number | null;
  offset_estimate?: number | null;
  duration_estimate?: number | null;
};

function trackLabel(track: NtsTrack): string {
  return [track.artist, track.title].filter(Boolean).join(" — ") || "On air";
}

function trackAt(tracks: NtsTrack[], elapsed: number): { current?: NtsTrack; next?: NtsTrack } {
  const ordered = tracks
    .map((track) => ({
      track,
      start: typeof track.offset === "number" ? track.offset : track.offset_estimate,
    }))
    .filter((item): item is { track: NtsTrack; start: number } => typeof item.start === "number")
    .sort((a, b) => a.start - b.start);
  if (!ordered.length) return {};
  let index = 0;
  for (let i = 0; i < ordered.length; i++) {
    if (ordered[i].start <= elapsed) index = i;
  }
  return { current: ordered[index].track, next: ordered[index + 1]?.track };
}

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
          start_timestamp?: string;
          links?: { rel?: string; href?: string }[];
          embeds?: {
            details?: {
              name?: string;
              description?: string;
              media?: { picture_large?: string };
              links?: { rel?: string; href?: string }[];
            };
          };
        };
      }[];
    };
    const show = body.results?.find((item) => item.channel_name === channel);
    const details = show?.now?.embeds?.details;
    const showName = details?.name || show?.now?.broadcast_title || "On air";
    const description = details?.description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() || station.blurb;
    const tracklist =
      details?.links?.find((link) => link.rel === "tracklist")?.href ||
      show?.now?.links?.find((link) => link.rel === "tracklist")?.href;
    let line = showName;
    let next = "";
    if (tracklist && show?.now?.start_timestamp) {
      try {
        const started = Date.parse(show.now.start_timestamp);
        if (!Number.isNaN(started)) {
          const elapsed = Math.floor((Date.now() - started) / 1000);
          const tracks = (await readJson(tracklist)) as { results?: NtsTrack[] };
          const playing = trackAt(tracks.results ?? [], elapsed);
          if (playing.current) line = trackLabel(playing.current);
          if (playing.next) next = trackLabel(playing.next);
        }
      } catch {
        line = showName;
      }
    }
    return {
      line,
      detail: line === showName ? description : showName,
      art: details?.media?.picture_large || "",
      next,
    };
  } catch {
    return { ...EMPTY, detail: station.blurb };
  }
}
