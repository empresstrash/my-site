import { decodeChat } from "@/lib/vr/proto";

export type GhostPhase = "connecting" | "live" | "error";

export type GhostStatus = {
  phase: GhostPhase;
  detail: string;
  peers: number;
};

export type GhostChat = {
  address: string;
  text: string;
  at: number;
};

type GhostHandlers = {
  onStatus: (status: GhostStatus) => void;
  onChat: (chat: GhostChat) => void;
};

export function startParcelGhost(handlers: GhostHandlers): () => void {
  let stopped = false;
  let roomClose: (() => void) | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  let refresh: ReturnType<typeof setTimeout> | null = null;

  const stopRoom = () => {
    roomClose?.();
    roomClose = null;
  };

  const connect = async (quiet = false) => {
    if (stopped) return;
    if (!quiet) handlers.onStatus({ phase: "connecting", detail: "Opening the atelier", peers: 0 });
    try {
      const response = await fetch("/api/vr/room");
      if (!response.ok) throw new Error("The atelier room did not open");
      const roomInfo = (await response.json()) as { serverUrl: string; token: string };
      if (stopped) return;
      const { Room, RoomEvent } = await import("livekit-client");
      const room = new Room();
      let closed = false;
      room.on(RoomEvent.DataReceived, (payload, participant) => {
        const bytes = payload instanceof Uint8Array ? payload : new Uint8Array(payload);
        const chat = decodeChat(bytes);
        if (!chat) return;
        const address = (participant?.identity || "").toLowerCase();
        const raw = chat.timestamp;
        const ms = raw > 10_000_000_000 ? raw : raw > 1_000_000_000 ? raw * 1000 : 0;
        const at = ms && Math.abs(Date.now() - ms) < 5 * 60 * 1000 ? ms : Date.now();
        handlers.onChat({
          address: address.startsWith("0x") ? address : address || "someone",
          text: chat.message,
          at,
        });
      });
      await room.connect(roomInfo.serverUrl, roomInfo.token, { autoSubscribe: false });
      if (closed || stopped) {
        room.disconnect();
        return;
      }
      roomClose = () => {
        closed = true;
        room.disconnect();
      };
      handlers.onStatus({
        phase: "live",
        detail: "Atelier",
        peers: room.remoteParticipants.size,
      });
      refresh = setTimeout(() => {
        stopRoom();
        void connect(true);
      }, 4 * 60 * 1000);
    } catch (error) {
      if (stopped) return;
      const message = error instanceof Error ? error.message : "The atelier room did not open";
      handlers.onStatus({ phase: "error", detail: message, peers: 0 });
      retry = setTimeout(() => void connect(), 8000);
    }
  };

  void connect();
  return () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    if (refresh) clearTimeout(refresh);
    stopRoom();
  };
}
