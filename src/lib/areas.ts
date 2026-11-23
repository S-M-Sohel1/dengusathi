/** Demo areas (upazila / thana). Patients pick one; no GPS is stored, for privacy. */
export const AREAS = [
  { id: "noakhali-sadar", nameBn: "নোয়াখালী সদর", lat: 22.8696, lng: 91.0995 },
  { id: "sonapur", nameBn: "সোনাপুর", lat: 22.8236, lng: 91.1003 },
  { id: "begumganj", nameBn: "বেগমগঞ্জ", lat: 22.9466, lng: 91.1036 },
  { id: "companiganj", nameBn: "কোম্পানীগঞ্জ", lat: 22.8781, lng: 91.2878 },
  { id: "mirpur", nameBn: "মিরপুর, ঢাকা", lat: 23.8223, lng: 90.3654 },
  { id: "uttara", nameBn: "উত্তরা, ঢাকা", lat: 23.8759, lng: 90.3795 },
  { id: "jatrabari", nameBn: "যাত্রাবাড়ী, ঢাকা", lat: 23.7104, lng: 90.4348 },
  { id: "mohammadpur", nameBn: "মোহাম্মদপুর, ঢাকা", lat: 23.7662, lng: 90.3589 },
  { id: "chattogram-sadar", nameBn: "চট্টগ্রাম সদর", lat: 22.3569, lng: 91.7832 },
  { id: "cumilla-sadar", nameBn: "কুমিল্লা সদর", lat: 23.4607, lng: 91.1809 },
] as const;

export type AreaId = (typeof AREAS)[number]["id"];
export const areaName = (id: string) => AREAS.find((a) => a.id === id)?.nameBn ?? id;
