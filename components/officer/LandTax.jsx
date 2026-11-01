"use client";
import { useState } from "react";
import { ReceiptTextIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { api, useRegister } from "@/lib/api";
import { ownersOf } from "@/lib/register";
import { taxStatus, taxYear, taxYearLabel, TAX_ALERT_YEARS } from "@/lib/land-services";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, GREEN_HEAD } from "../brand";
import { AreaScope, inArea } from "./AreaScope";
import { taxText } from "../PlotSlip";
import { useDuty, RoleNotice, run } from "./services";

const ROLES_OK = ["land", "uno"];

function badgeOf(tr, t) {
  if (t.exempt) return ["secondary", tr("প্রযোজ্য নয়", "Exempt")];
  if (t.alert) return ["destructive", tr(`${tr.num(TAX_ALERT_YEARS)}+ বছর বকেয়া`, `${TAX_ALERT_YEARS}+ years overdue`)];
  if (t.overdue) return ["warning", tr("বকেয়া", "Overdue")];
  if (t.currentDue) return ["info", tr("এ বছরের কর বাকি", "This year due")];
  return ["success", tr("পরিশোধিত", "Paid")];
}

export default function LandTax() {
  const tr = useT();
  const state = useRegister();
  const { officer, area, role } = useDuty();
  const [all, setAll] = useState(false);
  const [filter, setFilter] = useState("due");
  const [busy, setBusy] = useState(null);
  const can = ROLES_OK.includes(role);
  const year = taxYear();

  const rows = Object.keys(state.plots)
    .filter((id) => !state.plots[id].flags.khas)
    .map((id) => ({ id, plot: state.plots[id], t: taxStatus(state, id) }));
  const inView = all ? rows : rows.filter((r) => inArea(state, r.id, area));
  const counts = {
    paid: inView.filter((r) => !r.t.exempt && !r.t.currentDue).length,
    due: inView.filter((r) => !r.t.exempt && r.t.currentDue).length,
    alert: inView.filter((r) => r.t.alert).length,
    exempt: inView.filter((r) => r.t.exempt).length,
  };
  const shown = inView
    .filter((r) => (filter === "alert" ? r.t.alert : filter === "due" ? !r.t.exempt && r.t.currentDue : true))
    .sort((a, b) => (b.t.overdue || 0) - (a.t.overdue || 0) || a.plot.dag.localeCompare(b.plot.dag));

  async function pay(id) {
    setBusy(id);
    await run(() => api.recordTaxPayment(id, officer), (receipt) => tr(`কর জমা হলো; দাখিলা ${receipt}`, `Tax recorded; receipt ${receipt}`));
    setBusy(null);
  }

  const STATS = [
    [tr("এ বছর পরিশোধিত", "Paid this year"), counts.paid, "text-success"],
    [tr("কর বাকি", "Tax due"), counts.due, "text-warning"],
    [tr(`${tr.num(TAX_ALERT_YEARS)}+ বছর বকেয়া`, `${TAX_ALERT_YEARS}+ years overdue`), counts.alert, "text-destructive"],
    [tr("মওকুফ (নদীতে বিলীন)", "Waived (lost to river)"), counts.exempt, "text-info"],
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("ভূমি উন্নয়ন কর", "Land development tax")}
        description={tr(
          `করবর্ষ ১ জুলাই থেকে ৩০ জুন; এখন চলছে ${tr.num(taxYearLabel(year))}। টানা ${tr.num(TAX_ALERT_YEARS)} বছর বা বেশি বকেয়া হলে মালিক সরাসরি বার্তা পান, আর বিক্রির আবেদনে সতর্কতা দেখায়। নদীতে বিলীন জমির কর মওকুফ।`,
          `The tax year runs 1 July to 30 June; ${taxYearLabel(year)} is open now. When tax is ${TAX_ALERT_YEARS} or more years overdue the owner gets a message directly and a sale application shows a warning. Land lost to the river pays no tax.`
        )}
      />
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STATS.map(([label, n, colour]) => (
          <div key={label} className="flex flex-col gap-1 rounded-lg bg-card px-4 py-3">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className={`num text-3xl font-bold ${colour}`}>{tr.num(n)}</dd>
          </div>
        ))}
      </dl>
      {!can && <RoleNotice roles={ROLES_OK} title={tr("শুধু ভূমি অফিস বা ইউএনও কর জমা নথিভুক্ত করেন", "Only the land office or a UNO records tax payments")} />}
      <AreaScope all={all} setAll={setAll} shown={shown.length} total={rows.length} noun={{ bn: "দাগ", en: "dags" }} />
      <ToggleGroup type="single" variant="outline" value={filter} onValueChange={(v) => v && setFilter(v)} aria-label={tr("দেখান", "Show")} className="flex-wrap">
        <ToggleGroupItem value="due" className="px-4">{tr("কর বাকি", "Tax due")}</ToggleGroupItem>
        <ToggleGroupItem value="alert" className="px-4">{tr(`${tr.num(TAX_ALERT_YEARS)}+ বছর বকেয়া`, `${TAX_ALERT_YEARS}+ years overdue`)}</ToggleGroupItem>
        <ToggleGroupItem value="all" className="px-4">{tr("সব দাগ", "All dags")}</ToggleGroupItem>
      </ToggleGroup>
      <Card className="py-0">
        <Table className="min-w-[760px]">
          <TableHeader className={GREEN_HEAD}>
            <TableRow className={GREEN_HEAD}>
              <TableHead className="pl-5">{tr("দাগ", "Dag")}</TableHead>
              <TableHead>{tr("মালিক", "Owners")}</TableHead>
              <TableHead>{tr("অবস্থা", "Status")}</TableHead>
              <TableHead>{tr("বিবরণ", "Details")}</TableHead>
              <TableHead className="pr-5 text-right">{tr("কাজ", "Action")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map(({ id, plot, t }) => {
              const [variant, label] = badgeOf(tr, t);
              return (
                <TableRow key={id}>
                  <TableCell className="pl-5 font-semibold">
                    {tr.num(plot.dag)} <span className="font-normal text-muted-foreground">· {tr.pick(plot.mouza)}</span>
                  </TableCell>
                  <TableCell className="max-w-[16rem] truncate">{ownersOf(state, id).map((o) => tr.pick(state.people[o.person])).join(", ") || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={variant}>{label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {taxText(tr, t)}
                    {t.receipt && <span className="mono block text-xs">{t.receipt}</span>}
                  </TableCell>
                  <TableCell className="pr-5 text-right">
                    {!t.exempt && t.currentDue && (
                      <Button size="sm" variant="outline" disabled={!can || busy === id} onClick={() => pay(id)}>
                        <ReceiptTextIcon data-icon="inline-start" />
                        {tr("কর জমা নিন", "Record payment")}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {!shown.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                  {tr("এই তালিকায় কোনো দাগ নেই।", "No dags in this list.")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
