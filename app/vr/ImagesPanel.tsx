"use client";

import { useEffect, useRef, useState } from "react";
import {
  type BoothImage,
  type ImageKind,
  MAX_IMAGE_BYTES,
  MAX_IMAGE_COUNT,
  fallbackName,
  kindOfFile,
  randomId,
  safeFileName,
} from "@/lib/vr/image-kind";

type Mode = "file" | "blob" | "off";

const ACCEPT = "image/png,image/jpeg,image/gif,.png,.jpg,.jpeg,.gif";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;
}

function clock(at: number): string {
  return new Date(at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function BoothPicture({ image }: { image: BoothImage }) {
  const [attempt, setAttempt] = useState(0);
  const src = `/api/vr/images/${image.id}${attempt ? `?retry=${attempt}` : ""}`;
  return (
    <img
      src={src}
      alt={image.name}
      onError={() => setAttempt((current) => (current < 2 ? current + 1 : current))}
    />
  );
}

export default function ImagesPanel() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [images, setImages] = useState<BoothImage[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  async function load() {
    const response = await fetch("/api/vr/images", { cache: "no-store" });
    if (!response.ok || !alive.current) return;
    const body = (await response.json()) as { mode?: Mode; images?: BoothImage[] };
    if (!alive.current || !body.mode || !body.images) return;
    setMode(body.mode);
    setImages(body.images);
    setNotice(body.mode === "off" ? "Image storage is not connected on this server yet." : "");
  }

  useEffect(() => {
    alive.current = true;
    void load();
    const timer = setInterval(() => void load(), 4000);
    return () => {
      alive.current = false;
      clearInterval(timer);
    };
  }, []);

  async function uploadOne(file: File) {
    const kind: ImageKind | null = kindOfFile(file.name, file.type);
    if (!kind) {
      setError(`${file.name} is not a png, jpg, or gif.`);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`${file.name} is over 20 MB.`);
      return;
    }
    if (imagesRef.current.length >= MAX_IMAGE_COUNT) {
      setError("Remove an image first. This tab holds 40.");
      return;
    }
    if (mode !== "file" && mode !== "blob") {
      setError("Image storage is not connected on this server yet.");
      return;
    }
    if (mode === "blob") {
      const safe = safeFileName(file.name) ?? fallbackName(kind);
      const { uploadPresigned } = await import("@vercel/blob/client");
      await uploadPresigned(`vr-booth/${randomId()}-${safe}`, file, {
        access: "private",
        contentType: kind,
        handleUploadUrl: "/api/vr/images/upload",
      });
      return;
    }
    const form = new FormData();
    form.append("file", file);
    const response = await fetch("/api/vr/images", { method: "POST", body: form });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (!response.ok) throw new Error(body?.error || "Upload did not finish.");
  }

  async function send(list: FileList | File[]) {
    const files = [...list];
    if (!files.length || busy) return;
    setError("");
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      setBusy(files.length > 1 ? `Uploading ${index + 1} of ${files.length}` : `Uploading ${file.name}`);
      try {
        await uploadOne(file);
        await load();
      } catch (caught) {
        const message = caught instanceof Error && caught.message && !caught.message.startsWith("Vercel Blob") ? caught.message : "";
        setError(message || `${file.name} did not upload.`);
      }
    }
    setBusy("");
    if (inputRef.current) inputRef.current.value = "";
  }

  async function remove(image: BoothImage) {
    setError("");
    const response = await fetch(`/api/vr/images/${image.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error || "That image did not get removed.");
      return;
    }
    setImages((current) => current.filter((item) => item.id !== image.id));
  }

  const canUpload = !busy && (mode === "file" || mode === "blob");

  return (
    <section className="vr-images" aria-label="Images">
      <div
        className={drag ? "vr-drop is-over" : "vr-drop"}
        onDragEnter={(event) => {
          event.preventDefault();
          setDrag(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDrag(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDrag(false);
          if (event.dataTransfer.files.length) void send(event.dataTransfer.files);
        }}
      >
        <label className={canUpload ? "vr-upload" : "vr-upload is-busy"}>
          Upload
          <input
            ref={inputRef}
            className="vr-file-input"
            type="file"
            accept={ACCEPT}
            multiple
            disabled={!canUpload}
            onChange={(event) => {
              if (event.target.files?.length) void send(event.target.files);
            }}
          />
        </label>
        <p className="vr-muted vr-drop-note">{busy || "png, jpg, or gif. Drop files here, then download them in VR."}</p>
      </div>
      {error ? <p className="vr-error vr-image-status">{error}</p> : null}
      {!error && notice && mode === "off" ? <p className="vr-error vr-image-status">{notice}</p> : null}
      <div className="vr-image-grid">
        {images.length === 0 ? (
          <p className="vr-muted">No images yet.</p>
        ) : (
          images.map((image) => (
            <article key={image.id} className="vr-image-card">
              <BoothPicture image={image} />
              <p className="vr-image-name">{image.name}</p>
              <p className="vr-muted vr-image-meta">
                {formatBytes(image.bytes)} · {clock(image.at)}
              </p>
              <div className="vr-image-actions">
                <a className="vr-file-btn" href={`/api/vr/images/${image.id}?download=1`} download={image.name}>
                  Download
                </a>
                <button type="button" className="vr-file-quiet" onClick={() => void remove(image)}>
                  Remove
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
