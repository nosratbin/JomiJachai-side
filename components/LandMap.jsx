"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { MapPinnedIcon, ExternalLinkIcon, LocateFixedIcon, LoaderCircleIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { plotStatus } from "@/lib/register";
import { isLost } from "@/lib/land-services";
import { MOUZAS } from "@/lib/seed";
import { outline, centre, allOutlines, latLngText, closeZoom } from "@/lib/map";
import * as F from "@/lib/fraction";
import { cn } from "@/lib/utils";
import { LEVEL } from "./PlotSlip";
import GoogleLandMap, { GOOGLE_KEY } from "./GoogleLandMap";

const TILES = {
  photo: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery © Esri, Maxar, Earthstar Geographics",
    maxNativeZoom: 18,
  },
  streets: {
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxNativeZoom: 19,
  },
};

const PIN = `<span class="lm-pulse"></span><svg viewBox="0 0 36 48" width="36" height="48" aria-hidden="true"><path d="M18 2C9.2 2 2 9 2 17.6 2 29.5 18 46 18 46s16-16.5 16-28.4C34 9 26.8 2 18 2z"/><circle cx="18" cy="17.5" r="6"/></svg>`;

export default function LandMap({ state, selected, onSelect, className, card = true }) {
  const tr = useT();
  const box = useRef(null);
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("photo");
  const [recenter, setRecenter] = useState(0);
  const pick = useRef(onSelect);
  pick.current = onSelect;

  const plot = selected && state.plots[selected];
  const pts = plot && outline(plot);
  const all = allOutlines(state);

  useEffect(() => {
    let gone = false;
    import("leaflet").then(({ default: L }) => {
      if (gone || !box.current) return;
      const map = L.map(box.current, { scrollWheelZoom: false, dragging: !L.Browser.mobile, maxZoom: 20, zoomControl: false });
      L.control.zoom({ position: "bottomright", zoomInTitle: tr("কাছে", "Zoom in"), zoomOutTitle: tr("দূরে", "Zoom out") }).addTo(map);
      map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
      const far = () => box.current?.classList.toggle("lm-far", map.getZoom() < 18);
      map.on("zoomend", far);
      ref.current = { L, map, base: null, layers: L.layerGroup().addTo(map) };
      map.fitBounds(all.flat(), { padding: [24, 24] });
      far();
      setReady(true);
    });
    return () => {
      gone = true;
      ref.current?.map.remove();
      ref.current = null;
    };
  }, []);

  useEffect(() => {
    const r = ref.current;
    if (!ready || !r || view === "google") return;
    r.base?.remove();
    const t = TILES[view];
    r.base = r.L.tileLayer(t.url, { attribution: t.attribution, maxNativeZoom: t.maxNativeZoom, maxZoom: 20, referrerPolicy: "strict-origin-when-cross-origin" }).addTo(r.map);
  }, [ready, view]);

  useEffect(() => {
    const r = ref.current;
    if (!ready || !r) return;
    const { L, layers } = r;
    layers.clearLayers();
    for (const [key, mouza] of Object.entries(MOUZAS)) {
      const ids = Object.keys(state.plots).filter((id) => state.plots[id].mouza.en === key && state.plots[id].map);
      if (!ids.length) continue;
      const b = L.latLngBounds(ids.flatMap((id) => outline(state.plots[id]))).pad(0.06);
      L.rectangle(b, { className: "lm-mouza", interactive: false, fill: false, weight: 2 }).addTo(layers);
      L.marker([b.getSouth(), b.getCenter().lng], {
        interactive: false,
        keyboard: false,
        icon: L.divIcon({ className: "lm-mouza-label", iconSize: null, html: `<span>${tr(`মৌজা ${mouza.bn} · জেএল ${tr.num(mouza.jl)}`, `Mouza ${key} · JL ${mouza.jl}`)}</span>` }),
      }).addTo(layers);

      for (const id of ids) {
        const p = state.plots[id];
        const level = plotStatus(state, id).level;
        const word = tr(LEVEL[level].bn, LEVEL[level].en);
        const on = selected === id;
        const poly = L.polygon(outline(p), { className: cn("lm-dag", level, on && "sel", isLost(state, id) && "lost"), weight: on ? 4 : 2 })
          .on("click", () => pick.current?.(id))
          .addTo(layers);
        const tiny = p.map[2] < 15;
        if (!on) poly.bindTooltip(tr.num(p.dag), { permanent: true, direction: tiny ? "right" : "center", offset: tiny ? [4, 0] : [0, 0], className: "lm-label" });
        const el = poly.getElement();
        if (el) {
          el.setAttribute("tabindex", "0");
          el.setAttribute("role", "button");
          el.setAttribute("aria-label", tr(`দাগ ${tr.num(p.dag)}, ${p.mouza.bn}: ${word}`, `Dag ${p.dag}, ${p.mouza.en}: ${word}`));
          el.setAttribute("aria-pressed", String(on));
          el.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick.current?.(id)));
        }
        if (on) {
          L.marker(centre(outline(p)), {
            keyboard: false,
            interactive: false,
            zIndexOffset: 1000,
            icon: L.divIcon({ className: cn("lm-pin", level), html: PIN, iconSize: [36, 48], iconAnchor: [18, 46] }),
          })
            .bindTooltip(`<b>${tr(`দাগ ${tr.num(p.dag)}`, `Dag ${p.dag}`)}</b> · ${word}`, { permanent: true, direction: "top", offset: [0, -46], className: cn("lm-pin-label", level) })
            .addTo(layers);
        }
      }
    }
  }, [ready, state, selected, tr.lang]);

  useEffect(() => {
    const r = ref.current;
    if (!ready || !r) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (pts) r.map.flyTo(centre(pts), closeZoom(plot), { animate: !still, duration: 0.9 });
    else if (recenter) r.map.flyToBounds(all.flat(), { padding: [24, 24], animate: !still, duration: 0.9 });
  }, [ready, selected, recenter]);

  const views = [
    ["photo", tr("স্যাটেলাইট", "Satellite")],
    ["streets", tr("রাস্তা", "Streets")],
    ...(GOOGLE_KEY ? [["google", tr("গুগল", "Google")]] : []),
  ];

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div className="relative isolate overflow-hidden rounded-2xl bg-muted ring-1 ring-border">
        <div className="relative">
          <div ref={box} className="lm h-[22rem] w-full md:h-[32rem]" role="region" aria-label={tr("জমির ম্যাপ", "Land map")} />
          {!ready && (
            <p className="absolute inset-0 z-[800] flex items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
              <LoaderCircleIcon className="size-4 animate-spin" aria-hidden="true" />
              {tr("ম্যাপ লোড হচ্ছে", "Loading the map")}
            </p>
          )}
          {view === "google" && <GoogleLandMap state={state} selected={selected} onSelect={onSelect} recenter={recenter} />}
          <div className="absolute top-3 right-3 z-[1002] inline-flex gap-0.5 rounded-full bg-background p-1 ring-1 ring-border" role="group" aria-label={tr("ম্যাপের ধরন", "Map type")}>
            {views.map(([k, label]) => (
              <button
                key={k}
                type="button"
                aria-pressed={view === k}
                onClick={() => setView(k)}
                className={cn("press min-h-9 cursor-pointer rounded-full px-3 text-sm font-semibold whitespace-nowrap", view === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setRecenter((n) => n + 1)}
            className="press absolute top-3 left-3 z-[1002] inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3.5 text-sm font-semibold ring-1 ring-border hover:text-primary"
          >
            <LocateFixedIcon className="size-4" aria-hidden="true" />
            {plot ? tr("দাগে ফিরুন", "Back to the dag") : tr("সব দাগ", "All dags")}
          </button>
        </div>
        {plot && card && <DagCard state={state} id={selected} where={pts && centre(pts)} />}
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        {["safe", "careful", "risky"].map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("legend-swatch", k)} aria-hidden="true" />
            {tr(LEVEL[k].bn, LEVEL[k].en)}
          </span>
        ))}
        <span className="text-muted-foreground">{tr(`${tr.num(all.length)}টি দাগ`, `${all.length} dags`)}</span>
        {plot && pts && !card && <GoogleLink where={centre(pts)} className="ml-auto" />}
      </figcaption>
    </figure>
  );
}

export function GoogleLink({ where, className }) {
  const tr = useT();
  return (
    <a
      href={`https://www.google.com/maps/search/?api=1&query=${latLngText(where)}`}
      target="_blank"
      rel="noreferrer"
      className={cn("inline-flex min-h-11 w-fit items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline", className)}
    >
      {tr("গুগল ম্যাপে খুলুন", "Open in Google Maps")}
      <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
    </a>
  );
}

function DagCard({ state, id, where }) {
  const tr = useT();
  const p = state.plots[id];
  const { level, reasons } = plotStatus(state, id);
  const L = LEVEL[level];
  return (
    <div className="relative z-[1000] flex flex-col gap-3 bg-background p-4 md:absolute md:bottom-3 md:left-3 md:w-[23rem] md:rounded-lg md:ring-1 md:ring-border" aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <p className="flex items-center gap-1.5 text-lg font-bold">
            <MapPinnedIcon className="size-5 shrink-0 text-primary" aria-hidden="true" />
            {tr(`দাগ ${tr.num(p.dag)} · মৌজা ${p.mouza.bn}`, `Dag ${p.dag} · Mouza ${p.mouza.en}`)}
          </p>
          <p className="text-sm text-muted-foreground">
            {tr(`জেএল ${tr.num(p.jl)} · খতিয়ান ${tr.num(p.khatian)} · ${tr.num(F.display(F.parse(p.total)))} শতাংশ`, `JL ${p.jl} · Khatian ${p.khatian} · ${F.display(F.parse(p.total))} decimals`)}
          </p>
        </div>
        <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold text-background", L.bar)}>
          <L.icon className="size-4" aria-hidden="true" />
          {tr(L.bn, L.en)}
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold">{level === "safe" ? tr("কোনো সতর্কতা নেই", "No warnings") : tr(`সতর্কতা (${tr.num(reasons.length)})`, `Warnings (${reasons.length})`)}</p>
        <ul className="flex flex-col gap-1.5">
          {reasons.map((r) => {
            const R = LEVEL[r.level];
            return (
              <li key={r.en} className="flex gap-2 text-[0.9375rem] leading-snug">
                <R.icon className={cn("mt-0.5 size-4 shrink-0", R.text)} aria-hidden="true" />
                {tr(tr.num(r.bn), r.en)}
              </li>
            );
          })}
        </ul>
      </div>
      {where && <GoogleLink where={where} />}
    </div>
  );
}
