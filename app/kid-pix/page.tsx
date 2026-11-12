import type { Metadata, Viewport } from "next";
import Studio from "./Studio";
import "./kid-pix.css";

export const metadata: Metadata = {
  title: "kid pix · Empress Trash",
  description: "A touch drawing toy for iPad and VR. Pictures stay on this device.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default function KidPixPage() {
  return <Studio />;
}
