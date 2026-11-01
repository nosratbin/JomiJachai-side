"use client";
import { useState } from "react";
import {
  SearchIcon,
  ScanQrCodeIcon,
  FilePlus2Icon,
  MapIcon,
  FileTextIcon,
  ScrollTextIcon,
  RefreshCwIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChevronRightIcon,
  LogInIcon,
  MenuIcon,
  SmartphoneIcon,
  CircleCheckIcon,
  OctagonXIcon,
  IdCardIcon,
  MegaphoneIcon,
  ReceiptTextIcon,
  WavesIcon,
  SproutIcon,
  GlobeIcon,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import { useRegister } from "@/lib/api";
import { go, verifyLink } from "@/lib/nav";
import * as F from "@/lib/fraction";
import { plotStatus } from "@/lib/register";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Logo, DateStrip, BackendBadge, QR, useReveal } from "./brand";
import PlotSlip, { LEVEL } from "./PlotSlip";
import LandMap from "./LandMap";

const PHOTOS = {
  village: { src: "/photos/village.jpg", w: 1920, h: 1280 },
  dags: { src: "/photos/dags.jpg", w: 1400, h: 933 },
  farmer: { src: "/photos/farmer.jpg", w: 1400, h: 1050 },
  dhenki: { src: "/photos/dhenki.jpg", w: 1400, h: 933 },
};
const CREDITS = [
  ["Bangladesh Village Landscape", "nasir khan", "CC BY-SA 2.0", "https://commons.wikimedia.org/wiki/File:Bangladesh_Village_Landscape_(36143248590).jpg"],
  ["Paddy fields in Dinajpur District 01", "Kritzolina", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Paddy_fields_in_Dinajpur_District_01.jpg"],
  ["Farmer of Rajshahi, Bangladesh", "Nasir4501", "CC BY-SA 4.0", "https://commons.wikimedia.org/wiki/File:Farmer_of_Rajshahi,_Bangladesh.JPG"],
  ["Rice pounder", "Zaheed Sarwer Khan", "CC BY 4.0", "https://commons.wikimedia.org/wiki/File:Rice_pounder.jpg"],
];

function scrollToId(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ---------------------------------------------------------------- header
function SiteHeader() {
  const tr = useT();
  const links = [
    ["map", tr("জমির ম্যাপ", "Land map")],
    ["services", tr("সেবাসমূহ", "Services")],
    ["sdg", tr("টেকসই উন্নয়ন", "SDGs")],
    ["verify", tr("দলিল যাচাই", "Verify a deed")],
    ["faq", tr("জিজ্ঞাসা", "Questions")],
  ];
  return (
    <header className="sticky top-0 z-40 bg-background">
      <div className="container-site flex h-[4.5rem] items-center justify-between gap-4">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="cursor-pointer rounded-md" aria-label={tr("প্রথম পাতা", "Home")}>
          <Logo />
        </button>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={tr("পাতার অংশ", "Page sections")}>
          {links.map(([id, label]) => (
            <button key={id} onClick={() => scrollToId(id)} className="press cursor-pointer rounded-md px-3 py-2 font-medium text-foreground hover:bg-secondary hover:text-primary">
              {label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="hidden border-primary text-primary hover:bg-secondary hover:text-primary sm:inline-flex" onClick={() => go("citizen")}>
            <SmartphoneIcon data-icon="inline-start" />
            {tr("নাগরিক অ্যাপ", "Citizen App")}
          </Button>
          <Button onClick={() => go("officer")}>
            <LogInIcon data-icon="inline-start" />
            {tr("অফিসার লগইন", "Officer login")}
          </Button>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label={tr("মেনু", "Menu")}>
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle>{tr("মেনু", "Menu")}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col px-2" aria-label={tr("পাতার অংশ", "Page sections")}>
                {links.map(([id, label]) => (
                  <SheetClose asChild key={id}>
                    <button onClick={() => setTimeout(() => scrollToId(id), 250)} className="cursor-pointer rounded-md px-3 py-3 text-left text-base font-medium hover:bg-secondary">
                      {label}
                    </button>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <button onClick={() => go("citizen")} className="cursor-pointer rounded-md px-3 py-3 text-left text-base font-medium text-primary hover:bg-secondary">
                    {tr("নাগরিক অ্যাপ খুলুন", "Open the Citizen App")}
                  </button>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// ---------------------------------------------------------------- hero
function Hero({ state, onSearch }) {
  const tr = useT();
  const mouzas = [...new Map(Object.values(state.plots).map((p) => [p.mouza.en, p.mouza])).values()];
  const [mouza, setMouza] = useState("");
  const [dag, setDag] = useState("");
  const examples = [
    ["Rampur", "312"],
    ["Rampur", "245"],
    ["Rampur", "150"],
    ["Kashipur", "609"],
  ];
  function submit(e, m = mouza, d = dag) {
    e?.preventDefault();
    if (!String(d).trim()) return document.getElementById("hero-dag")?.focus();
    onSearch(m, d);
  }
  return (
    <section className="relative isolate overflow-hidden bg-brand-strong">
      <img
        src={PHOTOS.village.src}
        width={PHOTOS.village.w}
        height={PHOTOS.village.h}
        alt={tr("সবুজ ধানক্ষেত আর মেঘলা আকাশ, বাংলাদেশের একটি গ্রাম", "Green paddy fields under a cloudy sky in a Bangladeshi village")}
        className="drift absolute inset-0 -z-10 size-full object-cover object-[50%_60%]"
        fetchPriority="high"
      />
      <div className="absolute inset-0 -z-10 bg-black/50 md:bg-transparent md:bg-[linear-gradient(90deg,rgb(0_0_0/0.62),rgb(0_0_0/0.3)_60%,rgb(0_0_0/0.1))]" aria-hidden="true" /> {/* taste-skill-ignore: neutral scrim under text on a photograph */}
      <div className="container-site flex min-h-[min(calc(100svh-7rem),42rem)] flex-col justify-center gap-5 py-12 text-white">
        <h1 data-reveal className="max-w-[18ch] text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {tr("জমি কেনার আগে যাচাই করুন", "Check the land before you pay")}
        </h1>
        <p data-reveal style={{ "--i": 1 }} className="max-w-[42ch] text-lg text-white/95">
          {tr("দাগ নম্বর দিন। মালিক কারা, কার কত অংশ বাকি, আর কোনো ঝুঁকি আছে কি না, এক উত্তরে জানুন।", "Enter a dag number to see who owns it, how much each owner still holds, and any risk, in one answer.")}
        </p>
        <form data-reveal style={{ "--i": 2 }} onSubmit={submit} className="mt-1 grid w-full max-w-3xl gap-2 rounded-lg bg-card p-2 text-foreground sm:grid-cols-[1fr_1fr_auto]" aria-label={tr("দাগের অবস্থা দেখুন", "Look up a plot")}>
          <label htmlFor="hero-mouza" className="sr-only">
            {tr("মৌজা", "Mouza")}
          </label>
          <NativeSelect id="hero-mouza" className="w-full" value={mouza} onChange={(e) => setMouza(e.target.value)}>
            <NativeSelectOption value="">{tr("সব মৌজা", "All mouzas")}</NativeSelectOption>
            {mouzas.map((m) => (
              <NativeSelectOption key={m.en} value={m.en}>
                {tr("মৌজা", "Mouza")}: {tr.pick(m)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <label htmlFor="hero-dag" className="sr-only">
            {tr("দাগ নম্বর", "Dag number")}
          </label>
          <Input id="hero-dag" className="text-lg" inputMode="numeric" value={dag} onChange={(e) => setDag(e.target.value)} placeholder={tr("দাগ নম্বর, যেমন ৩১২", "Dag number, e.g. 312")} autoComplete="off" />
          <Button type="submit" size="lg" className="h-11">
            <SearchIcon data-icon="inline-start" />
            {tr("খুঁজুন", "Search")}
          </Button>
        </form>
        <p data-reveal style={{ "--i": 3 }} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/90">
          <span>{tr("যেমন:", "Try:")}</span>
          {examples.map(([m, d]) => (
            <button
              key={m + d}
              type="button"
              className="min-h-8 cursor-pointer font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white"
              onClick={() => {
                setMouza(m);
                setDag(d);
                submit(null, m, d);
              }}
            >
              {tr("দাগ", "Dag")} {tr.num(d)}
            </button>
          ))}
          <span aria-hidden="true">·</span>
          <button type="button" onClick={() => go("citizen-deed")} className="min-h-8 cursor-pointer font-semibold text-white underline decoration-white/50 underline-offset-4 hover:decoration-white">
            {tr("দলিল যাচাই করুন", "Verify a deed")}
          </button>
        </p>
      </div>
    </section>
  );
}

// Beside the map before a search: how many dags are in each state, and a few to try.
const TRY = ["312", "245", "150", "609", "726", "778"];
function DagList({ state, onSelect }) {
  const tr = useT();
  const levels = Object.keys(state.plots).map((id) => plotStatus(state, id).level);
  return (
    <div data-reveal style={{ "--i": 2 }} className="mt-2 flex max-w-[30rem] flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        {["safe", "careful", "risky"].map((k) => (
          <div key={k} className="flex flex-col gap-0.5 rounded-md bg-card px-3.5 py-3 ring-1 ring-border">
            <dt className={cn("flex items-center gap-1.5 text-sm font-semibold", LEVEL[k].text)}>
              <span className={cn("legend-swatch", k)} aria-hidden="true" />
              {tr(LEVEL[k].bn, LEVEL[k].en)}
            </dt>
            <dd className="num text-2xl font-bold">{tr.num(levels.filter((l) => l === k).length)}</dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-col gap-2">
        <p className="font-semibold">{tr("এই দাগগুলো দেখে নিন", "Try these dags")}</p>
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {TRY.filter((id) => state.plots[id]).map((id) => {
            const plot = state.plots[id];
            const level = plotStatus(state, id).level;
            return (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onSelect(id)}
                  className="press flex min-h-11 w-full cursor-pointer items-center gap-2.5 rounded-md bg-card px-3 text-left ring-1 ring-border hover:ring-primary"
                >
                  <span className={cn("legend-swatch shrink-0", level)} aria-hidden="true" />
                  <span className="font-semibold whitespace-nowrap">
                    {tr("দাগ", "Dag")} {tr.num(plot.dag)}
                  </span>
                  <span className="truncate text-muted-foreground">{tr.pick(plot.mouza)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------land map
function MapSection({ state, result, onSelect }) {
  const tr = useT();
  const plot = result?.plotId && state.plots[result.plotId];
  const mouzaName = result && tr.pick(Object.values(state.plots).find((p) => p.mouza.en === result.mouza)?.mouza);
  return (
    <section id="map" className={cn("scroll-mt-24 py-12 md:py-16", result && "bg-mint")}>
      <div className="container-site grid items-start gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-3 lg:col-start-2 lg:row-start-1" aria-live="polite">
          {!result ? (
            <>
              <h2 data-reveal className="text-3xl font-bold text-primary md:text-4xl">
                {tr("ম্যাপে দাগ খুঁজুন", "Find a dag on the map")}
              </h2>
              <p data-reveal style={{ "--i": 1 }} className="max-w-[44ch] text-lg">
                {tr("দাগ নম্বর দিয়ে খুঁজলে ম্যাপে সেই দাগ আর তার অবস্থান চিহ্নিত হবে, সঙ্গে দাগের সব সতর্কতা। রঙ দেখেই বুঝুন কোন দাগে ঝুঁকি আছে; যেকোনো দাগে চাপ দিলেও তার পর্চা খুলবে।", "Search a dag number and the map marks that dag and its location, with all of its warnings. The colours show which dags carry a risk; tap any dag to open its porcha too.")}
              </p>
              <DagList state={state} onSelect={onSelect} />
            </>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-primary md:text-4xl">
                {plot ? tr(`দাগ ${tr.num(plot.dag)}, ${tr.pick(plot.mouza)}`, `Dag ${plot.dag}, ${plot.mouza.en}`) : tr("দাগ পাওয়া যায়নি", "Dag not found")}
              </h2>
              <p className="max-w-[46ch] text-lg">
                {plot
                  ? tr("ম্যাপের পিনে দাগটি দেখুন। পর্চায় মালিক, প্রত্যেকের অবশিষ্ট অংশ আর ঝুঁকির কারণ আছে। টাকা দেওয়ার আগে বিক্রেতার কাগজের সঙ্গে মিলিয়ে নিন।", "The pin shows the dag on the map. The slip shows the owners, each one's remaining share and any risk. Compare it with the seller's papers before you pay.")
                  : mouzaName
                  ? tr(`${mouzaName} মৌজায় দাগ ${tr.num(result.dag)} রেজিস্টারে নেই। নম্বরটি আবার দেখুন।`, `Dag ${result.dag} is not in the register for ${mouzaName}. Check the number and try again.`)
                  : tr(`দাগ ${tr.num(result.dag)} রেজিস্টারে নেই। নম্বরটি আবার দেখুন।`, `Dag ${result.dag} is not in the register. Check the number and try again.`)}
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                {plot && (
                  <Button onClick={() => go(`check-${plot.mouza.en}-${plot.dag}`)}>
                    {tr("নাগরিক অ্যাপে খুলুন", "Open in the Citizen App")}
                    <ArrowRightIcon data-icon="inline-end" />
                  </Button>
                )}
                <Button
                  variant="secondary"
                  className="bg-card"
                  onClick={() => {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                    setTimeout(() => document.getElementById("hero-dag")?.focus(), 400);
                  }}
                >
                  <SearchIcon data-icon="inline-start" />
                  {tr("আরেকটি দাগ খুঁজুন", "Search another dag")}
                </Button>
              </div>
            </>
          )}
        </div>
        <LandMap state={state} selected={result?.plotId} onSelect={onSelect} className="lg:sticky lg:top-24 lg:col-start-1 lg:row-span-2 lg:row-start-1" />
        {plot && <PlotSlip key={result.key} state={state} plotId={result.plotId} className="lg:col-start-2 lg:row-start-2" />}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- services
function Services({ state }) {
  const tr = useT();
  const tiles = [
    ["citizen", SearchIcon, "--tile-1", tr("জমি যাচাই", "Check land"), tr("দাগ নম্বর অনুযায়ী মালিক, অংশ ও ঝুঁকি", "Owners, shares and risks by dag"), tr("নাগরিক", "Citizen")],
    ["citizen-deed", ScanQrCodeIcon, "--tile-3", tr("দলিল যাচাই", "Verify a deed"), tr("কিউআর স্ক্যানে আসল না নকল", "Genuine or altered, by QR"), tr("নাগরিক", "Citizen")],
    ["officer", FilePlus2Icon, "--tile-2", tr("বিক্রি নিবন্ধন", "Register a sale"), tr("আবেদন জমা দিলেই ফলাফল", "The result as soon as you apply"), tr("অফিসার", "Officer")],
    ["officer-plots", MapIcon, "--tile-7", tr("দাগ ও অংশ", "Plots & shares"), tr("প্রত্যেক মালিকের অবশিষ্ট অংশ", "Each owner's remaining share"), tr("অফিসার", "Officer")],
    ["officer-deeds", FileTextIcon, "--tile-4", tr("নিবন্ধিত দলিল", "Registered deeds"), tr(`${tr.num(state.deeds.length)}টি দলিল, ডিজিটাল ছাপসহ`, `${state.deeds.length} deeds with fingerprints`), tr("অফিসার", "Officer")],
    ["officer-log", ScrollTextIcon, "--tile-8", tr("কার্যক্রমের ইতিহাস", "Activity log"), tr("শুধু যোগ হয়, বদলানো যায় না", "Added to, never edited"), tr("অফিসার", "Officer")],
    ["citizen-card", IdCardIcon, "--tile-6", tr("কৃষক কার্ড", "Krishak Card"), tr("জমি, বর্গা, খাস আর সরকারি বার্তা এক কার্ডে", "Land, borga, khas and messages on one card"), tr("নাগরিক", "Citizen")],
    ["officer-notices", MegaphoneIcon, "--tile-5", tr("অধিগ্রহণের আগাম নোটিশ", "Acquisition notice"), tr("মালিককে সরাসরি খবর, বিক্রি বন্ধ", "Owners told directly, sales frozen"), tr("অফিসার", "Officer")],
    ["officer-tax", ReceiptTextIcon, "--tile-4", tr("ভূমি উন্নয়ন কর", "Land tax"), tr("৩ বছর বকেয়া হলে সতর্কবার্তা", "An alert after 3 years overdue"), tr("অফিসার", "Officer")],
    ["officer-erosion", WavesIcon, "--tile-3", tr("নদীভাঙন", "River erosion"), tr("শনাক্ত, যাচাই ও পুনর্বাসন", "Find, verify, rehabilitate"), tr("অফিসার", "Officer")],
    ["officer-khas", SproutIcon, "--tile-1", tr("খাস জমি ও বর্গা", "Khas land & borga"), tr("ভূমিহীনকে খাস জমি, বর্গাদারের সুরক্ষা", "Khas land to the landless, borga protected"), tr("অফিসার", "Officer")],
    ["officer-sync", RefreshCwIcon, "--tile-7", tr("ফোনেও দেখুন", "Sync to phone"), tr("ল্যাপটপের দলিল ফোনে নিন", "Bring new deeds to a phone"), tr("অফিসার", "Officer")],
    ["officer-next", SparklesIcon, "--tile-2", tr("পরের ধাপ", "Next phase"), tr("উত্তরাধিকার বণ্টন, নামজারি, এসএমএস", "Inheritance division, namjari, SMS"), tr("পরিকল্পিত", "Planned")],
  ];
  return (
    <section id="services" className="scroll-mt-24 bg-mint pt-16 pb-20 md:pt-20 md:pb-28">
      <div className="container-site">
        <h2 data-reveal className="text-center text-3xl font-bold text-primary md:text-4xl">
          {tr("“জমিযাচাই” সেবাসমূহ", "JomiJachai services")}
        </h2>
        <ul className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {tiles.map(([route, Icon, color, title, desc, who], i) => (
            <li key={route} data-reveal style={{ "--i": i % 4 }}>
              <button
                onClick={() => go(route)}
                className="group press flex h-full w-full cursor-pointer flex-col items-center gap-3 overflow-hidden rounded-lg bg-card pb-6 text-center hover:text-primary"
                style={{ "--c": `var(${color})` }}
              >
                <span className="h-2 w-full bg-(--c)" aria-hidden="true" />
                <span className="mt-4 inline-flex size-16 items-center justify-center rounded-2xl text-(--c) transition-transform group-hover:-translate-y-0.5" style={{ background: "color-mix(in oklch, var(--c) 12%, transparent)" }}>
                  <Icon className="size-8" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="px-3 text-lg leading-snug font-bold">{title}</span>
                <span className="px-3 text-sm text-muted-foreground">{desc}</span>
                <span className="mt-auto rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold text-muted-foreground">{who}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- SDGs
// Each goal names the UN target it serves and the features that already work for it,
// with live counts from the register. Plain text and our own colours: no UN logos.
function Sdgs({ state }) {
  const tr = useT();
  const n = (x) => tr.num(x);
  const count = (o) => Object.keys(o || {}).length;
  const khasFamilies = new Set(Object.values(state.khas || {}).map((k) => k.family)).size;
  const riverFamilies = new Set(Object.keys(state.erosion || {}).flatMap((p) => Object.keys(state.shares[p] || {}))).size;
  const coOwned = Object.values(state.shares).filter((s) => Object.keys(s).length > 1).length;
  const goals = [
    {
      goal: 1,
      color: "--tile-5",
      title: tr("দারিদ্র্য বিলোপ", "No poverty"),
      target: tr("লক্ষ্য ১.৪: জমির মালিকানা ও নিয়ন্ত্রণে সবার সমান অধিকার", "Target 1.4: equal rights to ownership and control over land"),
      how: tr("প্রতিটি মালিকের অবশিষ্ট অংশ রেকর্ডে থাকে, তাই কেউ গরিব শরিকের অংশ বিক্রি করে দিতে পারে না। খাস কৃষিজমি যায় ভূমিহীন পরিবারের কাছে।", "Every owner's remaining share is on record, so no one can sell a poorer co-owner's share. Khas farmland goes to landless families."),
      stat: tr(`${n(khasFamilies)}টি ভূমিহীন পরিবার খাস জমি পেয়েছে`, `${khasFamilies} landless families settled on khas land`),
    },
    {
      goal: 2,
      color: "--tile-4",
      title: tr("ক্ষুধামুক্তি", "Zero hunger"),
      target: tr("লক্ষ্য ২.৩: ক্ষুদ্র কৃষকের জমিতে নিরাপদ ও সমান প্রবেশাধিকার", "Target 2.3: secure and equal access to land for small farmers"),
      how: tr("কৃষক কার্ড রেজিস্টার থেকেই হিসাব করে কে প্রান্তিক বা ক্ষুদ্র কৃষক। বর্গা চুক্তি নথিভুক্ত থাকলে জমি বিক্রি হলেও বর্গাদার উচ্ছেদ হন না।", "The Krishak Card works out from the register who is a marginal or small farmer. A recorded borga agreement stays with the land, so a sale does not evict the bargadar."),
      stat: tr(`${n(count(state.cards))}টি কৃষক কার্ড · ${n(count(state.borga))}টি বর্গা চুক্তি`, `${count(state.cards)} Krishak Cards · ${count(state.borga)} borga agreements`),
    },
    {
      goal: 5,
      color: "--tile-6",
      title: tr("জেন্ডার সমতা", "Gender equality"),
      target: tr("লক্ষ্য ৫.ক: জমির মালিকানায় নারীর সমান অধিকার", "Target 5.a: women's equal rights to own and control land"),
      how: tr("উত্তরাধিকারসূত্রে পাওয়া বোন বা মায়ের অংশও রেজিস্টারে আলাদা থাকে। কোনো শরিক বিক্রি করলে তাঁরা সরাসরি খবর পান, আর অগ্রক্রয়ের অধিকারের কথা জানানো হয়।", "Shares that sisters and mothers inherit sit on the register in their own names. When a co-sharer sells, they are told directly, including their right of pre-emption."),
      stat: tr(`${n(coOwned)}টি দাগে একাধিক শরিক`, `${coOwned} dags with several co-owners`),
    },
    {
      goal: 13,
      color: "--tile-3",
      title: tr("জলবায়ু কার্যক্রম", "Climate action"),
      target: tr("লক্ষ্য ১৩.১: জলবায়ুজনিত দুর্যোগে সহনশীলতা", "Target 13.1: resilience to climate-related disasters"),
      how: tr("নদীভাঙনে জমি হারানো পরিবার ছয় ধাপে শনাক্ত ও যাচাই হয়। বিলীন জমির বিক্রি বন্ধ, কর মওকুফ, আর খাস বন্দোবস্তে তাঁরা অগ্রাধিকার পান।", "Families who lose land to river erosion are identified and verified in six steps. Sales of the lost land stop, its tax is waived, and they get priority for khas land."),
      stat: tr(`${n(riverFamilies)}টি পরিবারের নদীভাঙন কেস`, `River-erosion cases for ${riverFamilies} families`),
    },
    {
      goal: 16,
      color: "--tile-1",
      title: tr("শান্তি, ন্যায়বিচার ও শক্তিশালী প্রতিষ্ঠান", "Peace, justice and strong institutions"),
      target: tr("লক্ষ্য ১৬.৫ ও ১৬.৬: দুর্নীতি কমানো, জবাবদিহিমূলক ও স্বচ্ছ প্রতিষ্ঠান", "Targets 16.5 and 16.6: less corruption, accountable and transparent institutions"),
      how: tr("নিবন্ধনের আগেই আটটি যাচাই অতিরিক্ত ও দ্বিতীয়বার বিক্রি আটকায়। দলিলে SHA-256 কিউআর, আর কার্যলিপি শুধু যোগ হয়, বদলানো যায় না। আগাম নোটিশ দালালের কম দামে কেনা ঠেকায়।", "Eight checks before registration block over-selling and double-selling. Deeds carry a SHA-256 QR, and the activity log can only be added to. Advance notices stop middlemen buying cheap before acquisition."),
      stat: tr(`${n(state.deeds.length)}টি দলিল · ${n(state.log.length)}টি কার্যলিপি লাইন`, `${state.deeds.length} deeds · ${state.log.length} log lines`),
    },
  ];
  return (
    <section id="sdg" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-site flex flex-col gap-10">
        <div className="flex max-w-[60ch] flex-col gap-3">
          <p data-reveal className="flex items-center gap-2 font-semibold text-primary">
            <GlobeIcon className="size-5" aria-hidden="true" />
            {tr("জাতিসংঘের টেকসই উন্নয়ন লক্ষ্য (SDG)", "UN Sustainable Development Goals (SDGs)")}
          </p>
          <h2 data-reveal style={{ "--i": 1 }} className="text-3xl font-bold text-primary md:text-4xl">
            {tr("নিরাপদ জমি, টেকসই গ্রাম", "Secure land, lasting villages")}
          </h2>
          <p data-reveal style={{ "--i": 2 }} className="text-lg text-muted-foreground">
            {tr("জমির নিরাপদ মালিকানা দারিদ্র্য, খাদ্য, নারীর অধিকার, জলবায়ু আর সুশাসন, এই পাঁচ লক্ষ্যের সঙ্গে যুক্ত। নিচের সংখ্যাগুলো রেজিস্টার থেকে এই মুহূর্তে হিসাব করা।", "Secure land rights connect to five goals: poverty, food, women's rights, climate and good governance. The numbers below are counted from the register right now.")}
          </p>
        </div>
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {goals.map((g, i) => (
            <li key={g.goal} data-reveal style={{ "--i": i % 3, "--c": `var(${g.color})` }} className={cn("flex flex-col overflow-hidden rounded-lg bg-card ring-1 ring-border", i < 3 ? "xl:col-span-2" : "xl:col-span-3", i === goals.length - 1 && "md:col-span-2")}>
              <div className="flex items-center gap-4 px-5 py-4" style={{ background: "color-mix(in oklch, var(--c) 12%, transparent)" }}>
                <span className="num inline-flex size-14 shrink-0 items-center justify-center rounded-xl bg-(--c) text-2xl font-extrabold text-background">{n(g.goal)}</span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-semibold text-muted-foreground">SDG {n(g.goal)}</span>
                  <h3 className="text-lg leading-snug font-bold">{g.title}</h3>
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-3 px-5 py-5">
                <p className="text-sm font-semibold">{g.target}</p>
                <p className="text-muted-foreground">{g.how}</p>
                <p className="mt-auto flex items-center gap-2 border-t pt-3 font-semibold text-primary">
                  <CircleCheckIcon className="size-4 shrink-0" aria-hidden="true" />
                  {g.stat}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ----------------------------------------------------------------field dags
function Fields() {
  const tr = useT();
  return (
    <section className="relative isolate overflow-hidden bg-brand-strong">
      <img src={PHOTOS.dags.src} width={PHOTOS.dags.w} height={PHOTOS.dags.h} loading="lazy" alt={tr("আইল দিয়ে ভাগ করা ধানক্ষেত, দিনাজপুর", "Paddy plots divided by earth bunds, Dinajpur")} className="absolute inset-0 -z-10 size-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-black/50" aria-hidden="true" />
      <div className="container-site flex min-h-[26rem] flex-col justify-end gap-3 py-14 text-white md:min-h-[32rem]">
        <p data-reveal className="max-w-[30ch] text-2xl leading-snug font-bold md:text-4xl">
          {tr("একটি দাগে অনেক মালিক। কেউ নিজের অংশের বেশি বিক্রয় করতে পারেন না।", "One dag, many owners. No one can sell more than their own share.")}
        </p>
        <p data-reveal style={{ "--i": 1 }} className="text-sm text-white/85">
          {tr("আইল দিয়ে ভাগ করা জমি, দিনাজপুর", "Plots divided by earth bunds, Dinajpur")}
        </p>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- deed verification
function Verify({ state }) {
  const tr = useT();
  const deed = state.deeds[state.deeds.length - 1];
  const [tab, setTab] = useState("genuine");
  const plot = state.plots[deed.plot];
  const answers = {
    genuine: {
      icon: CircleCheckIcon,
      tone: "text-success",
      label: tr("আসল কপি", "Genuine copy"),
      text: tr("কিউআর-এর ডিজিটাল ছাপ সরকারি রেকর্ডের সঙ্গে মিলেছে, আর কাগজে লেখা শতাংশও রেকর্ডের সমান।", "The QR's fingerprint matches the official record, and the decimals on the paper match it too."),
    },
    altered: {
      icon: OctagonXIcon,
      tone: "text-destructive",
      label: tr("বদলানো কপি", "Altered copy"),
      text: tr("কিউআর ঠিক আছে, কিন্তু কাগজে লেখা শতাংশ রেকর্ডের সঙ্গে মেলেনি। যেমন রেকর্ডে ২০, কাগজে ৪০। টাকা দেবেন না।", "The QR is real but the paper's decimals differ from the record, say 20 on record and 40 on paper. Don't pay."),
    },
    fake: {
      icon: OctagonXIcon,
      tone: "text-destructive",
      label: tr("জাল কিউআর", "Fake QR code"),
      text: tr("কিউআর-এর ছাপ রেকর্ড থেকে নতুন করে হিসাব করা ছাপের সঙ্গে মেলেনি। কাগজটি জাল।", "The QR's fingerprint doesn't match the one recalculated from the record. The paper is fake."),
    },
  };
  const a = answers[tab];
  return (
    <section id="verify" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-site grid items-center gap-10 lg:grid-cols-2">
        <div data-reveal className="flex items-center justify-center rounded-lg bg-secondary p-5 sm:p-12 lg:min-h-[34rem]">
          <div className="deed-paper w-full max-w-lg rounded-md p-5 sm:p-7">
            <p className="text-sm text-muted-foreground">{tr("সাফ কবলা দলিল", "Sale deed")}</p>
            <p className="docink text-xl font-bold">
              {tr("দলিল নং", "Deed no.")} {tr.num(deed.no)}
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-base">
                <dt className="text-muted-foreground">{tr("দাতা", "Seller")}</dt>
                <dd className="docink font-semibold">{tr.pick(state.people[deed.seller])}</dd>
                <dt className="text-muted-foreground">{tr("গ্রহীতা", "Buyer")}</dt>
                <dd className="docink font-semibold">{tr.pick(state.people[deed.buyer])}</dd>
                <dt className="text-muted-foreground">{tr("দাগ", "Dag")}</dt>
                <dd className="docink font-semibold">
                  {tr.num(plot.dag)}, {tr.pick(plot.mouza)}
                </dd>
                <dt className="text-muted-foreground">{tr("জমি", "Land")}</dt>
                <dd className={cn("docink font-semibold", tab === "altered" && "text-destructive line-through decoration-2")}>
                  {tr.num(F.display(deed.decimals))} {tr("শতাংশ", "decimals")}
                </dd>
                {tab === "altered" && (
                  <>
                    <dt className="sr-only">{tr("কাগজে লেখা", "Paper says")}</dt>
                    <dd className="col-start-2 font-bold text-destructive">
                      {tr.num(F.display(F.mul(F.parse(deed.decimals), F.frac(2))))} {tr("শতাংশ (কাগজে)", "decimals (on paper)")}
                    </dd>
                  </>
                )}
              </dl>
              <QR text={tab === "fake" ? verifyLink({ ...deed, fingerprint: "0".repeat(64) }) : verifyLink(deed)} size={132} />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div data-reveal role="tablist" aria-label={tr("যাচাইয়ের ফল", "Verification results")} className="flex flex-wrap gap-2">
            {Object.entries(answers).map(([k, v]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={cn("press min-h-10 cursor-pointer rounded-full px-4 font-semibold", tab === k ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-secondary")}
              >
                {v.label}
              </button>
            ))}
          </div>
          <h2 data-reveal style={{ "--i": 1 }} className="text-3xl font-bold text-primary md:text-4xl">
            {tr("একটি কিউআর স্ক্যানে সব উত্তর", "One QR scan, three answers")}
          </h2>
          <p data-reveal style={{ "--i": 2 }} className="max-w-[48ch] text-lg">
            {tr(
              "নিবন্ধনের সময় দলিলের তথ্য থেকে ৬৪ অক্ষরের SHA-256 ডিজিটাল ছাপ তৈরি হয় আর কিউআর কোডে বসে। একটি অঙ্ক বদলালেই পুরো ছাপ বদলে যায়।",
              "At registration the deed's details become a 64-character SHA-256 fingerprint, printed in its QR code. Change one digit and the whole fingerprint changes."
            )}
          </p>
          <p role="tabpanel" aria-live="polite" className="flex gap-3 rounded-lg bg-muted p-4 text-base font-medium">
            <a.icon className={cn("mt-0.5 size-5 shrink-0", a.tone)} aria-hidden="true" />
            <span>
              <strong className={a.tone}>{a.label}:</strong> {a.text}
            </span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button size="lg" onClick={() => go("citizen-deed")}>
              <ScanQrCodeIcon data-icon="inline-start" />
              {tr("দলিল যাচাই করুন", "Verify a deed")}
            </Button>
            <Button size="lg" variant="secondary" onClick={() => go("deed-" + deed.no)}>
              <FileTextIcon data-icon="inline-start" />
              {tr("একটি দলিল দেখুন", "See a deed")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- FAQ
function Faq() {
  const tr = useT();
  const qa = [
    [
      tr("“জমিযাচাই” কি দলিল নিবন্ধনের বিকল্প হিসেবে কাজ করে?", "Does JomiJachai replace deed registration?"),
      tr("না। এটি সাব-রেজিস্ট্রি অফিসের নিবন্ধনের আগে একটি যাচাইয়ের ধাপ। এটি কোনো আইন পরিবর্তন করে না; কর্মকর্তা ও নাগরিককে বিদ্যমান আইন মানতে সাহায্য করে।", "No. It is a checking step before registration at the Sub-Registry office. It changes no law; it helps officers and citizens follow the laws that exist."),
    ],
    [
      tr("খতিয়ানে নাম থাকলেই কি বিক্রি করা যায়?", "If the seller is in the khatian, can they sell?"),
      tr("নাম থাকা যথেষ্ট নয়। আগে কত শতাংশ বিক্রি করেছেন তা খতিয়ানে নাও থাকতে পারে। “জমিযাচাই” প্রত্যেক মালিকের অবশিষ্ট অংশ দেখায়, তাই অতিরিক্ত বা দ্বিতীয়বার বিক্রি ধরা পড়ে।", "Not on its own. Earlier sales may not show in the khatian yet. JomiJachai keeps each owner's remaining share, so over-selling and double-selling are caught."),
    ],
    [
      tr("দলিলের কিউআর কি নকল করা যায়?", "Can someone fake a deed's QR code?"),
      tr("কেউ কিউআর প্রিন্ট করতে পারেন, কিন্তু তা মিলবে না। অ্যাপ সরকারি রেকর্ড থেকে SHA-256 নতুন করে হিসাব করে এবং মিলিয়ে দেখে।", "Anyone can print a QR, but it won't match. The app recalculates the fingerprint from the official record and compares."),
    ],
    [
      tr("স্মার্টফোন না থাকলে কী হবে?", "What if I don't have a smartphone?"),
      tr("পরের ধাপে ইউনিয়ন ডিজিটাল সেন্টারের উদ্যোক্তা আপনার হয়ে যাচাই করবেন, আপনার ফোনে আসা কোড (ওটিপি) দিয়ে।", "In the next phase, a Union Digital Centre operator will check for you, after you give the code (OTP) sent to your phone."),
    ],
    [
      tr("কে কোন তথ্য দেখতে পান?", "Who can see what?"),
      tr("নাগরিকেরা জমির অবস্থা ও মালিকের নাম দেখেন। জাতীয় পরিচয়পত্র ও ফোন নম্বর শুধু অনুমোদিত কর্মকর্তারা দেখবেন।", "Citizens see a plot's status and the owners' names. NID and phone numbers would be visible only to authorised officers."),
    ],
  ];
  return (
    <section id="faq" className="scroll-mt-24 bg-mint py-20 md:py-28">
      <div className="container-site grid items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        <div className="flex flex-col gap-6">
          <h2 data-reveal className="text-3xl font-bold text-primary md:text-4xl">
            {tr("সাধারণ জিজ্ঞাসা", "Common questions")}
          </h2>
          <Accordion data-reveal style={{ "--i": 1 }} type="single" collapsible defaultValue="0" className="flex flex-col gap-2">
            {qa.map(([q, a], i) => (
              <AccordionItem key={i} value={String(i)} className="overflow-hidden rounded-md border-0 bg-card not-last:border-b-0">
                <AccordionTrigger className="bg-brand px-5 py-4 text-base font-semibold text-brand-foreground hover:no-underline data-[state=open]:bg-brand-strong [&>svg]:text-brand-foreground">
                  {q}
                </AccordionTrigger>
                <AccordionContent className="px-5 pt-4 text-base">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
        <figure data-reveal style={{ "--i": 2 }} className="lg:mt-16">
          <img src={PHOTOS.farmer.src} width={PHOTOS.farmer.w} height={PHOTOS.farmer.h} loading="lazy" alt={tr("ধানক্ষেতের পাশে দাঁড়ানো একজন কৃষক, রাজশাহী", "A farmer standing beside a paddy field, Rajshahi")} className="aspect-[4/5] w-full rounded-lg object-cover object-[40%_50%]" />
          <figcaption className="mt-3 text-sm text-muted-foreground">
            {tr("রাজশাহীর একজন প্রান্তিক কৃষক। “জমিযাচাই” তাঁদের জন্য: সহজ প্রশ্ন, সহজ উত্তর, বাংলায়।", "A farmer in Rajshahi. JomiJachai is built for people like him: one question, one answer, in Bangla.")}
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- next
function NextPhase() {
  const tr = useT();
  const items = [
    [tr("উত্তরাধিকারের অংশীদারিত্ব রেকর্ড", "Inheritance shares on record"), tr("মেয়েসহ প্রত্যেক ওয়ারিশের অংশীদারিত্ব বিক্রির আগেই রেকর্ডে থাকবে", "Every heir's share, daughters included, on record before any sale")],
    [tr("নামজারি নিজে থেকে শুরু হবে", "Namjari starts automatically"), tr("যাচাই করা দলিল নিবন্ধনের পর, দালাল ছাড়াই", "After a checked deed is registered, with no broker")],
    [tr("বিদ্যুৎ বিলের মতো ভূমি কর", "Land tax like a utility bill"), tr("এসএমএস বিল, বিকাশ, নগদে বা ব্যাংকে পরিশোধ", "An SMS bill, paid by bKash, Nagad or Banks")],
    [tr("ইউনিয়ন ডিজিটাল সেন্টার সেবা", "Help at Union Digital Centres"), tr("নাগরিকের ফোনে আসা ওটিপি দিয়ে প্রবেশ", "With consent by OTP on the citizen's own phone")],
  ];
  return (
    <section className="py-20 md:py-28">
      <div className="container-site grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="flex flex-col gap-4">
          <h2 data-reveal style={{ "--i": 1 }} className="text-3xl font-bold text-primary md:text-4xl">
            {tr("পরবর্তী ধাপে বাস্তবায়ন", "Planned next phase")}
          </h2>
          <figure data-reveal style={{ "--i": 2 }} className="mt-2">
            <img src={PHOTOS.dhenki.src} width={PHOTOS.dhenki.w} height={PHOTOS.dhenki.h} loading="lazy" alt={tr("ঢেঁকিতে ধান ভানছেন গ্রামের দুজন নারী", "Two village women pounding rice with a dhenki")} className="aspect-[3/2] w-full rounded-lg object-cover" />
            <figcaption className="mt-3 text-sm text-muted-foreground">
              {tr("গ্রামবাংলার ঐতিহ্যবাহী ঢেঁকিতে দুই নারীর ধান ভাঙার চিত্র", "Two women husking rice with a traditional village dhenki")}
            </figcaption>
          </figure>
        </div>
        <ol className="grid content-start gap-3 sm:grid-cols-2">
          {items.map(([t, d], i) => (
            <li key={t} data-reveal style={{ "--i": i }} className="flex flex-col gap-2 rounded-lg bg-muted p-5">
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground">{tr.num(i + 1)}</span>
              <span className="text-lg font-bold">{t}</span>
              <span className="text-muted-foreground">{d}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SiteFooter() {
  const tr = useT();
  const links = [
    ["citizen", tr("জমি যাচাই", "Check land")],
    ["citizen-deed", tr("দলিল যাচাই", "Verify a deed")],
    ["citizen-help", tr("কীভাবে ব্যবহার করবেন", "How to use it")],
    ["officer", tr("অফিসার পোর্টাল", "Officer Portal")],
    ["officer-log", tr("কার্যলিপি", "Activity log")],
    ["officer-next", tr("পরের ধাপ", "Next phase")],
  ];
  return (
    <footer className="bg-mint">
      <div className="h-2 bg-primary" aria-hidden="true" />
      <div className="container-site grid gap-10 py-14 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Logo />
          <p className="max-w-[40ch]">
            {tr(
              "প্রতিটি জমি বিক্রি নিবন্ধনের আগেই যাচাই, আর ফোনে এক ট্যাপে দলিল যাচাই।",
              "Every land sale checked before registration, and deeds verified with one phone tap."
            )}
          </p>
          <BackendBadge className="text-muted-foreground" />
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-primary">{tr("গুরুত্বপূর্ণ লিঙ্ক", "Useful links")}</h2>
          <ul className="flex flex-col gap-1.5">
            {links.map(([r, label]) => (
              <li key={r}>
                <button onClick={() => go(r)} className="inline-flex min-h-8 cursor-pointer items-center gap-1 hover:text-primary hover:underline">
                  <ChevronRightIcon className="size-4 text-primary" aria-hidden="true" />
                  {label}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 text-lg font-bold text-primary">{tr("প্রকল্প প্রদর্শনী", "Project showcase")}</h2>
          <p className="font-semibold">BCS ICT Fest 2026 · Project Showcasing</p>
          <p>{tr("টিম “ইচ্ছে ঘুড়ি”", "Team “ICCHE GHURI”")}</p>
          <button onClick={() => scrollToId("sdg")} className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 text-primary hover:underline">
            <ChevronRightIcon className="size-4" aria-hidden="true" />
            {tr("টেকসই উন্নয়ন লক্ষ্যে অবদান", "How it serves the SDGs")}
          </button>
          <h2 className="mt-6 mb-2 font-bold text-primary">{tr("ফোনে অ্যাপ হিসেবে রাখুন", "Keep it on your phone")}</h2>
          <p className="text-sm">{tr("ক্রোমের মেনু (⋮) থেকে \"হোম স্ক্রিনে যোগ করুন\"। প্লে স্টোর লাগবে না।", "In Chrome, open the menu (⋮) and tap \"Add to Home screen\". No Play Store needed.")}</p>
        </div>
      </div>
      <div className="bg-secondary">
        <div className="container-site flex flex-col gap-2 py-5 text-sm text-muted-foreground">
          <p>
            {tr("ছবি (উইকিমিডিয়া কমন্স): ", "Photos (Wikimedia Commons): ")}
            {CREDITS.map(([title, by, lic, url], i) => (
              <span key={url}>
                {i > 0 && " · "}
                <a href={url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  “{title}”
                </a>{" "}
                {tr("তুলেছেন", "by")} {by}, {lic}
              </span>
            ))}
          </p>
          <p>{tr("এটি সরকারি ওয়েবসাইট নয়। এখানে দেখানো নাম ও জমির তথ্য নমুনা, কোনো সত্যিকারের রেকর্ড নয়।", "This is not a government website. The names and land records shown are samples, not real records.")}</p>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  const state = useRegister();
  const [result, setResult] = useState(null);
  useReveal([]);

  function onSearch(mouza, dag) {
    const ascii = String(dag).replace(/[০-৯]/g, (c) => "০১২৩৪৫৬৭৮৯".indexOf(c)).trim();
    const plotId = Object.keys(state.plots).find((k) => (!mouza || state.plots[k].mouza.en === mouza) && Number(state.plots[k].dag) === Number(ascii)) || null;
    setResult({ key: Date.now(), plotId, mouza, dag: ascii });
    setTimeout(() => scrollToId("map"), 60);
  }
  return (
    <div className="min-h-dvh">
      <DateStrip />
      <SiteHeader />
      <main>
        <Hero state={state} onSearch={onSearch} />
        <MapSection state={state} result={result} onSelect={(id) => onSearch(state.plots[id].mouza.en, state.plots[id].dag)} />
        <Services state={state} />
        <Sdgs state={state} />
        <Fields />
        <Verify state={state} />
        <Faq />
        <NextPhase />
      </main>
      <SiteFooter />
    </div>
  );
}
