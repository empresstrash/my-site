import type { Metadata } from "next";
import Booth from "./Booth";
import "./vr.css";

export const metadata: Metadata = {
  title: "vr booth · Empress Trash",
};

export default function VrPage() {
  return <Booth />;
}
