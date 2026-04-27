const CENTER_LAT = parseFloat(Deno.env.get("DELIVERY_ZONE_CENTER_LAT") ?? "41.2995");
const CENTER_LNG = parseFloat(Deno.env.get("DELIVERY_ZONE_CENTER_LNG") ?? "69.2401");
const RADIUS_KM = parseFloat(Deno.env.get("DELIVERY_ZONE_RADIUS_KM") ?? "2.0");

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function isInsideDeliveryZone(lat: number, lng: number): boolean {
  const R = 6371;
  const dLat = toRad(lat - CENTER_LAT);
  const dLng = toRad(lng - CENTER_LNG);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(CENTER_LAT)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;
  const d = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return d <= RADIUS_KM;
}
