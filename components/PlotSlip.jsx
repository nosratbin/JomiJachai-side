"use client";

import { CircleCheckIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { plotStatus } from "@/lib/register";
import { taxStatus, taxYearLabel, coSharers, borgaOn, BASIS } from "@/lib/land-services";
import * as F from "@/lib/fraction";
import { cn } from "@/lib/utils";
import { ReadAloudButton } from "./brand";

export const LEVEL = {
  safe: { bn: "নিরাপদ", en: "Safe", text: "text-success", bar: "bg-success dark:bg-success/15 dark:text-success", icon: CircleCheckIcon },
  careful: { bn: "সতর্ক থাকুন", en: "Be careful", text: "text-warning", bar: "bg-warning dark:bg-warning/15 dark:text-warning", icon: TriangleAlertIcon },
  risky: { bn: "ঝুঁকিপূর্ণ", en: "Risky", text: "text-destructive", bar: "bg-destructive dark:bg-destructive/15 dark:text-destructive", icon: OctagonXIcon },
};

function Row({ label, value, strong, className }) {
  return (
    <div className={cn("flex items-baseline gap-2", className)}>
      <span className="min-w-0">{label}</span>
      <span className="leader" aria-hidden="true" />
      <span className={cn("num shrink-0 text-right", strong && "font-bold")}>{value}</span>
    </div>
  );
}

export function taxText(tr, tax) {
  if (tax.exempt === "khas") return tr("প্রযোজ্য নয়", "Not applicable");
  if (tax.exempt === "river") return tr("মওকুফ (নদীতে বিলীন)", "Waived (lost to river)");
  if (tax.paidUpTo == null) return tr("রেকর্ড নেই", "No record");
  if (tax.overdue) return tr(`${tr.num(tax.overdue)} বছর বকেয়া`, `${tax.overdue} yr(s) overdue`);
  return tr(`${tr.num(taxYearLabel(tax.paidUpTo))} পর্যন্ত পরিশোধিত`, `Paid to ${taxYearLabel(tax.paidUpTo)}`);
}

const spoken = (f) => {
  const d = F.toDecimalString(f, 2);
  return d.includes(".") ? d.replace(/0+$/, "").replace(/\.$/, "") : d;
};

export function plotSentence(tr, state, plotId) {
  const plot = state.plots[plotId];
  const r = plotStatus(state, plotId);
  const l = LEVEL[r.level];
  return tr(
    `দাগ ${plot.dag}, মৌজা ${plot.mouza.bn}। ${l.bn}। ${r.reasons.map((x) => x.bn).join("। ")}। মালিক: ${r.owners.map((o) => `${state.people[o.person].bn} ${spoken(o.share)} শতাংশ`).join(", ")}।`,
    `Dag ${plot.dag}, mouza ${plot.mouza.en}. ${l.en}. ${r.reasons.map((x) => x.en).join(". ")}. Owners: ${r.owners.map((o) => `${state.people[o.person].en} ${spoken(o.share)} decimals`).join(", ")}.`,
  );
}

export default function PlotSlip({ state, plotId, className, footer, brief = false }) {
  const tr = useT();
  const plot = state.plots[plotId];
  const result = plotStatus(state, plotId);
  const level = LEVEL[result.level];
  const tax = taxStatus(state, plotId);
  const sharers = coSharers(state, plotId);
  const borga = borgaOn(state, plotId);
  return (
    <article className={cn("slip relative w-full px-5 pt-5 text-base sm:px-7 sm:pt-7", className)} aria-live="polite" aria-label={tr("দাগের পর্চা", "Plot record slip")}>
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-semibold text-muted-foreground">{tr("পর্চা · দাগের তথ্য", "Porcha · plot record")}</p>
          <h3 className="mt-0.5 text-2xl font-bold">
            {tr("দাগ", "Dag")} {tr.num(plot.dag)}
          </h3>
        </div>
        <span key={plotId} className={cn("stamp stamp-in mt-1 shrink-0 text-lg", level.text)}>
          {tr(level.bn, level.en)}
        </span>
      </header>

      <div className="mt-4 flex flex-col gap-1.5">
        <Row label={tr("মৌজা", "Mouza")} value={`${tr.pick(plot.mouza)} · ${tr("জেএল", "JL")} ${tr.num(plot.jl)}`} />
        <Row label={tr("খতিয়ান", "Khatian")} value={tr.num(plot.khatian)} />
        <Row label={tr("জমির শ্রেণি", "Land class")} value={tr.pick(plot.landType)} />
        <Row label={tr("মোট জমি", "Total area")} value={`${tr.num(F.display(plot.total))} ${tr("শতাংশ", "decimals")}`} strong />
        <Row label={tr("ভূমি উন্নয়ন কর", "Land tax")} value={taxText(tr, tax)} className={tax.alert ? "text-warning font-semibold" : undefined} />
      </div>

      <p className="mt-5 mb-1.5 font-bold">{tr("মালিক ও অবশিষ্ট অংশ", "Owners and remaining shares")}</p>
      <div className="flex flex-col gap-1.5">
        {sharers.map((o) => (
          <Row
            key={o.person}
            label={
              <>
                {tr.pick(state.people[o.person])}
                {sharers.length > 1 && <span className="ml-1.5 text-sm text-muted-foreground">({tr.pick(BASIS[o.basis])})</span>}
              </>
            }
            value={`${tr.num(F.display(o.share))} ${tr("শতাংশ", "dec.")}`}
          />
        ))}
      </div>
      {borga.length > 0 && (
        <>
          <p className="mt-5 mb-1.5 font-bold">{tr("বর্গা চাষ", "Borga (sharecropping)")}</p>
          <div className="flex flex-col gap-1.5">
            {borga.map((b) => (
              <Row key={b.id} label={tr(`বর্গাদার ${state.people[b.bargadar].bn}`, `Bargadar ${state.people[b.bargadar].en}`)} value={`${tr.num(F.display(F.parse(b.decimals)))} ${tr("শতাংশ", "dec.")}`} />
            ))}
          </div>
        </>
      )}

      {!brief && (
        <>
          <p className="mt-5 mb-1.5 font-bold">{tr("কেন এই উত্তর", "Why this answer")}</p>
          <ul className="flex flex-col gap-1.5">
            {result.reasons.map((r, i) => {
              const L = LEVEL[r.level] || LEVEL.safe;
              return (
                <li key={i} className="flex gap-2">
                  <L.icon className={cn("mt-1 size-4 shrink-0", L.text)} aria-hidden="true" />
                  <span>{tr.num(tr.pick(r))}</span>
                </li>
              );
            })}
          </ul>

          <div className={cn("mt-5 -mx-5 flex items-center justify-between gap-3 px-5 py-3 font-bold text-background sm:-mx-7 sm:px-7", level.bar)}>
            <span className="flex items-center gap-2">
              <level.icon className="size-5" aria-hidden="true" />
              {tr(level.bn, level.en)}
            </span>
            <ReadAloudButton size="sm" variant="secondary" className="bg-background text-foreground hover:bg-background/90" text={plotSentence(tr, state, plotId)} />
          </div>
        </>
      )}
      {brief && <div className="h-6" aria-hidden="true" />}
      {footer && <div className="mt-4">{footer}</div>}
    </article>
  );
}
