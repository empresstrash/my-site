function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function varint(value: number): Uint8Array {
  const bytes: number[] = [];
  let rest = value >>> 0;
  while (rest >= 0x80) {
    bytes.push((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  bytes.push(rest);
  return Uint8Array.from(bytes);
}

function tag(field: number, wire: number): Uint8Array {
  return varint((field << 3) | wire);
}

function lengthDelimited(field: number, payload: Uint8Array): Uint8Array {
  return concat([tag(field, 2), varint(payload.length), payload]);
}

function protoString(field: number, value: string): Uint8Array {
  return lengthDelimited(field, new TextEncoder().encode(value));
}

function protoFloat(field: number, value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setFloat32(0, value, true);
  return concat([tag(field, 5), bytes]);
}

export function encodeChallengeRequest(address: string): Uint8Array {
  return lengthDelimited(1, protoString(1, address));
}

export function encodeSignedChallenge(authChainJson: string): Uint8Array {
  return lengthDelimited(2, protoString(1, authChainJson));
}

export function encodeHeartbeat(x: number, y: number, z: number): Uint8Array {
  const position = concat([protoFloat(1, x), protoFloat(2, y), protoFloat(3, z)]);
  return lengthDelimited(3, lengthDelimited(1, position));
}

export type ServerEvent =
  | { kind: "challenge"; challenge: string; alreadyConnected: boolean }
  | { kind: "welcome"; peerId: string }
  | { kind: "island"; islandId: string; connStr: string; peers: number }
  | { kind: "join" }
  | { kind: "left" }
  | { kind: "kicked" }
  | { kind: "unknown" };

class Reader {
  private offset = 0;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  get done(): boolean {
    return this.offset >= this.bytes.length;
  }

  readVarint(): number {
    let value = 0;
    let shift = 0;
    while (this.offset < this.bytes.length && shift < 35) {
      const byte = this.bytes[this.offset++];
      value += (byte & 0x7f) * 2 ** shift;
      if ((byte & 0x80) === 0) return value;
      shift += 7;
    }
    return value;
  }

  readBytes(): Uint8Array {
    const length = this.readVarint();
    const start = this.offset;
    this.offset += length;
    return this.bytes.subarray(start, Math.min(this.offset, this.bytes.length));
  }

  skip(wire: number) {
    if (wire === 0) this.readVarint();
    else if (wire === 1) this.offset += 8;
    else if (wire === 5) this.offset += 4;
    else if (wire === 2) this.readBytes();
    else this.offset = this.bytes.length;
  }

  fields(): Map<number, Uint8Array | number | string> {
    const found = new Map<number, Uint8Array | number | string>();
    while (!this.done) {
      const key = this.readVarint();
      const field = key >>> 3;
      const wire = key & 7;
      if (wire === 2) found.set(field, this.readBytes());
      else if (wire === 0) found.set(field, this.readVarint());
      else if (wire === 1) {
        const view = new DataView(this.bytes.buffer, this.bytes.byteOffset + this.offset, 8);
        found.set(field, view.getFloat64(0, true));
        this.offset += 8;
      } else this.skip(wire);
    }
    return found;
  }
}

function textOf(value: Uint8Array | number | string | undefined): string {
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return "";
}

function countMapEntries(bytes: Uint8Array, fieldNumber: number): number {
  const reader = new Reader(bytes);
  let count = 0;
  while (!reader.done) {
    const key = reader.readVarint();
    const field = key >>> 3;
    const wire = key & 7;
    if (field === fieldNumber && wire === 2) {
      count += 1;
      reader.readBytes();
    } else reader.skip(wire);
  }
  return count;
}

export function decodeServerPacket(payload: Uint8Array): ServerEvent {
  const top = new Reader(payload).fields();
  if (top.has(1)) {
    const inner = new Reader(bytesOf(top.get(1))).fields();
    return {
      kind: "challenge",
      challenge: textOf(inner.get(1)),
      alreadyConnected: inner.get(2) === 1,
    };
  }
  if (top.has(2)) {
    const inner = new Reader(bytesOf(top.get(2))).fields();
    return { kind: "welcome", peerId: textOf(inner.get(1)) };
  }
  if (top.has(3)) {
    const raw = bytesOf(top.get(3));
    const inner = new Reader(raw).fields();
    return {
      kind: "island",
      islandId: textOf(inner.get(1)),
      connStr: textOf(inner.get(2)),
      peers: countMapEntries(raw, 4),
    };
  }
  if (top.has(4)) return { kind: "left" };
  if (top.has(5)) return { kind: "join" };
  if (top.has(6)) return { kind: "kicked" };
  return { kind: "unknown" };
}

export type DecodedChat = {
  message: string;
  timestamp: number;
  id?: string;
};

function bytesOf(value: Uint8Array | number | string | undefined): Uint8Array {
  return value instanceof Uint8Array ? value : new Uint8Array();
}

export function decodeChat(payload: Uint8Array): DecodedChat | null {
  const top = new Reader(payload).fields();
  const chatBytes = top.get(5);
  if (!(chatBytes instanceof Uint8Array)) return null;
  const inner = new Reader(chatBytes).fields();
  const message = (textOf(inner.get(4)) || textOf(inner.get(1))).trim();
  if (!message) return null;
  const timestamp = inner.get(2);
  const id = textOf(inner.get(3)).trim();
  return {
    message,
    timestamp: typeof timestamp === "number" ? timestamp : 0,
    id: id || undefined,
  };
}
