/**
 * One-time fetch of every hospital in Bangladesh from OpenStreetMap (Overpass API).
 * Run:  node scripts/data/fetch-hospitals.mjs   -> writes src/data/hospitals.json
 * Never call Overpass at runtime: it is slow and rate limited.
 * Includes amenity=hospital plus clinics named "... Health Complex" / "... Sadar Hospital"
 * (upazila health complexes are the first government stop for dengue outside cities).
 * Data © OpenStreetMap contributors (ODbL).
 */
import { readFileSync, writeFileSync } from "node:fs";

const HEAD = `[out:json][timeout:180];area["ISO3166-1"="BD"][admin_level=2]->.bd;`;
const QUERIES = [
  `${HEAD}nwr["amenity"="hospital"](area.bd);out center tags;`,
  `${HEAD}nwr["healthcare"="hospital"]["amenity"!="hospital"](area.bd);out center tags;`,
  `${HEAD}nwr["amenity"="clinic"]["name"~"Health Complex|Sadar Hospital|District Hospital|স্বাস্থ্য কমপ্লেক্স"](area.bd);out center tags;`,
];

const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];
async function overpass(q) {
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        body: new URLSearchParams({ data: q }),
        headers: { "user-agent": "denguesathi-hackathon-prototype" },
        signal: AbortSignal.timeout(200_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()).elements;
    } catch (e) {
      console.warn(url, "failed:", e.message);
    }
  }
  throw new Error("all Overpass endpoints failed");
}
const data = { elements: [] };
for (const q of QUERIES) data.elements.push(...(await overpass(q)));

// Name generic entries ("Upazila Health Complex") after the nearest upazila so the list is readable.
const { areas, districts } = JSON.parse(readFileSync("src/data/bd-locations.json", "utf8"));
const km = (a, b) => {
  const r = Math.PI / 180;
  const h =
    Math.sin(((b.lat - a.lat) * r) / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(((b.lng - a.lng) * r) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
const nearest = (p) => areas.reduce((best, a) => (km(p, a) < km(p, best) ? a : best), areas[0]);
const GENERIC = /^(upazila health complex|uhc|health complex|sadar hospital|district hospital|hospital|clinic)$/i;

const round = (n) => Math.round(n * 1e5) / 1e5;
const seen = new Set();
const hospitals = [];
for (const e of data.elements) {
  const lat = e.lat ?? e.center?.lat;
  const lng = e.lon ?? e.center?.lon;
  let name = (e.tags?.["name:en"] ?? e.tags?.name ?? "").trim();
  if (!name || lat == null || lng == null) continue;
  const p = { lat: round(lat), lng: round(lng) };
  if (GENERIC.test(name)) {
    const a = nearest(p);
    name = `${a.en} ${name.replace(/^uhc$/i, "Upazila Health Complex")}`;
  }
  // Same name within ~1 km is the same hospital mapped twice (node + building).
  const key = `${name.toLowerCase()}|${p.lat.toFixed(2)}|${p.lng.toFixed(2)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  hospitals.push({
    id: `${e.type}/${e.id}`,
    name,
    nameBn: e.tags?.["name:bn"] ?? (/[ঀ-৿]/.test(e.tags?.name ?? "") ? e.tags.name : null),
    ...p,
    phone: e.tags?.phone ?? e.tags?.["contact:phone"] ?? null,
    emergency: e.tags?.emergency === "yes",
    dengueCare: false,
  });
}

writeFileSync("src/data/hospitals.json", JSON.stringify(hospitals));
const perDistrict = new Map();
for (const h of hospitals) {
  const d = nearest(h).d;
  perDistrict.set(d, (perDistrict.get(d) ?? 0) + 1);
}
const empty = districts.filter((d) => !perDistrict.has(d.id)).map((d) => d.en);
console.log(`${hospitals.length} hospitals saved to src/data/hospitals.json`);
console.log(`districts with no hospital in OSM: ${empty.length ? empty.join(", ") : "none"}`);
