"use client";
import { useEffect } from "react";
import { SearchIcon, ScanQrCodeIcon, CircleHelpIcon, HouseIcon, IdCardIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { go } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { LangToggle, ThemeToggle } from "../brand";
import CheckLand from "./CheckLand";
import CheckDeed from "./CheckDeed";
import Help from "./Help";
import KrishakCard from "./KrishakCard";

export default function Citizen({ route, flash, clearFlash }) {
  const tr = useT();

  useEffect(() => {
    if (!flash) return;
    if (flash.error) toast.error(tr("সিঙ্ক লিংকটি পড়া যায়নি", "Could not read the sync link"));
    else if (flash.shared) toast.info(tr("শেয়ার করা ডেটাবেস চালু আছে; সিঙ্ক লাগবে না", "The shared database is on; no sync needed"));
    else toast.success(tr(`${tr.num(flash.added)}টি দলিল যুক্ত হলো`, `${flash.added} deed(s) added`));
    clearFlash();
  }, [flash]);

  const tab = route.startsWith("v-") || route === "citizen-deed" ? "deed" : route.startsWith("citizen-card") ? "card" : route === "citizen-help" ? "help" : "land";
  const TABS = [
    ["land", "citizen", SearchIcon, tr("জমি যাচাই", "Check land")],
    ["deed", "citizen-deed", ScanQrCodeIcon, tr("দলিল যাচাই", "Check a deed")],
    ["card", "citizen-card", IdCardIcon, tr("কৃষক কার্ড", "Krishak Card")],
    ["help", "citizen-help", CircleHelpIcon, tr("সাহায্য", "Help")],
  ];
  const title = TABS.find(([k]) => k === tab)[3];

  return (
    <div className="min-h-dvh bg-mint">
      <div className="mx-auto flex min-h-dvh max-w-[30rem] flex-col bg-canvas">
        {}
        <header className="sticky top-0 z-[1100] flex h-16 items-center gap-2 bg-brand pr-3 pl-2 text-brand-foreground">
          <button onClick={() => go("")} aria-label={tr("ওয়েবসাইটে ফিরুন", "Back to the website")} className="press inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/12">
            <HouseIcon className="size-5" aria-hidden="true" />
          </button>
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-xs text-brand-foreground/80">{tr("জমিযাচাই", "JomiJachai")}</span>
            <span className="truncate text-lg font-bold">{title}</span>
          </div>
          <LangToggle inverse />
          <ThemeToggle inverse />
        </header>
        <main className="flex-1 px-4 pt-6 pb-32">
          {tab === "land" && <CheckLand route={route} />}
          {tab === "deed" && <CheckDeed route={route} />}
          {tab === "card" && <KrishakCard route={route} />}
          {tab === "help" && <Help />}
        </main>
        <nav className="pb-safe fixed inset-x-0 bottom-0 z-30" aria-label={tr("অ্যাপ মেনু", "App menu")}>
          <div className="mx-auto grid max-w-[30rem] grid-cols-4 bg-background ring-1 ring-border">
            {TABS.map(([key, r, Icon, label]) => {
              const active = tab === key;
              return (
                <button
                  key={key}
                  onClick={() => go(r)}
                  aria-current={active ? "page" : undefined}
                  className={cn("press flex min-h-16 cursor-pointer touch-manipulation flex-col items-center justify-center gap-1 py-2 text-[0.8125rem] font-semibold", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}
                >
                  <span className={cn("inline-flex h-8 w-16 items-center justify-center rounded-full", active && "bg-primary text-primary-foreground")}>
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
