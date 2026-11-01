"use client";
import { useEffect, useState } from "react";
import { IdCardIcon, SearchIcon, SearchXIcon, XIcon, SparklesIcon, InfoIcon, MessageSquareTextIcon, MapPinnedIcon, SproutIcon, HomeIcon, ChevronRightIcon, LockIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useRegister } from "@/lib/api";
import { landOf, cardOf, messagesFor, taxStatus } from "@/lib/land-services";
import * as F from "@/lib/fraction";
import { go, appBaseUrl } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LEVEL, taxText } from "../PlotSlip";
import { LogoMark, QR, ReadAloudButton } from "../brand";

const toAscii = (s) => String(s).replace(/[০-৯]/g, (c) => "০১২৩৪৫৬৭৮৯".indexOf(c)).replace(/\D/g, "");
const dec = (tr, f) => tr.num(F.display(f));

// Sample cards that show each service: owner, bargadar, river-hit family, acquisition notice, tax overdue.
const SAMPLES = [
  ["rahim", "জমির মালিক", "Landowner"],
  ["jamal", "বর্গাদার", "Bargadar"],
  ["p133", "নদীভাঙনে ক্ষতিগ্রস্ত", "Lost land to river"],
  ["p023", "অধিগ্রহণের নোটিশ", "Acquisition notice"],
  ["p006", "কর বকেয়া", "Tax overdue"],
];

export const cardLink = (no) => `${appBaseUrl()}#citizen-card-${no}`;

// The card itself: who, card number, farmer category and the land behind it.
export function FarmerCard({ state, no }) {
  const tr = useT();
  const person = state.cards[no].person;
  const l = landOf(state, person);
  const borga = F.sum(l.borgaIn.map((b) => b.decimals));
  const khas = F.sum(l.khas.map((k) => k.decimals));
  const stats = [
    [tr("নিজের কৃষিজমি", "Own farmland"), l.ownedFarm],
    [tr("বর্গায় চাষ", "Farmed on borga"), borga],
    [tr("খাস বন্দোবস্ত", "Khas settled"), khas],
  ];
  return (
    <section className="answer-pop overflow-hidden rounded-3xl bg-brand text-brand-foreground" aria-label={tr("কৃষক কার্ড", "Krishak Card")}>
      <div className="flex items-center gap-3 px-5 pt-5">
        <LogoMark className="size-9" />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold text-brand-foreground/80">{tr("কৃষক কার্ড · জমিযাচাই", "Krishak Card · JomiJachai")}</p>
          <p className="num text-lg font-bold tracking-wide">
            {tr("নং", "No.")} {tr.num(no)}
          </p>
        </div>
      </div>
      <div className="flex items-end gap-4 px-5 pt-4 pb-5">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h2 className="text-[1.75rem] leading-tight font-bold break-words">{tr.pick(state.people[person])}</h2>
          <span className="w-fit rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">{tr.pick(l.category)}</span>
          <p className="text-sm text-brand-foreground/80">
            {tr("মোট চাষের জমি", "Land farmed in total")}: <span className="num font-bold text-brand-foreground">{dec(tr, l.operated)}</span> {tr("শতাংশ", "decimals")}
          </p>
        </div>
        <QR text={cardLink(no)} size={96} className="rounded-xl" />
      </div>
      <dl className="grid grid-cols-3 bg-black/15">
        {stats.map(([label, v]) => (
          <div key={label} className="flex flex-col gap-0.5 px-3 py-3 text-center">
            <dt className="text-xs text-brand-foreground/80">{label}</dt>
            <dd className="num text-lg font-bold">{dec(tr, v)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function Messages({ state, person }) {
  const tr = useT();
  const list = messagesFor(state, person);
  const speakText = list.map((m) => tr.pick(m)).join(" ");
  return (
    <section className="flex flex-col gap-3" aria-labelledby="kc-msgs">
      <div className="flex items-center justify-between gap-2">
        <h2 id="kc-msgs" className="flex items-center gap-2 text-lg font-bold">
          <MessageSquareTextIcon className="size-5 text-primary" aria-hidden="true" />
          {tr("বার্তা", "Messages")}
          {list.length > 0 && <Badge variant="secondary">{tr.num(list.length)}</Badge>}
        </h2>
        {list.length > 0 && <ReadAloudButton size="sm" text={speakText} />}
      </div>
      {list.length === 0 ? (
        <p className="rounded-2xl bg-card px-4 py-4 text-muted-foreground ring-1 ring-border">{tr("এখন কোনো বার্তা নেই।", "No messages right now.")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.map((m, i) => {
            const L = LEVEL[m.level];
            const Icon = L?.icon || InfoIcon;
            return (
              <li key={i} className="flex gap-3 rounded-2xl bg-card px-4 py-3 leading-snug ring-1 ring-border">
                <Icon className={cn("mt-0.5 size-5 shrink-0", L?.text || "text-info")} aria-hidden="true" />
                <div className="flex min-w-0 flex-col gap-1">
                  <span>{tr(tr.num(m.bn), m.en)}</span>
                  <span className="text-xs text-muted-foreground">{tr.date(m.date)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-sm text-muted-foreground">{tr("এখন বার্তা এই অ্যাপে আসে; মোবাইলে এসএমএস পাঠানো পরের ধাপে।", "Messages arrive in this app for now; SMS to the phone is the next phase.")}</p>
    </section>
  );
}

function LandList({ state, person }) {
  const tr = useT();
  const l = landOf(state, person);
  const rows = [
    ...l.owned.map((o) => ({ icon: MapPinnedIcon, plot: o.plot, label: tr("নিজের", "Owned"), amount: o.share, note: o.lost ? tr("নদীতে বিলীন", "Lost to river") : taxText(tr, taxStatus(state, o.plot)), warn: o.lost || taxStatus(state, o.plot).alert })),
    ...l.borgaIn.map((b) => ({ icon: SproutIcon, plot: b.plot, label: tr("বর্গা", "Borga"), amount: F.parse(b.decimals), note: tr(`মালিক ${state.people[b.owner].bn}`, `Owner ${state.people[b.owner].en}`) })),
    ...l.khas.map((k) => ({ icon: HomeIcon, plot: k.plot, label: tr("খাস বন্দোবস্ত", "Khas settled"), amount: F.parse(k.decimals), note: tr(`বন্দোবস্ত ${k.id}`, `Settlement ${k.id}`) })),
  ];
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby="kc-land">
      <h2 id="kc-land" className="text-lg font-bold">
        {tr("কার্ডের সঙ্গে যুক্ত জমি", "Land on this card")}
      </h2>
      <ul className="overflow-hidden rounded-2xl bg-card ring-1 ring-border">
        {rows.map((r, i) => {
          const p = state.plots[r.plot];
          return (
            <li key={i} className="border-b last:border-b-0">
              <button type="button" onClick={() => go(`check-${p.mouza.en}-${p.dag}`)} className="press flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-muted">
                <r.icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-semibold">
                    {tr("দাগ", "Dag")} {tr.num(p.dag)} · {tr.pick(p.mouza)}
                  </span>
                  <span className={cn("text-sm text-muted-foreground", r.warn && "font-semibold text-warning")}>
                    {r.label} · {r.note}
                  </span>
                </span>
                <span className="num shrink-0 text-right font-semibold">
                  {dec(tr, r.amount)} <span className="text-sm font-normal text-muted-foreground">{tr("শতাংশ", "dec.")}</span>
                </span>
                <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default function KrishakCard({ route }) {
  const tr = useT();
  const state = useRegister();
  const fromRoute = route.match(/^citizen-card-(\d+)$/)?.[1] || "";
  const [query, setQuery] = useState(fromRoute);
  const [no, setNo] = useState(fromRoute && state.cards[fromRoute] ? fromRoute : null);
  const [notFound, setNotFound] = useState(fromRoute && !state.cards[fromRoute] ? fromRoute : "");
  useEffect(() => {
    if (fromRoute && state.cards[fromRoute]) {
      setNo(fromRoute);
      setQuery(fromRoute);
    }
  }, [fromRoute]);

  function open(n) {
    setNo(n);
    setQuery(n);
    setNotFound("");
    history.replaceState(null, "", `#citizen-card-${n}`);
  }
  function search(e) {
    e?.preventDefault();
    const n = toAscii(query);
    if (!n) return document.getElementById("kc-no")?.focus();
    if (state.cards[n]) return open(n);
    setNo(null);
    setNotFound(n);
  }
  function clear() {
    setNo(null);
    setQuery("");
    setNotFound("");
    history.replaceState(null, "", "#citizen-card");
    setTimeout(() => document.getElementById("kc-no")?.focus(), 100);
  }

  const samples = SAMPLES.map(([p, bn, en]) => [cardOf(state, p), tr(bn, en)]).filter(([n]) => n && n !== no);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl leading-tight font-bold text-balance">{tr("আমার কৃষক কার্ড", "My Krishak Card")}</h1>
        <p className="text-muted-foreground">{tr("কার্ড নম্বর দিন: আপনার জমি, বর্গা, খাস বন্দোবস্ত আর সরকারি বার্তা এক জায়গায়।", "Enter your card number: your land, borga, khas settlement and government messages in one place.")}</p>
      </div>

      <form onSubmit={search} role="search" className="flex gap-2 rounded-2xl bg-card p-3 ring-1 ring-border">
        <InputGroup className="h-14 flex-1 rounded-xl">
          <InputGroupAddon>
            <IdCardIcon className="size-5" />
          </InputGroupAddon>
          <InputGroupInput
            id="kc-no"
            className="num text-xl font-semibold"
            inputMode="numeric"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tr("কার্ড নম্বর, যেমন ১০০১", "Card number, e.g. 1001")}
            aria-label={tr("কৃষক কার্ড নম্বর", "Krishak Card number")}
            autoComplete="off"
          />
          {query && (
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-sm" aria-label={tr("মুছুন", "Clear")} onClick={clear}>
                <XIcon />
              </InputGroupButton>
            </InputGroupAddon>
          )}
        </InputGroup>
        <Button type="submit" size="lg" className="h-14 shrink-0 px-5">
          <SearchIcon data-icon="inline-start" />
          {tr("খুঁজুন", "Find")}
        </Button>
      </form>

      {notFound && (
        <Alert variant="warning" className="bg-card">
          <SearchXIcon />
          <AlertTitle>{tr(`কার্ড ${tr.num(notFound)} পাওয়া যায়নি`, `Card ${notFound} not found`)}</AlertTitle>
          <AlertDescription>{tr("নম্বরটি আবার দেখুন। কার্ড না থাকলে ইউনিয়ন ভূমি অফিসে যোগাযোগ করুন।", "Check the number. If you have no card, ask the union land office.")}</AlertDescription>
        </Alert>
      )}

      {no && (
        <>
          <FarmerCard state={state} no={no} />
          <Messages state={state} person={state.cards[no].person} />
          <LandList state={state} person={state.cards[no].person} />
          <Button variant="ghost" className="self-start" onClick={clear}>
            <SearchIcon data-icon="inline-start" />
            {tr("আরেকটি কার্ড খুঁজুন", "Find another card")}
          </Button>
        </>
      )}

      {samples.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <SparklesIcon className="size-4" aria-hidden="true" />
            {tr("নমুনা কার্ড দেখে নিন", "Try a sample card")}
          </p>
          <div className="flex flex-wrap gap-2">
            {samples.map(([n, label]) => (
              <button
                type="button"
                key={n}
                onClick={() => {
                  open(n);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="press inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full bg-card px-4 text-[0.9375rem] font-semibold ring-1 ring-border hover:ring-primary"
              >
                <span className="num">{tr.num(n)}</span>
                <span className="font-normal text-muted-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="flex gap-2 text-sm text-muted-foreground">
        <LockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {tr("কার্ডে শুধু রেজিস্টারের জমির তথ্য দেখায়; জাতীয় পরিচয়পত্র বা ফোন নম্বর দেখায় না।", "The card shows only land from the register; it never shows NID or phone numbers.")}
      </p>
    </div>
  );
}
