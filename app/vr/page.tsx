import type { Metadata } from "next";
import { cookies } from "next/headers";
import { cookieIsValid, VR_COOKIE } from "@/lib/vr/gate";
import Booth from "./Booth";
import "./vr.css";

export const metadata: Metadata = {
  title: "vr booth · Empress Trash",
};

export default async function VrPage() {
  const jar = await cookies();
  const open = cookieIsValid(jar.get(VR_COOKIE)?.value);
  return <Booth initialOpen={open} />;
}
