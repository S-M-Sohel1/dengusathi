/**
 * One-time fetch of hospitals near the demo areas from OpenStreetMap (Overpass API).
 * Run:  node scripts/data/fetch-hospitals.mjs   -> writes src/data/hospitals.json
 * Never call Overpass at runtime: it is slow and rate limited.
 * After fetching, hand-check the list and set "dengueCare": true for known dengue-treating hospitals.
 */
import { writeFileSync } from "node:fs";

const CENTERS = [
  ["noakhali", 22.85, 91.1, 20000],
  ["dhaka", 23.79, 90.39, 12000],
  ["chattogram", 22.35, 91.81, 10000],
  ["cumilla", 23.46, 91.18, 8000],
];
const q = `[out:json][timeout:90];(${CENTERS.map(([, lat, lng, r]) => `nwr["amenity"="hospital"](around:${r},${lat},${lng});`).join("")});out center tags;`;

const endpoints = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
let data;
for (const url of endpoints) {
  try {
    const res = await fetch(url, { method: "POST", body: new URLSearchParams({ data: q }), headers: { "user-agent": "denguesathi-hackathon-prototype" }, signal: AbortSignal.timeout(120000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    data = await res.json();
    break;
  } catch (e) { console.warn(url, "failed:", e.message); }
}
if (!data) process.exit(1);

const seen = new Set();
const hospitals = data.elements
  .map((e) => ({
    id: `${e.type}/${e.id}`,
    name: e.tags?.name ?? e.tags?.["name:en"],
    nameBn: e.tags?.["name:bn"] ?? null,
    lat: e.lat ?? e.center?.lat,
    lng: e.lon ?? e.center?.lon,
    phone: e.tags?.phone ?? e.tags?.["contact:phone"] ?? null,
    emergency: e.tags?.emergency === "yes",
    dengueCare: false,
  }))
  .filter((h) => h.name && h.lat && h.lng && !seen.has(h.name) && seen.add(h.name));

writeFileSync("src/data/hospitals.json", JSON.stringify(hospitals, null, 1));
console.log(`${hospitals.length} hospitals saved to src/data/hospitals.json`);
