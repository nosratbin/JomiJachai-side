"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { plotStatus } from "@/lib/register";
import { isLost } from "@/lib/land-services";
import { MAP_COLOR, outline, centre, allOutlines, closeZoom } from "@/lib/map";
import { LEVEL } from "./PlotSlip";

export const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

let loading = null;
function loadGoogle(lang) {
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps);
  loading ||= new Promise((resolve, reject) => {
    window.__jomijachaiGoogleReady = () => resolve(window.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_KEY)}&language=${lang}&region=BD&loading=async&callback=__jomijachaiGoogleReady`;
    s.async = true;
    s.onerror = () => {
      loading = null;
      reject(new Error("Google Maps could not load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

const PIN_PATH = "M18 2C9.2 2 2 9 2 17.6 2 29.5 18 46 18 46s16-16.5 16-28.4C34 9 26.8 2 18 2z";

export default function GoogleLandMap({ state, selected, onSelect, recenter }) {
  const tr = useT();
  const box = useRef(null);
  const ref = useRef(null); // { maps, map, shapes }
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const pick = useRef(onSelect);
  pick.current = onSelect;

  const fitAll = () => {
    const { maps, map } = ref.current;
    const b = new maps.LatLngBounds();
    allOutlines(state).flat().forEach(([lat, lng]) => b.extend({ lat, lng }));
    map.fitBounds(b, 24);
  };
  const goTo = () => {
    const p = selected && state.plots[selected];
    const pts = p && outline(p);
    if (!pts) return fitAll();
    const [lat, lng] = centre(pts);
    ref.current.map.panTo({ lat, lng });
    ref.current.map.setZoom(closeZoom(p));
  };

  useEffect(() => {
    let gone = false;
    loadGoogle(tr.lang === "bn" ? "bn" : "en")
      .then((maps) => {
        if (gone || !box.current) return;
        const map = new maps.Map(box.current, {
          mapTypeId: "hybrid",
          tilt: 0,
          maxZoom: 21,
          gestureHandling: "cooperative",
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          cameraControl: false,
          rotateControl: false,
          zoomControl: true,
          clickableIcons: false,
          zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
        });
        ref.current = { maps, map, shapes: [] };
        setReady(true);
      })
      .catch(() => setFailed(true));
    return () => {
      gone = true;
      ref.current?.shapes.forEach((s) => s.setMap(null));
    };
  }, []);

  useEffect(() => {
    const r = ref.current;
    if (!ready || !r) return;
    const { maps, map } = r;
    r.shapes.forEach((s) => s.setMap(null));
    r.shapes = [];
    for (const [id, p] of Object.entries(state.plots)) {
      const pts = outline(p);
      if (!pts) continue;
      const level = plotStatus(state, id).level;
      const on = selected === id;
      const colour = isLost(state, id) ? MAP_COLOR.river : MAP_COLOR[level];
      const poly = new maps.Polygon({
        map,
        paths: pts.map(([lat, lng]) => ({ lat, lng })),
        strokeColor: on ? "#ffffff" : colour,
        strokeWeight: on ? 4 : 2,
        fillColor: colour,
        fillOpacity: on ? 0.45 : 0.32,
        zIndex: on ? 2 : 1,
      });
      poly.addListener("click", () => pick.current?.(id));
      r.shapes.push(poly);
      if (on) {
        const [lat, lng] = centre(pts);
        r.shapes.push(
          new maps.Marker({
            map,
            position: { lat, lng },
            zIndex: 10,
            title: tr(`দাগ ${tr.num(p.dag)}: ${LEVEL[level].bn}`, `Dag ${p.dag}: ${LEVEL[level].en}`),
            icon: { path: PIN_PATH, fillColor: MAP_COLOR[level], fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2.5, anchor: new maps.Point(18, 46), labelOrigin: new maps.Point(18, 18), scale: 1 },
            label: { text: tr.num(p.dag), color: "#ffffff", fontSize: "10px", fontWeight: "700" },
          })
        );
      }
    }
  }, [ready, state, selected, tr.lang]);

  useEffect(() => {
    if (ready && ref.current) goTo();
  }, [ready, selected, recenter]);

  return (
    <div className="absolute inset-0 z-[1001] bg-muted">
      <div ref={box} className="size-full" />
      {failed && (
        <p className="absolute inset-x-4 top-1/2 -translate-y-1/2 rounded-lg bg-background p-4 text-center text-sm font-semibold ring-1 ring-border">
          {tr("গুগল ম্যাপ লোড হয়নি। ইন্টারনেট সংযোগ দেখুন, অথবা স্যাটেলাইট ভিউ ব্যবহার করুন।", "Google Maps did not load. Check the internet connection, or use the satellite view.")}
        </p>
      )}
    </div>
  );
}
