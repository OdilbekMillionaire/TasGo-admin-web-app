"use client";

import { useEffect, useRef, useState } from "react";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CarrierInfo = {
  id: string;
  full_name: string | null;
  phone: string;
  is_online: boolean;
  current_lat: number | null;
  current_lng: number | null;
  last_location_update: string | null;
};

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ymaps3: any;
  }
}

const STORE_CENTER = [
  parseFloat(process.env.NEXT_PUBLIC_DELIVERY_ZONE_CENTER_LNG ?? "69.2401"),
  parseFloat(process.env.NEXT_PUBLIC_DELIVERY_ZONE_CENTER_LAT ?? "41.2995"),
] as [number, number];

export default function CarriersPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ymapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());
  const [carriers, setCarriers] = useState<CarrierInfo[]>([]);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const apiKey = process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY ?? "";

  async function fetchCarriers() {
    const { data } = await supabaseAdmin
      .from("carrier_profiles")
      .select(`
        id,
        is_online,
        current_lat,
        current_lng,
        last_location_update,
        profiles!inner(full_name, phone)
      `)
      .eq("is_online", true);

    if (!data) return;
    const rows: CarrierInfo[] = data.map((r) => ({
      id: r.id,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      full_name: (r.profiles as any)?.full_name ?? null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      phone: (r.profiles as any)?.phone ?? "",
      is_online: r.is_online,
      current_lat: r.current_lat,
      current_lng: r.current_lng,
      last_location_update: r.last_location_update,
    }));
    setCarriers(rows);
    return rows;
  }

  async function initMap() {
    if (!mapRef.current || !window.ymaps3) return;
    try {
      await window.ymaps3.ready;
      const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } =
        window.ymaps3;

      const map = new YMap(mapRef.current, {
        location: { center: STORE_CENTER, zoom: 13 },
      });
      map.addChild(new YMapDefaultSchemeLayer({}));
      map.addChild(new YMapDefaultFeaturesLayer({}));
      ymapRef.current = { map, YMapMarker };
      setMapReady(true);

      // Store pin
      const storePinEl = document.createElement("div");
      storePinEl.innerHTML = `<div style="background:#2E7D32;color:#fff;font-weight:700;font-size:11px;padding:4px 8px;border-radius:8px;white-space:nowrap;">🏪 Do'kon</div>`;
      map.addChild(new YMapMarker({ coordinates: STORE_CENTER }, storePinEl));
    } catch (err) {
      setMapError("Xarita yuklanmadi: " + String(err));
    }
  }

  function updateMarkers(rows: CarrierInfo[]) {
    if (!ymapRef.current) return;
    const { map, YMapMarker } = ymapRef.current;

    // Remove stale markers
    for (const [id, marker] of markersRef.current) {
      if (!rows.find((r) => r.id === id)) {
        map.removeChild(marker);
        markersRef.current.delete(id);
      }
    }

    // Add / update markers
    for (const carrier of rows) {
      if (!carrier.current_lat || !carrier.current_lng) continue;
      const coords: [number, number] = [carrier.current_lng, carrier.current_lat];

      if (markersRef.current.has(carrier.id)) {
        // Update position by removing + re-adding (ymaps3 doesn't have setCoords)
        map.removeChild(markersRef.current.get(carrier.id));
      }

      const el = document.createElement("div");
      el.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="background:#22C55E;color:#fff;font-weight:600;font-size:11px;padding:3px 7px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">🛵 ${carrier.full_name ?? carrier.phone}</div>
        <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid #22C55E"></div>
      </div>`;

      const marker = new YMapMarker({ coordinates: coords }, el);
      map.addChild(marker);
      markersRef.current.set(carrier.id, marker);
    }
  }

  // Load Yandex Maps script
  useEffect(() => {
    if (!apiKey || apiKey === "REPLACE_WITH_YANDEX_KEY") {
      setMapError("NEXT_PUBLIC_YANDEX_MAPS_API_KEY not set — add it to .env.local");
      return;
    }
    if (document.querySelector('script[src*="api-maps.yandex.ru"]')) {
      void initMap();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://api-maps.yandex.ru/3.0/?apikey=${apiKey}&lang=ru_RU`;
    script.async = true;
    script.onload = () => void initMap();
    script.onerror = () => setMapError("Yandex Maps script yuklanmadi");
    document.head.appendChild(script);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  // Fetch carriers and update map on ready
  useEffect(() => {
    async function load() {
      const rows = await fetchCarriers();
      if (mapReady && rows) updateMarkers(rows);
    }
    void load();

    const channel = supabaseAdmin
      .channel("carrier-locations")
      .on("postgres_changes", { event: "*", schema: "public", table: "carrier_profiles" }, async () => {
        const rows = await fetchCarriers();
        if (mapReady && rows) updateMarkers(rows);
      })
      .subscribe();

    return () => { void supabaseAdmin.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady]);

  function minutesAgo(ts: string | null) {
    if (!ts) return "noma'lum";
    const diff = Math.round((Date.now() - new Date(ts).getTime()) / 60000);
    return diff < 1 ? "hozirgina" : `${diff} daqiqa oldin`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1C1C1A]">Kuryerlar xaritasi</h1>
          <p className="text-sm text-[#6B6B67] mt-0.5">
            Onlayn kuryerlar — {carriers.length} ta
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Jonli
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-[#E8E8E4] overflow-hidden" style={{ height: 480 }}>
            {mapError ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="text-4xl">🗺️</div>
                <p className="text-sm font-medium text-[#1C1C1A]">Xarita mavjud emas</p>
                <p className="text-xs text-[#6B6B67] max-w-xs">{mapError}</p>
              </div>
            ) : (
              <div ref={mapRef} className="w-full h-full" />
            )}
          </div>
        </div>

        {/* Carrier list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-[#6B6B67] uppercase tracking-wider">
            Onlayn ({carriers.length})
          </h2>
          {carriers.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E8E4] p-6 text-center">
              <p className="text-sm text-[#6B6B67]">Hozirda onlayn kuryer yo&apos;q</p>
            </div>
          ) : (
            carriers.map((c) => (
              <div
                key={c.id}
                className="bg-white rounded-2xl border border-[#E8E8E4] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-base flex-shrink-0">
                    🛵
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#1C1C1A] truncate">
                      {c.full_name ?? c.phone}
                    </p>
                    <p className="text-xs text-[#6B6B67]">{c.phone}</p>
                  </div>
                  <span className="ml-auto flex-shrink-0 w-2 h-2 rounded-full bg-green-500" />
                </div>
                {c.current_lat && c.current_lng ? (
                  <p className="text-xs text-[#ABABAB] mt-2">
                    📍 {c.current_lat.toFixed(4)}, {c.current_lng.toFixed(4)}
                    {" · "}
                    {minutesAgo(c.last_location_update)}
                  </p>
                ) : (
                  <p className="text-xs text-[#ABABAB] mt-2">Joylashuv ma&apos;lumoti yo&apos;q</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
