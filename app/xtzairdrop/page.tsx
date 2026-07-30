import type { Metadata } from "next";
import AirdropTool from "./AirdropTool";

export const metadata: Metadata = {
  title: "xtz airdrop tool · Empress Trash",
};

export default function AirdropPage() {
  return <AirdropTool />;
}
