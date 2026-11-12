"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Studio from "./Studio";

type Edition = "temu" | "classic";

const CLASSIC_SRC = "https://kidpix.app/";

export default function Picker() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get("edition");
  const edition: Edition = raw === "classic" || raw === "1" ? "classic" : "temu";
  const vr = params.has("vr");

  function choose(next: Edition) {
    const nextParams = new URLSearchParams(params.toString());
    if (next === "classic") nextParams.set("edition", "classic");
    else nextParams.delete("edition");
    const query = nextParams.toString();
    router.replace(query ? `/kid-pix?${query}` : "/kid-pix", { scroll: false });
  }

  return (
    <div className={vr ? "kp kp-vr" : "kp"}>
      <div className="kp-switch" role="tablist" aria-label="Kid Pix edition">
        <button type="button" role="tab" aria-selected={edition === "temu"} className={edition === "temu" ? "is-on" : ""} onClick={() => choose("temu")}>
          temu
        </button>
        <button type="button" role="tab" aria-selected={edition === "classic"} className={edition === "classic" ? "is-on" : ""} onClick={() => choose("classic")}>
          1.0
        </button>
        {edition === "classic" ? <span>open source 1.0, from kidpix.app</span> : null}
      </div>
      <div className="kp-pane">
        {edition === "temu" ? (
          <Studio />
        ) : (
          <iframe className="kp-classic" title="Kid Pix 1.0" src={CLASSIC_SRC} allow="autoplay; fullscreen; clipboard-write" />
        )}
      </div>
    </div>
  );
}
