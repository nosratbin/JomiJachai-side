"use client";
import { useState } from "react";
import { HomeIcon, SproutIcon, CheckIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { api, useRegister } from "@/lib/api";
import { ownersOf, findPerson } from "@/lib/register";
import { khasOn, khasFree, khasChecks, borgaOn, KHAS_LIMIT } from "@/lib/land-services";
import * as F from "@/lib/fraction";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, GREEN_HEAD, StatusIcon } from "../brand";
import { AreaScope, inArea } from "./AreaScope";
import { useDuty, RoleNotice, dagName, dec, run } from "./services";

const parseOr = (s) => {
  try {
    return F.parse(s);
  } catch {
    return null;
  }
};

function PeopleList({ state, id }) {
  const tr = useT();
  return (
    <datalist id={id}>
      {Object.entries(state.people).map(([pid, p]) => (
        <option key={pid} value={tr.pick(p)} />
      ))}
    </datalist>
  );
}

function Decimals({ id, value, onChange }) {
  const tr = useT();
  return (
    <InputGroup>
      <InputGroupInput id={id} className="num" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={tr("যেমন: ২৫", "e.g. 25")} autoComplete="off" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{tr("শতাংশ", "decimals")}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

// ---- Khas land ----
function SettleForm({ state, plots }) {
  const tr = useT();
  const { officer, role } = useDuty();
  const [plot, setPlot] = useState(plots[0] || "");
  const [family, setFamily] = useState("");
  const [decimals, setDecimals] = useState("");
  const [busy, setBusy] = useState(false);
  if (role !== "uno") return <RoleNotice roles={["uno"]} title={tr("শুধু ইউএনও খাস জমি বন্দোবস্ত দেন", "Only a UNO settles khas land")} />;
  if (!plots.length) return null;

  const person = findPerson(state, family);
  const { checks, ok } = khasChecks(state, { plot: plot || plots[0], person, decimals });
  const ready = ok && family.trim().length > 1 && parseOr(decimals);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const k = await run(() => api.settleKhas({ plot, familyName: family, decimals }, officer), (k) => tr(`বন্দোবস্ত ${k.id} নথিভুক্ত; কৃষক কার্ডও দেওয়া হলো`, `Settlement ${k.id} recorded; a Krishak Card was issued too`));
    setBusy(false);
    if (k) {
      setFamily("");
      setDecimals("");
    }
  }

  return (
    <Card className="gap-0 pt-0">
      <CardHeader className="bg-secondary py-4">
        <CardTitle className="text-primary">{tr("খাস জমি বন্দোবস্ত", "Settle khas land")}</CardTitle>
        <CardDescription className="text-foreground/75">{tr(`ভূমিহীন কৃষক পরিবারকে চাষের জন্য, পরিবারপ্রতি সর্বোচ্চ ${KHAS_LIMIT} শতাংশ (১ একর)`, `To a landless farming family to farm, up to ${KHAS_LIMIT} decimals (1 acre) per family`)}</CardDescription>
      </CardHeader>
      <form onSubmit={submit} noValidate>
        <CardContent className="pt-5">
          <FieldGroup className="sm:grid sm:grid-cols-3">
            <Field>
              <FieldLabel htmlFor="khas-plot">{tr("খাস দাগ", "Khas dag")}</FieldLabel>
              <NativeSelect id="khas-plot" className="w-full" value={plot} onChange={(e) => setPlot(e.target.value)}>
                {plots.map((id) => (
                  <NativeSelectOption key={id} value={id}>
                    {dagName(tr, state.plots[id])} ({tr(`খালি ${dec(tr, khasFree(state, id))}`, `${F.display(khasFree(state, id))} free`)})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="khas-family">{tr("পরিবারপ্রধানের নাম", "Head of family")}</FieldLabel>
              <Input id="khas-family" list="khas-people" value={family} onChange={(e) => setFamily(e.target.value)} placeholder={tr("যেমন: রাহেলা খাতুন", "e.g. Rahela Khatun")} autoComplete="off" />
              <PeopleList state={state} id="khas-people" />
            </Field>
            <Field>
              <FieldLabel htmlFor="khas-dec">{tr("পরিমাণ", "Area")}</FieldLabel>
              <Decimals id="khas-dec" value={decimals} onChange={setDecimals} />
            </Field>
          </FieldGroup>
          <ul className="mt-5 flex flex-col gap-2" aria-live="polite" aria-label={tr("যাচাই", "Checks")}>
            {checks.map((c, i) => (
              <li key={i} className="flex items-start gap-3">
                <StatusIcon status={c.status} className="size-6" />
                <span className="pt-0.5">{tr.num(tr.pick(c))}</span>
              </li>
            ))}
            {!person && family.trim() && <li className="pl-9 text-sm text-muted-foreground">{tr("নতুন নাম: রেজিস্টারে এই পরিবারের কোনো জমি নেই।", "New name: this family has no land in the register.")}</li>}
          </ul>
        </CardContent>
        <CardFooter className="mt-5 justify-end bg-card">
          <Button type="submit" disabled={!ready || busy}>
            <CheckIcon data-icon="inline-start" />
            {tr("বন্দোবস্ত দিন", "Settle")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function KhasTab({ state, all, setAll }) {
  const tr = useT();
  const { area } = useDuty();
  const khas = Object.keys(state.plots).filter((id) => state.plots[id].flags.khas);
  const shown = all ? khas : khas.filter((id) => inArea(state, id, area));
  return (
    <div className="flex flex-col gap-6">
      <AreaScope all={all} setAll={setAll} shown={shown.length} total={khas.length} noun={{ bn: "খাস দাগ", en: "khas dags" }} />
      <SettleForm key={shown.join()} state={state} plots={shown} />
      {shown.map((id) => {
        const plot = state.plots[id];
        const list = khasOn(state, id);
        return (
          <Card key={id} className="py-0">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b px-5 py-4">
              <h3 className="text-lg font-bold">{dagName(tr, plot)}</h3>
              <p className="text-sm text-muted-foreground">
                {tr(`মোট ${dec(tr, plot.total)} · বন্দোবস্ত ${dec(tr, F.sub(F.parse(plot.total), khasFree(state, id)))} · খালি ${dec(tr, khasFree(state, id))} শতাংশ`, `Total ${plot.total} · settled ${F.display(F.sub(F.parse(plot.total), khasFree(state, id)))} · free ${F.display(khasFree(state, id))} decimals`)}
              </p>
            </div>
            {list.length ? (
              <Table>
                <TableHeader className={GREEN_HEAD}>
                  <TableRow className={GREEN_HEAD}>
                    <TableHead className="pl-5">{tr("বন্দোবস্ত", "Settlement")}</TableHead>
                    <TableHead>{tr("পরিবার", "Family")}</TableHead>
                    <TableHead>{tr("তারিখ", "Date")}</TableHead>
                    <TableHead className="pr-5 text-right">{tr("শতাংশ", "Decimals")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((k) => (
                    <TableRow key={k.id}>
                      <TableCell className="mono pl-5 text-sm">{k.id}</TableCell>
                      <TableCell>{tr.pick(state.people[k.family])}</TableCell>
                      <TableCell className="text-sm">{tr.date(k.date)}</TableCell>
                      <TableCell className="num pr-5 text-right">{dec(tr, k.decimals)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="px-5 py-4 text-muted-foreground">{tr("এখনো কোনো বন্দোবস্ত নেই।", "No settlements yet.")}</p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---- Borga ----
function BorgaForm({ state, plots }) {
  const tr = useT();
  const { officer, role } = useDuty();
  const [plot, setPlot] = useState(plots[0] || "");
  const owners = plot ? ownersOf(state, plot) : [];
  const [owner, setOwner] = useState(owners[0]?.person || "");
  const [bargadar, setBargadar] = useState("");
  const [decimals, setDecimals] = useState("");
  const [busy, setBusy] = useState(false);
  if (!["land", "uno"].includes(role)) return <RoleNotice roles={["land", "uno"]} title={tr("শুধু ভূমি অফিস বা ইউএনও বর্গা চুক্তি নথিভুক্ত করেন", "Only the land office or a UNO records borga agreements")} />;
  if (!plots.length) return null;

  const share = owners.find((o) => o.person === owner)?.share;
  const free = share ? F.sub(share, F.sum(borgaOn(state, plot).filter((b) => b.owner === owner).map((b) => F.parse(b.decimals)))) : F.ZERO;
  const qty = parseOr(decimals);
  const tooMuch = qty && F.cmp(qty, free) > 0;
  const ready = owner && bargadar.trim() && qty && F.cmp(qty, F.ZERO) > 0 && !tooMuch && findPerson(state, bargadar) !== owner;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    const b = await run(() => api.recordBorga({ plot, owner, bargadarName: bargadar, decimals }, officer), (b) => tr(`বর্গা চুক্তি ${b.id} নথিভুক্ত`, `Borga agreement ${b.id} recorded`));
    setBusy(false);
    if (b) {
      setBargadar("");
      setDecimals("");
    }
  }

  return (
    <Card className="gap-0 pt-0">
      <CardHeader className="bg-secondary py-4">
        <CardTitle className="text-primary">{tr("বর্গা চুক্তি নথিভুক্ত করুন", "Record a borga agreement")}</CardTitle>
        <CardDescription className="text-foreground/75">{tr("লিখিত চুক্তি থাকলে বর্গাদার উচ্ছেদ থেকে সুরক্ষা আর অধিগ্রহণে ফসলের ক্ষতিপূরণ পান।", "A written agreement protects the bargadar from eviction and secures crop compensation if the land is acquired.")}</CardDescription>
      </CardHeader>
      <form onSubmit={submit} noValidate>
        <CardContent className="pt-5">
          <FieldGroup className="sm:grid sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="borga-plot">{tr("দাগ", "Dag")}</FieldLabel>
              <NativeSelect
                id="borga-plot"
                className="w-full"
                value={plot}
                onChange={(e) => {
                  setPlot(e.target.value);
                  setOwner(ownersOf(state, e.target.value)[0]?.person || "");
                }}
              >
                {plots.map((id) => (
                  <NativeSelectOption key={id} value={id}>
                    {dagName(tr, state.plots[id])}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="borga-owner">{tr("মালিক", "Owner")}</FieldLabel>
              <NativeSelect id="borga-owner" className="w-full" value={owner} onChange={(e) => setOwner(e.target.value)}>
                {owners.map((o) => (
                  <NativeSelectOption key={o.person} value={o.person}>
                    {tr.pick(state.people[o.person])} ({tr.num(F.display(o.share))})
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor="borga-name">{tr("বর্গাদারের নাম", "Bargadar's name")}</FieldLabel>
              <Input id="borga-name" list="borga-people" value={bargadar} onChange={(e) => setBargadar(e.target.value)} placeholder={tr("যেমন: কালাম শেখ", "e.g. Kalam Sheikh")} autoComplete="off" />
              <PeopleList state={state} id="borga-people" />
            </Field>
            <Field data-invalid={tooMuch || undefined}>
              <FieldLabel htmlFor="borga-dec">{tr("পরিমাণ", "Area")}</FieldLabel>
              <Decimals id="borga-dec" value={decimals} onChange={setDecimals} />
              <FieldDescription className={tooMuch ? "text-destructive" : undefined}>{tr(`মালিকের ${dec(tr, free)} শতাংশ এখনো বর্গায় দেওয়া হয়নি`, `${F.display(free)} decimals of the owner's share are not on borga yet`)}</FieldDescription>
            </Field>
          </FieldGroup>
        </CardContent>
        <CardFooter className="mt-5 justify-end bg-card">
          <Button type="submit" disabled={!ready || busy}>
            <CheckIcon data-icon="inline-start" />
            {tr("চুক্তি নথিভুক্ত করুন", "Record agreement")}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

function BorgaTab({ state, all, setAll }) {
  const tr = useT();
  const { area } = useDuty();
  const list = Object.values(state.borga || {}).sort((a, b) => (a.since < b.since ? 1 : -1));
  const shown = all ? list : list.filter((b) => inArea(state, b.plot, area));
  const plots = Object.keys(state.plots).filter((id) => inArea(state, id, area) && !state.plots[id].flags.khas && ownersOf(state, id).length);
  return (
    <div className="flex flex-col gap-6">
      <BorgaForm key={area} state={state} plots={plots} />
      <AreaScope all={all} setAll={setAll} shown={shown.length} total={list.length} noun={{ bn: "চুক্তি", en: "agreements" }} />
      <Card className="py-0">
        <Table className="min-w-[640px]">
          <TableHeader className={GREEN_HEAD}>
            <TableRow className={GREEN_HEAD}>
              <TableHead className="pl-5">{tr("চুক্তি", "Agreement")}</TableHead>
              <TableHead>{tr("দাগ", "Dag")}</TableHead>
              <TableHead>{tr("মালিক", "Owner")}</TableHead>
              <TableHead>{tr("বর্গাদার", "Bargadar")}</TableHead>
              <TableHead>{tr("কবে থেকে", "Since")}</TableHead>
              <TableHead className="pr-5 text-right">{tr("শতাংশ", "Decimals")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="mono pl-5 text-sm">{b.id}</TableCell>
                <TableCell>{dagName(tr, state.plots[b.plot])}</TableCell>
                <TableCell>{tr.pick(state.people[b.owner])}</TableCell>
                <TableCell className="font-semibold">{tr.pick(state.people[b.bargadar])}</TableCell>
                <TableCell className="text-sm">{tr.date(b.since)}</TableCell>
                <TableCell className="num pr-5 text-right">{dec(tr, b.decimals)}</TableCell>
              </TableRow>
            ))}
            {!shown.length && (
              <TableRow>
                <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                  {tr("এই এলাকায় কোনো বর্গা চুক্তি নেই।", "No borga agreements in this area.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function KhasBorga() {
  const tr = useT();
  const state = useRegister();
  const [all, setAll] = useState(false);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("খাস জমি ও বর্গা", "Khas land & borga")}
        description={tr(
          "সরকারি খাস কৃষিজমি যায় ভূমিহীন পরিবারের কাছে, আর নথিভুক্ত বর্গা চুক্তি বর্গাদারকে সুরক্ষা দেয়। দুটোই কৃষক কার্ডে দেখায়।",
          "Government khas farmland goes to landless families, and a recorded borga agreement protects the bargadar. Both show on the Krishak Card."
        )}
      />
      <Tabs defaultValue="khas" className="gap-6">
        <TabsList className="h-11">
          <TabsTrigger value="khas" className="px-4">
            <HomeIcon data-icon="inline-start" />
            {tr("খাস জমি", "Khas land")}
          </TabsTrigger>
          <TabsTrigger value="borga" className="px-4">
            <SproutIcon data-icon="inline-start" />
            {tr("বর্গা চাষ", "Borga")}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="khas">
          <KhasTab state={state} all={all} setAll={setAll} />
        </TabsContent>
        <TabsContent value="borga">
          <BorgaTab state={state} all={all} setAll={setAll} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
