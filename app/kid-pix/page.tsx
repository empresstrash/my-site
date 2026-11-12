import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";
import Gate from "./Gate";
import Picker from "./Picker";
import "./kid-pix.css";

export const metadata: Metadata = {
  title: "kid pix · Empress Trash",
  description: "A private drawing page.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "overlays-content",
};

export default async function KidPixPage() {
  const jar = await cookies();
  const open = cookieIsValid(jar.get(VR_COOKIE)?.value);
  if (!open) return <Gate />;
  return (
    <Suspense fallback={null}>
      <Picker />
    </Suspense>
  );
}
