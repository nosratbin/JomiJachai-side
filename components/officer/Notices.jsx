"use client";
import { useState } from "react";
import { MegaphoneIcon, SendIcon, LockIcon, TriangleAlertIcon, UsersIcon, CalendarClockIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { api, useRegister } from "@/lib/api";
import { ownersOf, dateKey } from "@/lib/register";
import { addDays, noticeOn, salesAfterNotice, borgaOn, isLost } from "@/lib/land-services";
import { go } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "../brand";
import { AreaScope, inArea } from "./AreaScope";
import { useDuty, RoleNotice, dagName, run } from "./services";

const ROLES_OK = ["uno", "magistrate"];

// Everyone a notice reaches on these dags: owners, and bargadars who farm them.
function peopleTold(state, plots) {
  const out = new Map();
  for (const id of plots) {
    for (const o of ownersOf(state, id)) out.set(o.person, { person: o.person, role: "owner" });
    for (const b of borgaOn(state, id)) if (!out.has(b.bargadar)) out.set(b.bargadar, { person: b.bargadar, role: "bargadar" });
  }
  return [...out.values()];
}

function NewNotice({ state }) {
  const tr = useT();
  const { officer, area, role } = useDuty();
  const today = dateKey();
  const [project, setProject] = useState("");
  const [plots, setPlots] = useState([]);
  const [freeze, setFreeze] = useState(addDays(today, 15));
  const [acquire, setAcquire] = useState(addDays(today, 200));
  const [busy, setBusy] = useState(false);
  const choices = Object.keys(state.plots).filter((id) => inArea(state, id, area) && !state.plots[id].flags.khas && !isLost(state, id));
  const told = peopleTold(state, plots);
  const ready = project.trim() && plots.length && freeze >= today && acquire >= addDays(today, 180);

  if (!ROLES_OK.includes(role)) return <RoleNotice roles={ROLES_OK} title={tr("শুধু ইউএনও বা নির্বাহী ম্যাজিস্ট্রেট নোটিশ জারি করেন", "Only a UNO or Executive Magistrate issues notices")} />;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const n = await run(
      () => api.issueNotice({ project, plots, freeze, acquire }, officer),
      (n) => tr(`নোটিশ ${n.id} জারি হলো; ${tr.num(told.length)} জনকে জানানো হলো`, `Notice ${n.id} issued; ${told.length} people told`)
    );
    setBusy(false);
    if (n) {
      setProject("");
      setPlots([]);
    }
  }

  return (
    <Card className="gap-0 pt-0">
      <CardHeader className="bg-secondary py-4">
        <CardTitle className="text-primary">{tr("নতুন আগাম নোটিশ", "New advance notice")}</CardTitle>
        <CardDescription className="text-foreground/75">{tr("প্রকল্প, দাগ আর দুটি তারিখ", "Project, dags and two dates")}</CardDescription>
      </CardHeader>
      <form onSubmit={submit} noValidate>
        <CardContent className="pt-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="aq-project">{tr("প্রকল্পের নাম", "Project name")}</FieldLabel>
              <Input id="aq-project" value={project} onChange={(e) => setProject(e.target.value)} placeholder={tr("যেমন: ইউনিয়ন সংযোগ সড়ক", "e.g. Union link road")} autoComplete="off" />
            </Field>
            <FieldSet>
              <FieldLegend variant="label">{tr("প্রস্তাবিত এলাকার দাগ", "Dags in the proposed area")}</FieldLegend>
              <FieldDescription>{tr("খাস জমি আর নদীতে বিলীন দাগ এখানে নেই।", "Khas land and dags lost to the river are not listed.")}</FieldDescription>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {choices.map((id) => {
                  const on = plots.includes(id);
                  const busyWith = noticeOn(state, id);
                  return (
                    <label
                      key={id}
                      className={cn("flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-2 ring-1 ring-border has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60", on && "bg-secondary ring-primary")}
                    >
                      <Checkbox checked={on} disabled={!!busyWith} onCheckedChange={(v) => setPlots((p) => (v === true ? [...p, id] : p.filter((x) => x !== id)))} />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="font-semibold">
                          {tr("দাগ", "Dag")} {tr.num(state.plots[id].dag)}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">{busyWith ? tr(`নোটিশ ${busyWith.id}`, `Notice ${busyWith.id}`) : tr.pick(state.plots[id].landType)}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
            </FieldSet>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="aq-freeze">{tr("যেদিন থেকে বিক্রি বন্ধ", "Sales stop from")}</FieldLabel>
                <Input id="aq-freeze" type="date" min={today} value={freeze} onChange={(e) => setFreeze(e.target.value)} />
                <FieldDescription>{tr("এর আগে বিক্রির আবেদনে সতর্কতা দেখাবে; এরপর আটকে যাবে।", "Before this date a sale gets a warning; after it, the sale is blocked.")}</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="aq-acquire">{tr("অধিগ্রহণ শুরু (অন্তত ৬ মাস পর)", "Acquisition starts (at least 6 months on)")}</FieldLabel>
                <Input id="aq-acquire" type="date" min={addDays(today, 180)} value={acquire} onChange={(e) => setAcquire(e.target.value)} />
                <FieldDescription>{tr("মালিকেরা আগে থেকে জানলে দালালের কাছে কম দামে বিক্রি করেন না।", "Owners who know early do not sell cheap to middlemen.")}</FieldDescription>
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-5 flex-col items-stretch gap-3 bg-card sm:flex-row sm:items-center">
          <p className="flex flex-1 items-center gap-2 text-sm text-muted-foreground">
            <UsersIcon className="size-4 shrink-0" aria-hidden="true" />
            {plots.length
              ? tr(`${tr.num(plots.length)}টি দাগ · ${tr.num(told.length)} জন মালিক ও বর্গাদারকে সরাসরি জানানো হবে`, `${plots.length} dag(s) · ${told.length} owners and bargadars will be told directly`)
              : tr("অন্তত একটি দাগ বেছে নিন", "Choose at least one dag")}
          </p>
          <Button type="submit" size="lg" disabled={!ready || busy}>
            {busy ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
            {tr("নোটিশ জারি করুন", "Issue notice")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function NoticeCard({ state, n }) {
  const tr = useT();
  const today = dateKey();
  const frozen = n.freeze <= today;
  const told = peopleTold(state, n.plots);
  const after = salesAfterNotice(state, n);
  return (
    <Card className="gap-0 py-0">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2 border-b px-5 py-4">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="mono text-sm text-muted-foreground">{n.id}</p>
          <h3 className="text-lg font-bold">{tr.pick(n.project)}</h3>
          <p className="text-sm text-muted-foreground">{n.plots.map((id) => dagName(tr, state.plots[id])).join(", ")}</p>
        </div>
        <Badge variant={frozen ? "destructive" : "warning"}>
          {frozen ? <LockIcon data-icon="inline-start" /> : <CalendarClockIcon data-icon="inline-start" />}
          {frozen ? tr("বিক্রি বন্ধ", "Sales stopped") : tr("বিক্রি বন্ধ হবে", "Sales stop soon")}
        </Badge>
      </div>
      <dl className="grid grid-cols-3 border-b text-sm">
        {[
          [tr("নোটিশ", "Notice"), n.date],
          [tr("বিক্রি বন্ধ", "Sales stop"), n.freeze],
          [tr("অধিগ্রহণ", "Acquisition"), n.acquire],
        ].map(([label, d]) => (
          <div key={label} className="flex flex-col gap-0.5 px-5 py-3">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-semibold">{tr.date(d)}</dd>
          </div>
        ))}
      </dl>
      <CardContent className="flex flex-col gap-3 py-4">
        <p className="text-sm font-semibold">{tr(`সরাসরি জানানো হয়েছে (${tr.num(told.length)} জন)`, `Told directly (${told.length})`)}</p>
        <ul className="flex flex-wrap gap-2">
          {told.map((t) => (
            <li key={t.person} className="rounded-full bg-muted px-3 py-1 text-sm">
              {tr.pick(state.people[t.person])}
              {t.role === "bargadar" && <span className="text-muted-foreground"> · {tr("বর্গাদার", "bargadar")}</span>}
            </li>
          ))}
        </ul>
        {after.length > 0 && (
          <Alert variant="warning">
            <TriangleAlertIcon />
            <AlertTitle>{tr(`নোটিশের পর ${tr.num(after.length)}টি বিক্রি`, `${after.length} sale(s) after the notice`)}</AlertTitle>
            <AlertDescription>
              {tr("ক্ষতিপূরণ দেওয়ার আগে এই দলিলগুলো দেখুন: দাম বাড়িয়ে দেখিয়ে বেশি ক্ষতিপূরণ নেওয়ার চেষ্টা হতে পারে।", "Review these deeds before paying compensation: the price may have been raised to claim more.")}{" "}
              {after.map((d, i) => (
                <span key={d.no}>
                  {i > 0 && ", "}
                  <button type="button" className="cursor-pointer font-semibold underline underline-offset-3" onClick={() => go("deed-" + d.no)}>
                    {tr.num(d.no)}
                  </button>
                </span>
              ))}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

export default function Notices() {
  const tr = useT();
  const state = useRegister();
  const { area } = useDuty();
  const [all, setAll] = useState(false);
  const list = Object.values(state.notices || {}).sort((a, b) => (a.date < b.date ? 1 : -1));
  const shown = all ? list : list.filter((n) => n.plots.some((id) => inArea(state, id, area)));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("অধিগ্রহণের আগাম নোটিশ", "Advance acquisition notices")}
        description={tr(
          "সরকার জমি নেওয়ার অন্তত ৬ মাস আগে নোটিশ দেয়। নোটিশ গেলে প্রতিটি মালিক ও বর্গাদার সরাসরি বার্তা পান, আর নির্দিষ্ট তারিখ থেকে ওই দাগের বিক্রি বন্ধ থাকে।",
          "The government gives notice at least 6 months before it takes land. Every owner and bargadar gets a message directly, and sales on those dags stop from a set date."
        )}
      />
      <NewNotice state={state} />
      <section className="flex flex-col gap-4" aria-labelledby="aq-list">
        <h2 id="aq-list" className="flex items-center gap-2 text-xl font-bold text-primary">
          <MegaphoneIcon className="size-5" aria-hidden="true" />
          {tr("জারি করা নোটিশ", "Notices issued")}
        </h2>
        <AreaScope all={all} setAll={setAll} shown={shown.length} total={list.length} noun={{ bn: "নোটিশ", en: "notices" }} />
        {shown.length ? shown.map((n) => <NoticeCard key={n.id} state={state} n={n} />) : <p className="rounded-lg bg-card px-4 py-4 text-muted-foreground">{tr("এই এলাকায় কোনো নোটিশ নেই।", "No notices in this area.")}</p>}
      </section>
    </div>
  );
}
