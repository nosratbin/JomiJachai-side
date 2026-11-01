"use client";
import { useState } from "react";
import { WavesIcon, CheckIcon, ArrowRightIcon, FlagIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { api, useRegister } from "@/lib/api";
import { ownersOf } from "@/lib/register";
import { EROSION_STEPS, erosionOf, cardOf } from "@/lib/land-services";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "../brand";
import LandMap from "../LandMap";
import { AreaScope, inArea } from "./AreaScope";
import { useDuty, dagName, dec, run } from "./services";

// The six steps, done ones ticked with their date, the current one ringed.
function Timeline({ e }) {
  const tr = useT();
  return (
    <ol className="flex flex-col gap-0">
      {EROSION_STEPS.map((s, i) => {
        const done = i <= e.step;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < EROSION_STEPS.length - 1 && <span className={cn("absolute top-7 left-3.5 h-[calc(100%-1.75rem)] w-0.5", i < e.step ? "bg-primary" : "bg-border")} aria-hidden="true" />}
            <span className={cn("relative inline-flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold", done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
              {done ? <CheckIcon className="size-4" strokeWidth={3} aria-hidden="true" /> : tr.num(i + 1)}
            </span>
            <span className="flex min-w-0 flex-col pt-0.5">
              <span className={cn("leading-snug", done ? "font-semibold" : "text-muted-foreground")}>{tr.pick(s)}</span>
              {done && <span className="text-xs text-muted-foreground">{tr.date(e.dates[i])}</span>}
              {i === 5 && done && e.rehab && <span className="mt-1 text-sm">{tr.pick(e.rehab)}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CaseCard({ state, plotId }) {
  const tr = useT();
  const { officer, role } = useDuty();
  const e = erosionOf(state, plotId);
  const plot = state.plots[plotId];
  const [rehab, setRehab] = useState("");
  const [busy, setBusy] = useState(false);
  const next = EROSION_STEPS[e.step + 1];
  const allowed = next && next.roles.includes(role);
  const families = ownersOf(state, plotId);

  async function advance() {
    setBusy(true);
    const ok = await run(() => api.advanceErosion(plotId, officer, { rehab }), () => tr(`দাগ ${tr.num(plot.dag)}: ${next.bn}`, `Dag ${plot.dag}: ${next.en}`));
    setBusy(false);
    if (ok) setRehab("");
  }

  return (
    <Card id={"erosion-" + plotId} className="gap-0 py-0">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {dagName(tr, plot)}
          <Badge variant={e.step >= 5 ? "success" : e.step >= 4 ? "info" : "warning"}>{tr.pick(EROSION_STEPS[e.step])}</Badge>
        </CardTitle>
        <CardDescription>
          {tr(`${tr.num(e.year)} সালে নদীতে বিলীন · ${tr.num(plot.total)} শতাংশ`, `Lost to the river in ${e.year} · ${plot.total} decimals`)}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5 py-5 md:grid-cols-[1fr_minmax(0,16rem)]">
        <Timeline e={e} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-semibold">{tr("ক্ষতিগ্রস্ত পরিবার", "Families affected")}</p>
          <ul className="flex flex-col gap-1.5">
            {families.map((o) => {
              const card = cardOf(state, o.person);
              return (
                <li key={o.person} className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    {tr.pick(state.people[o.person])}
                    {card && <span className="text-muted-foreground"> · {tr(`কার্ড ${tr.num(card)}`, `card ${card}`)}</span>}
                  </span>
                  <span className="num shrink-0">{dec(tr, o.share)}</span>
                </li>
              );
            })}
          </ul>
          <p className="text-xs text-muted-foreground">{tr("ধাপ ২ থেকে বিক্রি বন্ধ আর কর মওকুফ।", "From step 2, sales stop and tax is waived.")}</p>
        </div>
      </CardContent>
      {next && (
        <CardFooter className="flex-col items-stretch gap-3 bg-card">
          {e.step + 1 === 5 && allowed && (
            <Field>
              <FieldLabel htmlFor={"rehab-" + plotId}>{tr("কীভাবে পুনর্বাসন হলো", "How the family was rehabilitated")}</FieldLabel>
              <Textarea id={"rehab-" + plotId} rows={2} value={rehab} onChange={(ev) => setRehab(ev.target.value)} placeholder={tr("যেমন: আশ্রয়ণ প্রকল্পে ঘর ও ৫০ শতাংশ খাস জমি", "e.g. a house in the Ashrayan project and 50 decimals of khas land")} />
            </Field>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {allowed
                ? tr(`পরের ধাপ: ${next.bn}`, `Next step: ${next.en}`)
                : tr(`পরের ধাপ (${next.bn}) করবেন ${next.roles.includes("land") ? "ভূমি অফিস, ইউএনও বা ম্যাজিস্ট্রেট" : "ইউএনও"}`, `Next step (${next.en}) is for ${next.roles.includes("land") ? "the land office, a UNO or a magistrate" : "a UNO"}`)}
            </p>
            <Button size="sm" disabled={!allowed || busy || (e.step + 1 === 5 && !rehab.trim())} onClick={advance}>
              <ArrowRightIcon data-icon="inline-start" />
              {tr("ধাপ সম্পন্ন করুন", "Mark step done")}
            </Button>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}

function FlagDag({ state }) {
  const tr = useT();
  const { officer, area, role } = useDuty();
  const choices = Object.keys(state.plots).filter((id) => inArea(state, id, area) && !state.plots[id].flags.khas && !erosionOf(state, id));
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);
  const can = EROSION_STEPS[0].roles.includes(role);
  async function flag() {
    setBusy(true);
    const ok = await run(() => api.advanceErosion(pick, officer), () => tr("নতুন নদীভাঙন কেস খোলা হলো", "New river-erosion case opened"));
    setBusy(false);
    if (ok) setPick("");
  }
  return (
    <Card className="gap-0 pt-0">
      <CardHeader className="bg-secondary py-4">
        <CardTitle className="text-primary">{tr("নতুন দাগ চিহ্নিত করুন", "Flag a new dag")}</CardTitle>
        <CardDescription className="text-foreground/75">{tr("স্যাটেলাইট ছবিতে দাগটি পানিতে দেখা গেলে কেস খুলুন; তখন বিক্রির আবেদনে সতর্কতা দেখাবে।", "Open a case when satellite images show the dag under water; sale applications then show a warning.")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pt-5 sm:flex-row sm:items-end">
        <Field className="flex-1">
          <FieldLabel htmlFor="erosion-new">{tr("দাগ", "Dag")}</FieldLabel>
          <NativeSelect id="erosion-new" className="w-full" value={pick} onChange={(e) => setPick(e.target.value)} disabled={!can}>
            <NativeSelectOption value="">{tr("দাগ বেছে নিন", "Choose a dag")}</NativeSelectOption>
            {choices.map((id) => (
              <NativeSelectOption key={id} value={id}>
                {dagName(tr, state.plots[id])}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {!can && <FieldDescription>{tr("ভূমি অফিস, ইউএনও বা ম্যাজিস্ট্রেট দাগ চিহ্নিত করেন।", "The land office, a UNO or a magistrate flags dags.")}</FieldDescription>}
        </Field>
        <Button onClick={flag} disabled={!can || !pick || busy}>
          <FlagIcon data-icon="inline-start" />
          {tr("কেস খুলুন", "Open case")}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Erosion() {
  const tr = useT();
  const state = useRegister();
  const { area } = useDuty();
  const [all, setAll] = useState(false);
  const cases = Object.keys(state.erosion || {}).sort((a, b) => state.erosion[a].step - state.erosion[b].step);
  const shown = all ? cases : cases.filter((id) => inArea(state, id, area));
  const jump = (id) => {
    if (!inArea(state, id, area)) setAll(true);
    setTimeout(() => document.getElementById("erosion-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("নদীভাঙন: শনাক্ত, যাচাই ও পুনর্বাসন", "River erosion: find, verify, rehabilitate")}
        description={tr(
          "নদীতে জমি হারানো পরিবারকে ছয় ধাপে শনাক্ত করা হয়। প্রতিটি ধাপ কে কবে করলেন তা কার্যলিপিতে থাকে, তাই ভুয়া দাবি বা বাদ পড়া পরিবার সহজে ধরা পড়ে। যাচাই আর পুনর্বাসন করেন ইউএনও।",
          "Families who lost land to the river are identified in six steps. Who did each step and when goes into the activity log, so false claims and missed families are easy to spot. A UNO verifies and rehabilitates."
        )}
      />
      <section className="flex flex-col gap-3" aria-label={tr("ম্যাপ", "Map")}>
        <LandMap state={state} selected={shown[0] || cases[0]} onSelect={(id) => state.erosion[id] && jump(id)} />
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-block h-3 w-6 rounded-sm border-2 border-dashed border-[var(--map-river)] bg-[var(--map-river)]/25" aria-hidden="true" />
          {tr("নীল ডোরাকাটা দাগ = নদীতে বিলীন (ধাপ ২ বা পরে)", "Blue dashed dags = lost to the river (step 2 or later)")}
        </p>
      </section>
      <FlagDag state={state} />
      <section className="flex flex-col gap-4" aria-labelledby="erosion-cases">
        <h2 id="erosion-cases" className="flex items-center gap-2 text-xl font-bold text-primary">
          <WavesIcon className="size-5" aria-hidden="true" />
          {tr("কেস", "Cases")}
        </h2>
        <AreaScope all={all} setAll={setAll} shown={shown.length} total={cases.length} noun={{ bn: "কেস", en: "cases" }} />
        {shown.length ? shown.map((id) => <CaseCard key={id} state={state} plotId={id} />) : <p className="rounded-lg bg-card px-4 py-4 text-muted-foreground">{tr("এই এলাকায় কোনো কেস নেই।", "No cases in this area.")}</p>}
      </section>
    </div>
  );
}
