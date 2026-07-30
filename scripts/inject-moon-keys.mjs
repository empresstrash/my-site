import fs from "fs";

const path = "app/full-moon/data.ts";
let s = fs.readFileSync(path, "utf8");

const moons = {
  "tez-key": ["2022-05-key", "Origin · Full Moon Lunar Eclipse"],
  "base-key": ["2025-09-key", "Base Extension · Full Moon Lunar Eclipse"],
  t76: ["2026-07", "Buck Moon"],
  b11: ["2026-07", "Buck Moon"],
  t70: ["2026-06", "Full Moon"],
  b10: ["2026-06", "Full Moon"],
  t69: ["2026-05-blue", "Blue Moon"],
  b9: ["2026-05-blue", "Blue Moon"],
  t67: ["2026-05-flower", "Flower Moon"],
  b8: ["2026-05-flower", "Flower Moon"],
  t64: ["2026-04", "Pink Moon · Artemis II"],
  b7: ["2026-04", "Pink Moon · Artemis II"],
  t63: ["2026-03", "Blood Moon Lunar Eclipse"],
  b6: ["2026-03", "Blood Moon Lunar Eclipse"],
  t62: ["2026-02", "Snow Moon"],
  b5: ["2026-02", "Snow Moon"],
  t61: ["2026-01", "Wolf Moon"],
  b4: ["2026-01", "Wolf Moon"],
  t59: ["2025-12", "Cold Moon"],
  b3: ["2025-12", "Cold Moon"],
  t58: ["2025-11", "Full Moon"],
  b2: ["2025-11", "Full Moon"],
  t57: ["2025-10", "Hunter's Moon"],
  s3: ["2025-10", "Hunter's Moon"],
  t56: ["2025-09", "Lunar Eclipse"],
  t53: ["2025-08", "Full Moon"],
  t52: ["2025-07", "Full Moon"],
  t51: ["2025-06", "Full Moon"],
  t50: ["2025-05", "Flower Moon"],
  t49: ["2025-04", "Pink Moon"],
  t47: ["2025-03", "Blood Moon"],
  t46: ["2025-02", "Snow Moon"],
  t45: ["2025-01", "Wolf Moon"],
  t43: ["2024-12", "Full Moon"],
  t40: ["2024-11", "Full Moon"],
  t39: ["2024-10", "Aries Full Moon"],
  t38: ["2024-09", "Lunar Eclipse"],
  t37: ["2024-08", "Full Moon"],
  t36: ["2024-07", "Full Moon"],
  t35: ["2024-06", "Summer Solstice Full Moon"],
  t34: ["2024-05", "Full Moon"],
  t33: ["2024-04", "Pink Moon"],
  t31: ["2024-02", "Full Moon"],
  t30: ["2024-01", "Full Moon"],
  t26: ["2023-12-cold", "Cold Moon"],
  t25: ["2023-12-solstice", "Winter Solstice"],
  t23: ["2023-11", "Beaver Moon"],
  t22: ["2023-10", "Hunter's Moon"],
  t21: ["2023-09", "Harvest Super Moon"],
  t20: ["2023-08-blue", "Blue Moon"],
  t18: ["2023-08-sturgeon", "Sturgeon Super Moon"],
  t14: ["2023-07", "Capricorn Super Moon"],
  t8: ["2023-06", "Full Moon"],
  t5: ["2023-05", "Flower Moon Lunar Eclipse · Year One"],
  t4: ["2023-05", "Flower Moon Lunar Eclipse · Year One"],
  t3: ["2023-04", "Pink Moon"],
};

for (const [id, [key, name]] of Object.entries(moons)) {
  // skip if already injected after this id
  const near = new RegExp(`id: "${id}"[\\s\\S]{0,600}?moonKey:`);
  if (near.test(s)) continue;

  const re = new RegExp(`(id: "${id}"[\\s\\S]*?date: "[^"]+",)`);
  if (!re.test(s)) {
    console.error("no match for", id);
    continue;
  }
  s = s.replace(re, `$1\n    moonKey: "${key}",\n    moonName: ${JSON.stringify(name)},`);
}

const helper = `
export function allTimelineWorks(): MoonWork[] {
  return [...TIMELINE, ...BASE_AIRDROPS, ...STRAY_WORKS];
}

export function timelineByMoon(): MoonGroup[] {
  const works = allTimelineWorks();
  const map = new Map<string, MoonGroup>();
  for (const w of works) {
    const existing = map.get(w.moonKey);
    if (existing) {
      existing.works.push(w);
      if (w.date > existing.date) existing.date = w.date;
    } else {
      map.set(w.moonKey, {
        moonKey: w.moonKey,
        moonName: w.moonName,
        date: w.date,
        works: [w],
      });
    }
  }
  return [...map.values()].sort((a, b) =>
    a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
  );
}
`;

s = s.replace(/export function allTimelineWorks\(\)[\s\S]*$/, helper.trim() + "\n");

fs.writeFileSync(path, s);

const found = [...s.matchAll(/id: "([^"]+)"/g)].map((m) => m[1]);
for (const id of found) {
  if (!moons[id]) console.log("unmapped", id);
  if (!new RegExp(`id: "${id}"[\\s\\S]{0,600}?moonKey:`).test(s)) {
    console.log("no moonKey near", id);
  }
}
console.log("groups-ready, works:", found.length);
