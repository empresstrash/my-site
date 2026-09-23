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

function clean(value: string): string {
  return value
    .replace(/&#0*39;|'/g, "'")
    .replace(/&/g, "&")
    .replace(/"|&#0*34;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
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
      const body = (await readJson(`https://api.radioparadise.com/api/now_playing?chan=${station.meta.chan}`)) as {
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
    if (station.meta.kind === "kexp") {
      const body = (await readJson("https://api.kexp.org/v2/plays/?limit=5&ordering=-airdate")) as {
        results?: { play_type?: string; artist?: string; song?: string; album?: string; image_uri?: string; thumbnail_uri?: string }[];
      };
      const play = body.results?.find((item) => item.play_type === "trackplay" && item.song);
      return {
        line: play ? [play.artist, play.song].filter(Boolean).join(" — ") : "On air",
        detail: play?.album || station.blurb,
        art: play?.image_uri || play?.thumbnail_uri || "",
        next: "",
      };
    }
    if (station.meta.kind === "fip") {
      const body = (await readJson("https://api.radiofrance.fr/livemeta/pull/7")) as {
        levels?: { position?: number; items?: string[] }[];
        steps?: Record<string, { authors?: string; title?: string; titreAlbum?: string; anneeEditionMusique?: string; visual?: string }>;
      };
      const level = body.levels?.[0];
      const id = level?.items?.[level.position ?? 0];
      const step = id ? body.steps?.[id] : undefined;
      return {
        line: [step?.authors, step?.title].filter(Boolean).join(" — ") || "On air",
        detail: [step?.titreAlbum, step?.anneeEditionMusique].filter(Boolean).join(" · ") || station.blurb,
        art: step?.visual || "",
        next: "",
      };
    }
    if (station.meta.kind === "airtime") {
      const body = (await readJson(station.meta.info)) as {
        tracks?: { current?: { type?: string; name?: string; metadata?: { artist_name?: string; track_title?: string; album_title?: string } } };
        shows?: { current?: { name?: string } };
      };
      const current = body.tracks?.current;
      const meta = current?.metadata;
      const titled = [meta?.artist_name, meta?.track_title].filter(Boolean).join(" — ");
      const showName = clean(body.shows?.current?.name || "");
      const line = titled || (current?.type === "track" && current.name ? clean(current.name) : "") || showName || "On air";
      return {
        line,
        detail: line === showName ? station.blurb : showName || station.blurb,
        art: "",
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
