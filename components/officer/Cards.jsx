"use client";
import { useState } from "react";
import { SearchIcon, IdCardIcon, SearchXIcon, ChevronDownIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { api, useRegister } from "@/lib/api";
import { findPerson } from "@/lib/register";
import { landOf, cardOf, cardEligible, CATEGORIES } from "@/lib/land-services";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, GREEN_HEAD } from "../brand";
import { FarmerCard, Messages } from "../citizen/KrishakCard";
import { useDuty, dec, run } from "./services";

const toAscii = (s) => String(s).replace(/[০-৯]/g, (c) => "০১২৩৪৫৬৭৮৯".indexOf(c));
const PAGE = 15;

export default function Cards() {
  const tr = useT();
  const state = useRegister();
  const { officer, role } = useDuty();
  const [query, setQuery] = useState("");
  const [person, setPerson] = useState(null);
  const [missing, setMissing] = useState("");
  const [cat, setCat] = useState("all");
  const [limit, setLimit] = useState(PAGE);
  const [busy, setBusy] = useState(false);

  const cards = Object.entries(state.cards || {}).map(([no, c]) => ({ no, person: c.person, issued: c.issued, land: landOf(state, c.person) }));
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.key, cards.filter((x) => x.land.category.key === c.key).length]));
  const rows = cards.filter((x) => cat === "all" || x.land.category.key === cat).sort((a, b) => Number(b.no) - Number(a.no));
  const waiting = Object.keys(state.people).filter((p) => !cardOf(state, p) && cardEligible(state, p));

  function find(e) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    const byNo = state.cards[toAscii(q)]?.person;
    const p = byNo || findPerson(state, q);
    setPerson(p);
    setMissing(p ? "" : q);
  }
  const open = (p) => {
    setPerson(p);
    setMissing("");
    setQuery(tr.pick(state.people[p]));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  async function issue(p) {
    setBusy(true);
    await run(() => api.issueCard(p, officer), (no) => tr(`কৃষক কার্ড নং ${tr.num(no)} দেওয়া হলো`, `Krishak Card no. ${no} issued`));
    setBusy(false);
  }

  const no = person && cardOf(state, person);
  const canIssue = role !== "subreg";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("কৃষক কার্ড", "Krishak Card")}
        description={tr(
          "রেজিস্টারের জমি, বর্গা আর খাস বন্দোবস্ত থেকে কার্ড নিজে থেকেই হিসাব করে কে ভূমিহীন, প্রান্তিক, ক্ষুদ্র, মাঝারি বা বড় কৃষক। ভর্তুকি আর সহায়তা ঠিক মানুষের কাছে যায়।",
          "From the register's land, borga and khas settlements, the card works out who is a landless, marginal, small, medium or large farmer, so subsidies and support reach the right people."
        )}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[{ key: "all", bn: "সব কার্ড", en: "All cards" }, ...CATEGORIES].map((c) => {
          const n = c.key === "all" ? cards.length : counts[c.key];
          return (
            <button
              type="button"
              key={c.key}
              aria-pressed={cat === c.key}
              onClick={() => {
                setCat(c.key);
                setLimit(PAGE);
              }}
              className={cn("press flex cursor-pointer flex-col gap-1 rounded-lg bg-card px-4 py-3 text-left ring-1 ring-transparent hover:ring-border", cat === c.key && "ring-2 ring-primary hover:ring-primary")}
            >
              <span className="text-sm text-muted-foreground">{tr.pick(c)}</span>
              <span className="num text-3xl font-bold">{tr.num(n)}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={find} role="search" className="flex gap-2">
        <InputGroup className="h-12 flex-1">
          <InputGroupAddon>
            <IdCardIcon />
          </InputGroupAddon>
          <InputGroupInput list="card-people" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tr("কার্ড নম্বর বা নাম", "Card number or name")} aria-label={tr("কার্ড নম্বর বা নাম", "Card number or name")} autoComplete="off" />
        </InputGroup>
        <datalist id="card-people">
          {Object.entries(state.people).map(([id, p]) => (
            <option key={id} value={tr.pick(p)} />
          ))}
        </datalist>
        <Button type="submit" size="lg" className="h-12">
          <SearchIcon data-icon="inline-start" />
          {tr("খুঁজুন", "Find")}
        </Button>
      </form>

      {missing && (
        <Alert variant="warning" className="bg-card">
          <SearchXIcon />
          <AlertTitle>{tr(`“${missing}” পাওয়া যায়নি`, `"${missing}" not found`)}</AlertTitle>
          <AlertDescription>{tr("পুরো নাম বা কার্ড নম্বর লিখুন।", "Type the full name or the card number.")}</AlertDescription>
        </Alert>
      )}

      {person && no && (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <FarmerCard state={state} no={no} />
          <Messages state={state} person={person} />
        </div>
      )}
      {person && !no && (
        <Alert variant={cardEligible(state, person) ? "info" : "default"} className={cardEligible(state, person) ? undefined : "bg-card"}>
          <IdCardIcon />
          <AlertTitle>{tr(`${state.people[person].bn}-এর কোনো কার্ড নেই`, `${state.people[person].en} has no card`)}</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3">
            {cardEligible(state, person)
              ? tr("রেজিস্টারে এই ব্যক্তি কৃষিজমির মালিক, বর্গাদার বা খাস বন্দোবস্তপ্রাপ্ত, তাই কার্ড পেতে পারেন।", "On the register this person owns or farms farmland, so they can get a card.")
              : tr("রেজিস্টারে এই ব্যক্তির কোনো কৃষিজমি, বর্গা বা খাস বন্দোবস্ত নেই।", "This person owns or farms no farmland on the register.")}
            {cardEligible(state, person) && (
              <Button size="sm" onClick={() => issue(person)} disabled={!canIssue || busy}>
                <IdCardIcon data-icon="inline-start" />
                {canIssue ? tr("কার্ড দিন", "Issue card") : tr("সাব-রেজিস্ট্রার কার্ড দেন না", "Sub-Registrars do not issue cards")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {waiting.length > 0 && (
        <Alert variant="info">
          <IdCardIcon />
          <AlertTitle>{tr(`${tr.num(waiting.length)} জন কার্ড পাওয়ার যোগ্য, এখনো পাননি`, `${waiting.length} eligible people have no card yet`)}</AlertTitle>
          <AlertDescription className="flex flex-wrap gap-2">
            {waiting.map((p) => (
              <button key={p} type="button" className="cursor-pointer font-semibold underline underline-offset-3" onClick={() => open(p)}>
                {tr.pick(state.people[p])}
              </button>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <Card className="py-0">
        <Table className="min-w-[640px]">
          <TableHeader className={GREEN_HEAD}>
            <TableRow className={GREEN_HEAD}>
              <TableHead className="pl-5">{tr("কার্ড", "Card")}</TableHead>
              <TableHead>{tr("নাম", "Name")}</TableHead>
              <TableHead>{tr("শ্রেণি", "Category")}</TableHead>
              <TableHead className="text-right">{tr("চাষের জমি (শতাংশ)", "Land farmed (dec.)")}</TableHead>
              <TableHead className="pr-5">{tr("দেওয়া হয়", "Issued")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, limit).map((r) => (
              <TableRow key={r.no}>
                <TableCell className="num pl-5 font-semibold">{tr.num(r.no)}</TableCell>
                <TableCell>
                  <button type="button" className="cursor-pointer text-left hover:underline" onClick={() => open(r.person)}>
                    {tr.pick(state.people[r.person])}
                  </button>
                </TableCell>
                <TableCell>{tr.pick(r.land.category)}</TableCell>
                <TableCell className="num text-right">{dec(tr, r.land.operated)}</TableCell>
                <TableCell className="pr-5 text-sm">{tr.date(r.issued)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length > limit && (
          <div className="border-t p-3 text-center">
            <Button variant="ghost" onClick={() => setLimit((n) => n + PAGE)}>
              <ChevronDownIcon data-icon="inline-start" />
              {tr(`আরও দেখুন (${tr.num(rows.length - limit)} বাকি)`, `Show more (${rows.length - limit} left)`)}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
