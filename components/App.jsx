"use client";
import { useEffect, useState, useCallback } from "react";
import { DatabaseZapIcon } from "lucide-react";
import { PrefsContext, loadPrefs, savePrefs } from "@/lib/store";
import { api, useBackend, BACKEND } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import Landing from "./Landing";
import Officer from "./officer/Officer";
import Citizen from "./citizen/Citizen";

// Routes live in the URL hash so the app works as one static page on any host:
//   #officer, #officer-plots, #officer-deeds, #officer-log, #officer-stats, #officer-sync, #officer-next, #deed-2026-0147
//   #officer-notices, #officer-tax, #officer-erosion, #officer-khas, #officer-cards (land services)
//   #citizen, #citizen-deed, #citizen-card, #citizen-card-<no>, #citizen-help,
//   #v-2026-0147-<fingerprint> (from a deed's QR), #s-<data> (phone sync)
//   #check-<mouza>-<dag> opens the Citizen App on that plot (from the website's search card)
function readHash() {
  if (typeof window === "undefined") return "";
  return decodeURIComponent(window.location.hash.replace(/^#/, ""));
}

function Loading({ error }) {
  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <DatabaseZapIcon className="size-10 text-destructive" aria-hidden="true" />
        <h1 className="text-xl font-bold">ডেটাবেসে যুক্ত হওয়া যায়নি · Could not reach the database</h1>
        <p className="text-muted-foreground">{error}</p>
        <p className="text-sm text-muted-foreground">supabase/README.md · Check the Supabase keys and that supabase/schema.sql was run.</p>
        <Button onClick={() => location.reload()}>আবার চেষ্টা · Try again</Button>
      </div>
    );
  }
  return (
    <div className="flex min-h-dvh items-center justify-center gap-3 text-muted-foreground" aria-busy="true">
      <Spinner />
      <span>জমিযাচাই · JomiJachai</span>
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefsState] = useState({ lang: "bn", theme: "light", area: "Rampur", officer: "o1" });
  const [route, setRoute] = useState("");
  const [flash, setFlash] = useState(null);
  const { status, error } = useBackend();

  useEffect(() => {
    setPrefsState(loadPrefs());
    setRoute(readHash());
    setMounted(true);
    const onHash = () => setRoute(readHash());
    window.addEventListener("hashchange", onHash);
    // Installable phone app: register the service worker when the app is served from a real site.
    if ("serviceWorker" in navigator && location.protocol === "https:") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    root.classList.toggle("dark", prefs.theme === "dark");
    root.lang = prefs.lang;
  }, [prefs.theme, prefs.lang, mounted]);

  // A demo "sync" link copies the officer's newly registered deeds into this device (browser backend only).
  useEffect(() => {
    if (!route.startsWith("s-") || status !== "ready") return;
    const payload = route.slice(2);
    history.replaceState(null, "", "#citizen");
    setRoute("citizen");
    if (BACKEND !== "local") return setFlash({ shared: true });
    api
      .importSyncLink(payload)
      .then((added) => setFlash({ added }))
      .catch(() => setFlash({ error: true }));
  }, [route, status]);

  const setPrefs = useCallback((patch) => {
    setPrefsState((p) => {
      const next = { ...p, ...patch };
      savePrefs(next);
      return next;
    });
  }, []);

  let view;
  if (!mounted || status !== "ready") view = <Loading error={status === "error" ? error : null} />;
  else if (route.startsWith("officer") || route.startsWith("deed-")) view = <Officer route={route} />;
  else if (route.startsWith("citizen") || route.startsWith("v-") || route.startsWith("check-")) view = <Citizen route={route} flash={flash} clearFlash={() => setFlash(null)} />;
  else view = <Landing />;

  return (
    <PrefsContext.Provider value={{ ...prefs, setPrefs }}>
      {view}
      <Toaster theme={prefs.theme === "dark" ? "dark" : "light"} position="top-center" />
    </PrefsContext.Provider>
  );
}
