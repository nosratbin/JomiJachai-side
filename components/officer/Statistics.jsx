"use client";

import { useState } from "react";
import { SendIcon, FileCheck2Icon, FileXIcon, TriangleAlertIcon, ShieldCheckIcon, ShieldAlertIcon, FilterIcon, XIcon, SearchXIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useRegister } from "@/lib/api";
import { officerName, dateKey } from "@/lib/register";
import * as F from "@/lib/fraction";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Field, FieldLabel } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { PageHeader, BackendBadge, GREEN_HEAD } from "../brand";

const RESULT = {
  passed: ["success", "পাস", "Passed"],
  warning: ["warning", "সতর্কতা", "Warning"],
  blocked: ["destructive", "নামঞ্জুর", "Refused"],
  approved: ["success", "অনুমোদিত", "Approved"],
  genuine: ["success", "আসল", "Genuine"],
  altered: ["destructive", "বদলানো", "Altered"],
  mismatch: ["destructive", "মেলেনি", "No match"],
  notice: ["warning", "নোটিশ", "Notice"],
  recorded: ["info", "নথিভুক্ত", "Recorded"],
  paid: ["success", "পরিশোধিত", "Paid"],
};

const KINDS = [
  ["check", "বিক্রির আবেদন", "Sale applications"],
  ["register", "দলিল নিবন্ধন", "Deed registrations"],
  ["verify", "দলিল যাচাই", "Deed checks"],
  ["notice", "অধিগ্রহণের নোটিশ", "Acquisition notices"],
  ["tax", "ভূমি উন্নয়ন কর", "Land tax"],
  ["erosion", "নদীভাঙন", "River erosion"],
  ["khas", "খাস বন্দোবস্ত", "Khas settlements"],
  ["borga", "বর্গা চুক্তি", "Borga agreements"],
  ["card", "কৃষক কার্ড", "Krishak Cards"],
];

const PERIODS = [
  ["all", 0, "সব সময়", "All time"],
  ["today", 1, "আজ", "Today"],
  ["7", 7, "গত ৭ দিন", "Last 7 days"],
  ["30", 30, "গত ৩০ দিন", "Last 30 days"],
];
function rangeOf(days) {
  if (!days) return ["", ""];
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return [dateKey(start), dateKey()];
}

const NO_FILTER = { from: "", to: "", mouza: "", dag: "", kind: "" };
const PAGE = 15;

export default function Statistics() {
  const tr = useT();
  const state = useRegister();
  const [f, setF] = useState(NO_FILTER);
  const [shown, setShown] = useState(PAGE);
  const set = (patch) => {
    setF((x) => ({ ...x, ...patch }));
    setShown(PAGE);
  };
  const filtered = Object.values(f).some(Boolean);

  const deedPlot = Object.fromEntries(state.deeds.map((d) => [d.no, d.plot]));
  const plotOf = (e) => e.plot || (e.deed && deedPlot[e.deed]) || null;

  const [from, to] = f.from && f.to && f.from > f.to ? [f.to, f.from] : [f.from, f.to];
  const dagWanted = String(f.dag).replace(/[০-৯]/g, (c) => "০১২৩৪৫৬৭৮৯".indexOf(c)).trim();

  const history = state.log.filter((e) => {
    if (e.kind === "seed") return false;
    const day = dateKey(new Date(e.time));
    if (from && day < from) return false;
    if (to && day > to) return false;
    if (f.kind && e.kind !== f.kind) return false;
    const plot = state.plots[plotOf(e)];
    if (f.mouza && plot?.mouza.en !== f.mouza) return false;
    if (dagWanted && Number(plot?.dag) !== Number(dagWanted)) return false;
    return true;
  });

  const count = (fn) => history.filter(fn).length;
  const cards = [
    [SendIcon, "--tile-3", count((e) => e.kind === "check"), tr("মোট বিক্রির আবেদন", "Sale applications")],
    [FileCheck2Icon, "--tile-1", count((e) => e.kind === "register"), tr("অনুমোদিত, দলিল নিবন্ধিত", "Approved, deed registered")],
    [FileXIcon, "--tile-5", count((e) => e.kind === "check" && e.result === "blocked"), tr("নামঞ্জুর (আটকানো)", "Refused (blocked)")],
    [TriangleAlertIcon, "--tile-4", count((e) => e.kind === "check" && e.result === "warning"), tr("সতর্কতাসহ আবেদন", "Applications with warnings")],
    [ShieldCheckIcon, "--tile-2", count((e) => e.result === "genuine"), tr("আসল বলে যাচাই হওয়া দলিল", "Deeds verified genuine")],
    [ShieldAlertIcon, "--tile-6", count((e) => e.result === "altered" || e.result === "mismatch"), tr("জাল বা বদলানো কপি ধরা পড়েছে", "Fake or altered copies caught")],
  ];

  const plots = Object.entries(state.plots).sort((a, b) => F.cmp(F.parse(b[1].total), F.parse(a[1].total)));
  const land = F.sum(plots.map(([, p]) => p.total));

  const byMouza = {};
  for (const [, p] of plots) {
    const m = (byMouza[p.mouza.en] ||= { name: p.mouza, dags: 0, land: F.parse("0") });
    m.dags += 1;
    m.land = F.add(m.land, F.parse(p.total));
  }
  const mouzas = Object.entries(byMouza);
  const owners = new Set(Object.values(state.shares).flatMap((s) => Object.entries(s).filter(([, v]) => !F.isZero(F.parse(v))).map(([p]) => p))).size;
  const rows = [...history].reverse();
  const last = state.log[state.log.length - 1];
  const who = (u) => tr.pick(officerName(u))?.split(",")[0] || (u === "citizen" ? tr("নাগরিক অ্যাপ", "Citizen App") : u === "sync" ? tr("সিঙ্ক", "Sync") : u);
  const period = PERIODS.find(([, days]) => {
    const [a, b] = rangeOf(days);
    return f.from === a && f.to === b;
  })?.[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("তথ্যচিত্র", "Statistics")}
        description={tr("আবেদন, দলিল ও যাচাইয়ের হিসাব, সরাসরি রেজিস্টার থেকে। শুধু অফিসার ও প্রশাসকেরা দেখেন।", "Applications, deeds and verifications, counted live from the register. Visible to officers and administrators only.")}
        actions={
          last && (
            <p className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
              <span>
                {tr("সর্বশেষ হালনাগাদ", "Last updated")}: {tr.time(last.time)}
              </span>
              <span aria-hidden="true">·</span>
              <BackendBadge />
            </p>
          )
        }
      />

      {}
      <section className="flex flex-col gap-4 rounded-lg bg-card p-5" aria-labelledby="filter-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="filter-title" className="flex items-center gap-2 text-lg font-bold">
            <FilterIcon className="size-5 text-primary" aria-hidden="true" />
            {tr("ইতিহাস খুঁজুন", "Search the history")}
          </h2>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label={tr("সময়কাল", "Period")}>
            {PERIODS.map(([key, days, bn, en]) => (
              <button
                key={key}
                type="button"
                aria-pressed={period === key}
                onClick={() => {
                  const [a, b] = rangeOf(days);
                  set({ from: a, to: b });
                }}
                className={cn("press min-h-9 cursor-pointer rounded-full px-3.5 text-sm font-semibold", period === key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground")}
              >
                {tr(bn, en)}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-[1fr_1fr_1.2fr_0.9fr_1.2fr_auto] lg:items-end">
          <Field>
            <FieldLabel htmlFor="st-from">{tr("তারিখ থেকে", "From date")}</FieldLabel>
            <Input id="st-from" type="date" value={f.from} max={dateKey()} onChange={(e) => set({ from: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="st-to">{tr("তারিখ পর্যন্ত", "To date")}</FieldLabel>
            <Input id="st-to" type="date" value={f.to} max={dateKey()} onChange={(e) => set({ to: e.target.value })} />
          </Field>
          <Field>
            <FieldLabel htmlFor="st-mouza">{tr("এলাকা (মৌজা)", "Area (mouza)")}</FieldLabel>
            <NativeSelect id="st-mouza" className="w-full" value={f.mouza} onChange={(e) => set({ mouza: e.target.value })}>
              <NativeSelectOption value="">{tr("সব মৌজা", "All mouzas")}</NativeSelectOption>
              {mouzas.map(([key, m]) => (
                <NativeSelectOption key={key} value={key}>
                  {tr.pick(m.name)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Field>
            <FieldLabel htmlFor="st-dag">{tr("দাগ নম্বর", "Dag number")}</FieldLabel>
            <Input id="st-dag" inputMode="numeric" autoComplete="off" value={f.dag} placeholder={tr("যেমন ২৪৫", "e.g. 245")} onChange={(e) => set({ dag: e.target.value })} />
          </Field>
          <Field className="col-span-2 lg:col-span-1">
            <FieldLabel htmlFor="st-kind">{tr("ধরন", "Type")}</FieldLabel>
            <NativeSelect id="st-kind" className="w-full" value={f.kind} onChange={(e) => set({ kind: e.target.value })}>
              <NativeSelectOption value="">{tr("সব ধরন", "All types")}</NativeSelectOption>
              {KINDS.map(([key, bn, en]) => (
                <NativeSelectOption key={key} value={key}>
                  {tr(bn, en)}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </Field>
          <Button variant="ghost" className="col-span-2 h-11 lg:col-span-1" disabled={!filtered} onClick={() => set(NO_FILTER)}>
            <XIcon data-icon="inline-start" />
            {tr("মুছুন", "Clear")}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {filtered
            ? tr(`ফিল্টার অনুযায়ী ${tr.num(history.length)}টি ঘটনা`, `${history.length} events match the filters`)
            : tr(`সব মিলিয়ে ${tr.num(history.length)}টি ঘটনা। নির্দিষ্ট একটি দিনের হিসাব দেখতে দুই ঘরেই একই তারিখ বেছে নিন।`, `${history.length} events in all. For one day, choose the same date in both boxes.`)}
        </p>
      </section>

      <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([Icon, color, n, label]) => (
          <div key={label} className="flex items-center gap-4 rounded-lg bg-card p-5" style={{ "--c": `var(${color})` }}>
            <span className="inline-flex size-14 shrink-0 items-center justify-center rounded-full text-(--c)" style={{ background: "color-mix(in oklch, var(--c) 12%, transparent)" }}>
              <Icon className="size-7" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-col-reverse">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="num text-3xl font-bold">{tr.num(n)}</dd>
            </div>
          </div>
        ))}
      </dl>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <section className="flex min-w-0 flex-col gap-3" aria-labelledby="history-title">
          <h2 id="history-title" className="text-xl font-bold text-primary">
            {filtered ? tr("খোঁজের ফল", "Search results") : tr("সাম্প্রতিক ইতিহাস", "Recent history")}
          </h2>
          {rows.length ? (
            <>
              <div className="overflow-hidden rounded-lg bg-card">
                <Table className="min-w-[44rem]">
                  <TableHeader className={GREEN_HEAD}>
                    <TableRow className={GREEN_HEAD}>
                      <TableHead className="pl-5">{tr("সময়", "Time")}</TableHead>
                      <TableHead>{tr("দাগ", "Dag")}</TableHead>
                      <TableHead>{tr("কে", "Who")}</TableHead>
                      <TableHead>{tr("ফল", "Result")}</TableHead>
                      <TableHead className="pr-5">{tr("বিবরণ", "Details")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, shown).map((e) => {
                      const [variant, bn, en] = RESULT[e.result] || RESULT.passed;
                      const plot = state.plots[plotOf(e)];
                      return (
                        <TableRow key={e.seq} className="align-top">
                          <TableCell className="pl-5 text-sm whitespace-nowrap">{tr.time(e.time)}</TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {plot ? (
                              <>
                                <span className="font-semibold">{tr.num(plot.dag)}</span>
                                <span className="text-muted-foreground"> · {tr.pick(plot.mouza)}</span>
                              </>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{who(e.user)}</TableCell>
                          <TableCell>
                            <Badge variant={variant}>{tr(bn, en)}</Badge>
                          </TableCell>
                          <TableCell className="min-w-[16rem] pr-5 whitespace-normal">{tr.num(tr.pick(e.text))}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>{tr(`${tr.num(Math.min(shown, rows.length))} / ${tr.num(rows.length)} দেখানো হচ্ছে`, `Showing ${Math.min(shown, rows.length)} of ${rows.length}`)}</span>
                {shown < rows.length && (
                  <Button variant="outline" className="bg-card" onClick={() => setShown((n) => n + PAGE)}>
                    {tr(`আরও ${tr.num(Math.min(PAGE, rows.length - shown))}টি দেখুন`, `Show ${Math.min(PAGE, rows.length - shown)} more`)}
                  </Button>
                )}
              </div>
            </>
          ) : (
            <Empty className="rounded-lg bg-card">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <SearchXIcon />
                </EmptyMedia>
                <EmptyTitle>{filtered ? tr("এই ফিল্টারে কিছু পাওয়া যায়নি", "Nothing matches these filters") : tr("এখনো কোনো আবেদন জমা হয়নি", "No applications yet")}</EmptyTitle>
                <EmptyDescription>
                  {filtered
                    ? tr("তারিখের সীমা বাড়িয়ে দেখুন, অথবা মৌজা বা দাগ নম্বর বদলান।", "Widen the dates, or change the mouza or the dag number.")
                    : tr("“নতুন বিক্রি নিবন্ধন” থেকে আবেদন জমা দিলে এখানে দেখা যাবে।", "Submit an application in “Register a sale” and it appears here.")}
                </EmptyDescription>
              </EmptyHeader>
              {filtered && (
                <EmptyContent>
                  <Button variant="outline" onClick={() => set(NO_FILTER)}>
                    {tr("সব ফিল্টার মুছুন", "Clear all filters")}
                  </Button>
                </EmptyContent>
              )}
            </Empty>
          )}
        </section>

        <section className="slip bg-cream px-6 pt-6 sm:px-7" aria-labelledby="register-title">
          <h2 id="register-title" className="text-center text-lg font-bold">
            {tr("রেজিস্টারের হিসাব", "Register account")}
          </h2>
          <p className="mb-5 text-center text-sm text-muted-foreground">
            {tr(`${tr.num(plots.length)}টি দাগ · ${tr.num(owners)} জন মালিক`, `${plots.length} dags · ${owners} owners`)}
          </p>
          <div className="flex flex-col gap-2">
            {mouzas.map(([key, m]) => (
              <div key={key} className={cn("flex items-baseline gap-2", f.mouza && f.mouza !== key && "opacity-45")}>
                <span>
                  {tr(`মৌজা ${m.name.bn} · ${tr.num(m.dags)}টি দাগ`, `Mouza ${m.name.en} · ${m.dags} dags`)}
                </span>
                <span className="leader" aria-hidden="true" />
                <span className="num font-semibold">{tr.num(F.display(m.land))}</span>
              </div>
            ))}
          </div>
          <div className="-mx-6 mt-5 flex items-baseline justify-between bg-foreground px-6 py-3 font-bold text-background sm:-mx-7 sm:px-7">
            <span>{tr("মোট জমি (শতাংশ)", "Total land (decimals)")}</span>
            <span className="num text-lg">{tr.num(F.display(land))}</span>
          </div>
        </section>
      </div>
    </div>
  );
}
