"use client";
import { useState, useMemo, useEffect } from "react";
import { SendIcon, CheckIcon, PrinterIcon, PlusIcon, OctagonXIcon, TriangleAlertIcon, CircleCheckIcon, PencilIcon, LockIcon, UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { usePrefs } from "@/lib/store";
import { api, useRegister } from "@/lib/api";
import { ownersOf, findPerson, officerName } from "@/lib/register";
import { saleNotes } from "@/lib/land-services";
import * as F from "@/lib/fraction";
import { go } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "../brand";
import PlotRecord from "./PlotRecord";
import { DeedPaper } from "./Deeds";

// Not rules: who must be told about this sale, and agreements that go with the land.
function SaleNotes({ state, notes, after = false, className }) {
  const tr = useT();
  const name = (id) => tr.pick(state.people[id]);
  if (!notes.coSharers.length && !notes.borga.length) return null;
  const pre = notes.coSharers.filter((c) => c.preempt);
  return (
    <Alert variant="info" className={className}>
      <UsersIcon />
      <AlertTitle>{after ? tr("এই বিক্রির নোটিশ পাঠানো হবে", "Notices for this sale") : tr("নিবন্ধনের পর নোটিশ যাবে", "Notices after registration")}</AlertTitle>
      <AlertDescription>
        <ul className="flex flex-col gap-1.5">
          {notes.coSharers.length > 0 && (
            <li>
              {tr("শরিকদের জানানো হবে: ", "Co-sharers to be told: ")}
              <span className="font-semibold text-foreground">{notes.coSharers.map((c) => name(c.person)).join(", ")}</span>
            </li>
          )}
          {pre.length > 0 && (
            <li>
              {tr(
                `ক্রেতা শরিক নন, তাই উত্তরাধিকারসূত্রে শরিক ${pre.map((c) => name(c.person)).join(", ")} নোটিশ পাওয়ার ২ মাসের মধ্যে অগ্রক্রয়ের আবেদন করতে পারেন (দাম + ২৫% + বছরে ৮% জমা দিয়ে)।`,
                `The buyer is not a co-sharer, so co-sharers by inheritance (${pre.map((c) => name(c.person)).join(", ")}) may apply for pre-emption within 2 months of the notice (by depositing the price + 25% + 8% a year).`
              )}
            </li>
          )}
          {notes.borga.map((b) => (
            <li key={b.id}>
              {tr(
                `বর্গা চুক্তি ${b.id} (${F.display(F.parse(b.decimals))} শতাংশ, বর্গাদার ${state.people[b.bargadar].bn}) জমির সঙ্গে থাকবে; ক্রেতাকে জানানো হবে।`,
                `Borga agreement ${b.id} (${F.display(F.parse(b.decimals))} decimals, bargadar ${state.people[b.bargadar].en}) stays with the land; the buyer is told.`
              )}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default function RegisterSale() {
  const tr = useT();
  const { officer, area } = usePrefs();
  const canRegister = (officerName(officer)?.role || "subreg") === "subreg";
  const state = useRegister();
  const plotIds = Object.keys(state.plots).filter((id) => !area || state.plots[id].mouza.en === area);

  const [plotId, setPlotId] = useState("245");
  const [seller, setSeller] = useState("karim");
  useEffect(() => {
    if (plotIds.length && !plotIds.includes(plotId)) {
      setPlotId(plotIds[0]);
      setSeller(ownersOf(state, plotIds[0])[0]?.person || "");
    }
  }, [area]);
  const [buyerName, setBuyerName] = useState("");
  const [decimals, setDecimals] = useState("");
  const [outcome, setOutcome] = useState(null);
  const [error, setError] = useState(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [notes, setNotes] = useState(null);

  const owners = ownersOf(state, plotId);
  const others = Object.keys(state.people).filter((p) => !owners.some((o) => o.person === p));
  const edit = () => {
    setOutcome(null);
    setAck(false);
    setError(null);
  };
  const qty = useMemo(() => {
    try {
      return F.parse(decimals);
    } catch {
      return null;
    }
  }, [decimals]);
  const input = { plot: plotId, seller, decimals, buyerName };

  async function register() {
    const n = saleNotes(state, input);
    setDone(await api.registerSale(input, officer));
    setNotes(n);
    setOutcome(null);
  }

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!qty || F.cmp(qty, F.ZERO) <= 0) return setError({ field: "decimals", text: tr("বিক্রির পরিমাণ শতাংশে লিখুন, যেমন ২০ বা ০.৫", "Enter the amount sold in decimals, for example 20 or 0.5") });
    if (!buyerName.trim()) return setError({ field: "buyer", text: tr("ক্রেতার নাম লিখুন", "Enter the buyer's name") });
    if (findPerson(state, buyerName) === seller) return setError({ field: "buyer", text: tr("ক্রেতা ও বিক্রেতা একই ব্যক্তি হতে পারেন না", "The buyer and seller cannot be the same person") });
    setBusy(true);
    try {
      const check = await api.runChecks(input, officer);
      if (check.verdict === "clear") await register();
      else {
        setOutcome(check);
        setAck(false);
      }
    } catch (err) {
      toast.error(String(err.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function registerAfterReview() {
    setBusy(true);
    try {
      await register();
    } catch (err) {
      setError({ field: "form", text: String(err.message || err) });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={
            <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <span className="stamp stamp-in text-xl text-success">{tr("অনুমোদিত", "APPROVED")}</span>
              <span>
                {tr("দলিল", "Deed")} {tr.num(done.no)}
              </span>
            </span>
          }
          actions={
            <>
              <Button onClick={() => go("deed-" + done.no)}>
                <PrinterIcon data-icon="inline-start" />
                {tr("দলিল দেখুন ও প্রিন্ট করুন", "View and print deed")}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setDone(null);
                  setDecimals("");
                  setBuyerName("");
                  edit();
                }}
              >
                <PlusIcon data-icon="inline-start" />
                {tr("আরেকটি বিক্রি", "Register another sale")}
              </Button>
            </>
          }
        />
        <Alert variant="success" className="bg-card">
          <CircleCheckIcon />
          <AlertTitle>{tr("আবেদন অনুমোদিত, দলিল নিবন্ধিত", "Application approved, deed registered")}</AlertTitle>
          <AlertDescription>
            {tr("সব মালিকের অংশ হালনাগাদ হয়েছে, দলিলের ডিজিটাল ছাপ তৈরি হয়েছে, আর কার্যলিপিতে লেখা হয়েছে।", "Every owner's share was updated, the deed's digital fingerprint was created, and the step was written to the activity log.")}
          </AlertDescription>
        </Alert>
        {notes && <SaleNotes state={state} notes={notes} after />}
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <DeedPaper deed={done} state={state} />
          <PlotRecord state={state} plotId={done.plot} />
        </div>
      </div>
    );
  }

  const blocked = outcome?.verdict === "blocked";
  const reasons = outcome ? outcome.rules.filter((r) => r.status === (blocked ? "fail" : "warn")) : [];
  const showSelling = qty && !F.isZero(qty) && owners.some((o) => o.person === seller) && !blocked;
  const locked = !!outcome || busy;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("নতুন বিক্রি নিবন্ধন", "Register a sale")}
        description={tr("বিক্রির তথ্য দিয়ে আবেদন জমা দিন। জমা দিলেই ফলাফল দেখাবে: অনুমোদিত, নামঞ্জুর, বা অফিসারের সিদ্ধান্ত প্রয়োজন।", "Fill in the sale and submit the application. The result shows at once: approved, refused, or needs your decision.")}
      />

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Card className="gap-0 pt-0">
            <CardHeader className="bg-secondary py-4">
              <CardTitle className="text-primary">{tr("বিক্রির আবেদন", "Sale application")}</CardTitle>
              <CardDescription className="text-foreground/75">{tr("দাগ, বিক্রেতা, ক্রেতা ও বিক্রয় পরিমাণ", "Plot, seller, buyer and amount")}</CardDescription>
            </CardHeader>
            <form onSubmit={submit} noValidate>
              <CardContent className="pt-5">
                <fieldset disabled={locked} className="contents">
                  <FieldGroup className="sm:grid sm:grid-cols-2">
                    <Field>
                      <FieldLabel htmlFor="sale-plot">{tr("দাগ নম্বর", "Dag number")}</FieldLabel>
                      <NativeSelect
                        id="sale-plot"
                        className="w-full"
                        value={plotId}
                        onChange={(e) => {
                          setPlotId(e.target.value);
                          setSeller(ownersOf(state, e.target.value)[0]?.person || "");
                        }}
                      >
                        {plotIds.map((id) => (
                          <NativeSelectOption key={id} value={id}>
                            {tr("দাগ", "Dag")} {tr.num(state.plots[id].dag)} · {tr.pick(state.plots[id].mouza)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="sale-seller">{tr("বিক্রেতা (দাতা)", "Seller")}</FieldLabel>
                      <NativeSelect id="sale-seller" className="w-full" value={seller} onChange={(e) => setSeller(e.target.value)}>
                        <NativeSelectOptGroup label={tr("এই দাগের মালিক", "Owners of this dag")}>
                          {owners.map((o) => (
                            <NativeSelectOption key={o.person} value={o.person}>
                              {tr.pick(state.people[o.person])} ({tr.num(F.display(o.share))})
                            </NativeSelectOption>
                          ))}
                        </NativeSelectOptGroup>
                        <NativeSelectOptGroup label={tr("অন্য ব্যক্তি (রেকর্ডে নেই)", "Someone else (not on record)")}>
                          {others.map((p) => (
                            <NativeSelectOption key={p} value={p}>
                              {tr.pick(state.people[p])}
                            </NativeSelectOption>
                          ))}
                        </NativeSelectOptGroup>
                      </NativeSelect>
                    </Field>
                    <Field data-invalid={error?.field === "buyer" || undefined}>
                      <FieldLabel htmlFor="sale-buyer">{tr("ক্রেতা (গ্রহীতা)", "Buyer")}</FieldLabel>
                      <Input
                        id="sale-buyer"
                        list="people-list"
                        value={buyerName}
                        placeholder={tr("যেমন: জামাল হোসেন", "e.g. Jamal Hossain")}
                        aria-invalid={error?.field === "buyer" || undefined}
                        onChange={(e) => setBuyerName(e.target.value)}
                        autoComplete="off"
                      />
                      <datalist id="people-list">
                        {Object.entries(state.people).map(([id, p]) => (
                          <option key={id} value={tr.pick(p)} />
                        ))}
                      </datalist>
                      {error?.field === "buyer" && <FieldError>{error.text}</FieldError>}
                    </Field>
                    <Field data-invalid={error?.field === "decimals" || undefined}>
                      <FieldLabel htmlFor="sale-decimals">{tr("বিক্রয়ের পরিমাণ", "Amount sold")}</FieldLabel>
                      <InputGroup>
                        <InputGroupInput
                          id="sale-decimals"
                          className="num text-lg"
                          inputMode="decimal"
                          value={decimals}
                          placeholder={tr("যেমন: ২০", "e.g. 20")}
                          aria-invalid={error?.field === "decimals" || undefined}
                          onChange={(e) => setDecimals(e.target.value)}
                          autoComplete="off"
                        />
                        <InputGroupAddon align="inline-end">
                          <InputGroupText>{tr("শতাংশ", "decimals")}</InputGroupText>
                        </InputGroupAddon>
                      </InputGroup>
                      {error?.field === "decimals" && <FieldError>{error.text}</FieldError>}
                    </Field>
                  </FieldGroup>
                </fieldset>
              </CardContent>
              {!outcome && (
                <CardFooter className="mt-5 flex-col items-stretch gap-3 bg-card sm:flex-row sm:items-center">
                  {!canRegister && (
                    <Alert className="order-last sm:order-none sm:flex-1">
                      <LockIcon />
                      <AlertTitle>{tr("শুধু সাব-রেজিস্ট্রার দলিল নিবন্ধন করেন", "Only a Sub-Registrar registers deeds")}</AlertTitle>
                      <AlertDescription>{tr("ওপরে “দায়িত্বরত কর্মকর্তা” হিসেবে একজন সাব-রেজিস্ট্রার বেছে নিন।", "Choose a Sub-Registrar as the officer on duty at the top.")}</AlertDescription>
                    </Alert>
                  )}
                  <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={busy || !canRegister}>
                    {busy ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                    {tr("আবেদন জমা দিন", "Submit application")}
                  </Button>
                </CardFooter>
              )}
            </form>
          </Card>

          {outcome && (
            <Card className={cn("gap-0 py-0", blocked ? "ring-destructive/40" : "ring-warning/40")} aria-live="polite">
              <div className={cn("flex flex-wrap items-center gap-4 px-5 py-5", blocked ? "bg-destructive/10" : "bg-cream")}>
                <span className={cn("stamp stamp-in text-xl", blocked ? "text-destructive" : "text-warning")}>{blocked ? tr("নামঞ্জুর", "REFUSED") : tr("সতর্কতা", "WARNING")}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <h2 className={cn("text-lg font-bold", blocked ? "text-destructive" : "text-warning")}>
                    {blocked ? tr("আবেদন নামঞ্জুর: এই বিক্রি নিবন্ধন করা যাবে না", "Application refused: this sale cannot be registered") : tr("নিবন্ধনের আগে আপনার সিদ্ধান্ত প্রয়োজন", "Your decision is needed before registration")}
                  </h2>
                </div>
              </div>
              <ul className="flex flex-col gap-3 px-5 py-5">
                {reasons.map((r) => {
                  const Icon = blocked ? OctagonXIcon : TriangleAlertIcon;
                  return (
                    <li key={r.id} className="flex gap-3 text-lg">
                      <Icon className={cn("mt-1 size-5 shrink-0", blocked ? "text-destructive" : "text-warning")} aria-hidden="true" />
                      <span className="font-semibold">{tr.num(tr.pick(r.detail))}</span>
                    </li>
                  );
                })}
              </ul>
              {!blocked && <SaleNotes state={state} notes={saleNotes(state, input)} className="mx-5 mb-5" />}
              {error?.field === "form" && (
                <Alert variant="destructive" className="mx-5 mb-5 w-auto">
                  <TriangleAlertIcon />
                  <AlertTitle>{error.text}</AlertTitle>
                </Alert>
              )}
              <CardFooter className="flex-wrap gap-3">
                {!blocked && (
                  <>
                    <Field orientation="horizontal" className="w-auto flex-1">
                      <Checkbox id="ack-warnings" checked={ack} onCheckedChange={(v) => setAck(v === true)} />
                      <FieldLabel htmlFor="ack-warnings" className="font-normal">
                        {tr("আমি সতর্কতাগুলো দেখেছি", "I have reviewed the warnings")}
                      </FieldLabel>
                    </Field>
                    <Button onClick={registerAfterReview} disabled={busy || !ack}>
                      {busy ? <Spinner data-icon="inline-start" /> : <CheckIcon data-icon="inline-start" />}
                      {tr("তবুও নিবন্ধন করুন", "Register anyway")}
                    </Button>
                  </>
                )}
                <Button variant="outline" className="bg-card" onClick={edit} disabled={busy}>
                  <PencilIcon data-icon="inline-start" />
                  {tr("আবেদন সংশোধন করুন", "Edit the application")}
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-3 xl:sticky xl:top-24">
          <PlotRecord state={state} plotId={plotId} selling={showSelling ? qty : null} sellerId={seller} />
          {showSelling && <p className="px-1 text-sm text-muted-foreground">{tr("ডোরাকাটা অংশটি এই বিক্রিতে হস্তান্তর হবে।", "The striped part is what this sale would transfer.")}</p>}
        </div>
      </div>
    </div>
  );
}
