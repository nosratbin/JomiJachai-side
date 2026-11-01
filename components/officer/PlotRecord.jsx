"use client";
import { CheckIcon, TriangleAlertIcon, GavelIcon, LandmarkIcon, BuildingIcon, BanknoteIcon, ShieldCheckIcon, WavesIcon, MegaphoneIcon, ReceiptIcon, SproutIcon, HomeIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { ownersOf, plotTotalCheck } from "@/lib/register";
import { taxStatus, taxYearLabel, noticeOn, erosionOf, borgaOn, khasOn, khasFree, coSharers, BASIS, EROSION_STEPS } from "@/lib/land-services";
import * as F from "@/lib/fraction";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareBar, OWNER_SHADES } from "../brand";

export function FlagPills({ plot, state, plotId }) {
  const tr = useT();
  const f = plot.flags;
  const pills = [];
  const notice = state && noticeOn(state, plotId);
  const er = state && erosionOf(state, plotId);
  const tax = state && taxStatus(state, plotId);
  if (f.courtCase)
    pills.push(
      <Badge key="c" variant="destructive">
        <GavelIcon data-icon="inline-start" />
        {tr("চলমান মামলা", "Court case")}
      </Badge>
    );
  if (f.khas)
    pills.push(
      <Badge key="k" variant="destructive">
        <LandmarkIcon data-icon="inline-start" />
        {tr("খাস জমি", "Khas land")}
      </Badge>
    );
  if (er)
    pills.push(
      <Badge key="r" variant={er.step >= 1 ? "destructive" : "warning"}>
        <WavesIcon data-icon="inline-start" />
        {er.step >= 1 ? tr("নদীতে বিলীন", "Lost to river") : tr("নদীভাঙন সন্দেহ", "Possible river loss")}
      </Badge>
    );
  if (f.acquisition)
    pills.push(
      <Badge key="a" variant="destructive">
        <BuildingIcon data-icon="inline-start" />
        {tr("অধিগ্রহণাধীন", "Under acquisition")}
      </Badge>
    );
  if (notice)
    pills.push(
      <Badge key="n" variant={notice.frozen ? "destructive" : "warning"}>
        <MegaphoneIcon data-icon="inline-start" />
        {notice.frozen ? tr("নোটিশ: বিক্রি বন্ধ", "Notice: sales stopped") : tr("অধিগ্রহণের নোটিশ", "Acquisition notice")}
      </Badge>
    );
  if (f.mortgage)
    pills.push(
      <Badge key="m" variant="warning">
        <BanknoteIcon data-icon="inline-start" />
        {tr("ব্যাংকে বন্ধক", "Mortgaged")}
      </Badge>
    );
  if (tax?.alert)
    pills.push(
      <Badge key="t" variant="warning">
        <ReceiptIcon data-icon="inline-start" />
        {tr(`কর ${tr.num(tax.overdue)} বছর বকেয়া`, `Tax ${tax.overdue} yrs overdue`)}
      </Badge>
    );
  if (!pills.length)
    pills.push(
      <Badge key="ok" variant="success">
        <ShieldCheckIcon data-icon="inline-start" />
        {tr("কোনো দাবি নেই", "No claims")}
      </Badge>
    );
  return <div className="flex flex-wrap gap-1.5">{pills}</div>;
}

// Tax, notice, river, borga and khas lines for one dag.
export function ServiceRows({ state, plotId }) {
  const tr = useT();
  const plot = state.plots[plotId];
  const tax = taxStatus(state, plotId);
  const notice = noticeOn(state, plotId);
  const er = erosionOf(state, plotId);
  const borga = borgaOn(state, plotId);
  const khas = khasOn(state, plotId);
  const name = (id) => tr.pick(state.people[id]);
  const rows = [];
  rows.push([
    ReceiptIcon,
    tr("ভূমি উন্নয়ন কর", "Land tax"),
    tax.exempt === "khas"
      ? tr("প্রযোজ্য নয় (সরকারি খাস জমি)", "Not applicable (government khas land)")
      : tax.exempt === "river"
      ? tr("মওকুফ (নদীতে বিলীন)", "Waived (lost to the river)")
      : tax.paidUpTo == null
      ? tr("রেকর্ড নেই", "No record")
      : tax.overdue
      ? tr(`${tr.num(tax.overdue)} বছর বকেয়া · শেষ পরিশোধ ${tr.num(taxYearLabel(tax.paidUpTo))}`, `${tax.overdue} year(s) overdue · last paid ${taxYearLabel(tax.paidUpTo)}`)
      : tr(`পরিশোধিত, ${tr.num(taxYearLabel(tax.paidUpTo))} পর্যন্ত`, `Paid up to ${taxYearLabel(tax.paidUpTo)}`),
    tax.alert ? "text-warning font-semibold" : "",
  ]);
  if (notice)
    rows.push([
      MegaphoneIcon,
      tr("অধিগ্রহণের নোটিশ", "Acquisition notice"),
      tr(`${notice.id} · ${notice.project.bn} · বিক্রি বন্ধ ${tr.date(notice.freeze)} থেকে`, `${notice.id} · ${notice.project.en} · sales stop from ${tr.date(notice.freeze)}`),
      notice.frozen ? "text-destructive font-semibold" : "text-warning font-semibold",
    ]);
  if (er)
    rows.push([
      WavesIcon,
      tr("নদীভাঙন", "River erosion"),
      tr(`${tr.num(er.year)} সালে বিলীন · ধাপ ${tr.num(er.step + 1)}/${tr.num(EROSION_STEPS.length)}: ${EROSION_STEPS[er.step].bn}`, `Lost in ${er.year} · step ${er.step + 1}/${EROSION_STEPS.length}: ${EROSION_STEPS[er.step].en}`),
      er.step >= 1 ? "text-destructive font-semibold" : "text-warning font-semibold",
    ]);
  for (const b of borga)
    rows.push([
      SproutIcon,
      tr(`বর্গা ${b.id}`, `Borga ${b.id}`),
      tr(`${tr.num(F.display(F.parse(b.decimals)))} শতাংশ · মালিক ${name(b.owner)} · বর্গাদার ${name(b.bargadar)}`, `${F.display(F.parse(b.decimals))} decimals · owner ${name(b.owner)} · bargadar ${name(b.bargadar)}`),
      "",
    ]);
  for (const k of khas)
    rows.push([
      HomeIcon,
      tr(`বন্দোবস্ত ${k.id}`, `Settlement ${k.id}`),
      tr(`${tr.num(F.display(F.parse(k.decimals)))} শতাংশ · ভূমিহীন পরিবার ${name(k.family)}`, `${F.display(F.parse(k.decimals))} decimals · landless family ${name(k.family)}`),
      "",
    ]);
  if (plot.flags.khas)
    rows.push([LandmarkIcon, tr("খালি খাস জমি", "Unsettled khas land"), tr(`${tr.num(F.display(khasFree(state, plotId)))} শতাংশ`, `${F.display(khasFree(state, plotId))} decimals`), ""]);
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {rows.map(([Icon, label, value, tone], i) => (
        <li key={i} className="flex gap-2.5">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="min-w-0">
            <span className="font-semibold">{label}: </span>
            <span className={tone}>{value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function PlotRecord({ state, plotId, selling, sellerId, compact = false }) {
  const tr = useT();
  const plot = state.plots[plotId];
  const owners = ownersOf(state, plotId);
  const basis = Object.fromEntries(coSharers(state, plotId).map((c) => [c.person, c]));
  const exact = plotTotalCheck(state, plotId);
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold text-muted-foreground">{tr("ভূমি রেজিস্টার", "Land register")}</p>
        <CardTitle className="text-2xl font-bold">
          {tr("দাগ", "Dag")} <span className="num">{tr.num(plot.dag)}</span>
        </CardTitle>
        <CardDescription>
          {tr("মৌজা", "Mouza")} {tr.pick(plot.mouza)} · {tr("জেএল", "JL")} {tr.num(plot.jl)} · {tr("খতিয়ান", "Khatian")} {tr.num(plot.khatian)}
        </CardDescription>
        <CardAction className="text-right">
          <div className="num text-2xl font-semibold">{tr.num(F.display(plot.total))}</div>
          <div className="text-xs text-muted-foreground">{tr("শতাংশ মোট", "decimals total")}</div>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <FlagPills plot={plot} state={state} plotId={plotId} />
          <span className="text-sm text-muted-foreground">· {tr.pick(plot.landType)}</span>
        </div>
        {Object.values(plot.flags).filter(Boolean).map((f, i) => (
          <p key={i} className="-mt-2 text-sm text-muted-foreground">
            {tr.pick(f)}
          </p>
        ))}
        <ShareBar owners={owners} total={plot.total} people={state.people} selling={selling} sellerId={sellerId} />
        {!compact && (
          <div className="flex flex-col">
            <div className="flex items-baseline justify-between gap-3 border-b pb-1.5 text-sm text-muted-foreground">
              <span>{tr("মালিক ও অংশের সূত্র", "Owner and how the share came")}</span>
              <span className="text-right">{tr("অবশিষ্ট অংশ (শতাংশ)", "Remaining (decimals)")}</span>
            </div>
            <ul>
              {owners.map((o, i) => {
                const b = basis[o.person];
                return (
                  <li key={o.person} className={cn("flex items-baseline justify-between gap-3 border-b py-1.5 last:border-b-0", o.person === sellerId && "bg-accent/50 font-semibold")}>
                    <span className="min-w-0 break-words">
                      <span className="mr-2 inline-block size-2.5 shrink-0 rounded-sm align-middle" style={{ background: OWNER_SHADES[i % OWNER_SHADES.length] }} aria-hidden="true" />
                      {tr.pick(state.people[o.person])}
                      {o.person === sellerId ? <span className="ml-2 text-sm font-normal text-muted-foreground">({tr("বিক্রেতা", "seller")})</span> : null}
                      {b && (
                        <span className="block pl-[1.125rem] text-xs font-normal text-muted-foreground">
                          {tr.pick(BASIS[b.basis])}
                          {b.deed ? ` · ${tr("দলিল", "deed")} ${tr.num(b.deed)}` : ""}
                        </span>
                      )}
                    </span>
                    <span className="num shrink-0 text-right">{tr.num(F.display(o.share))}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <Separator />
        <ServiceRows state={state} plotId={plotId} />
      </CardContent>
      <CardFooter className={cn("mt-auto gap-2 text-sm", exact ? "text-success" : "text-destructive")}>
        {exact ? <CheckIcon className="size-4 shrink-0" strokeWidth={2.5} aria-hidden="true" /> : <TriangleAlertIcon className="size-4 shrink-0" aria-hidden="true" />}
        <span>
          {exact
            ? tr(`সব অংশ মিলে ঠিক ${tr.num(F.display(plot.total))} শতাংশ (ভগ্নাংশে হিসাব, কোনো রাউন্ডিং নেই)`, `Shares add up to exactly ${F.display(plot.total)} decimals (kept as fractions, no rounding)`)
            : tr("অংশের যোগফল মিলছে না", "Shares do not add up")}
        </span>
      </CardFooter>
    </Card>
  );
}
