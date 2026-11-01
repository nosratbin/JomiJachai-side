"use client";
import { useState } from "react";
import { ShieldCheckIcon, ShieldAlertIcon } from "lucide-react";
import { useT } from "@/lib/i18n";
import { useRegister } from "@/lib/api";
import { usePrefs } from "@/lib/store";
import { verifyLogChain, officerName } from "@/lib/register";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader, GREEN_HEAD } from "../brand";
import { AreaScope, inArea } from "./AreaScope";

const RESULT = {
  approved: ["success", "অনুমোদিত", "Approved"],
  passed: ["success", "যাচাই পাস", "Checks passed"],
  blocked: ["destructive", "আটকানো", "Blocked"],
  warning: ["warning", "সতর্কতা", "Warning"],
  genuine: ["success", "আসল", "Genuine"],
  altered: ["destructive", "বদলানো", "Altered"],
  mismatch: ["destructive", "মেলেনি", "No match"],
  notice: ["warning", "নোটিশ", "Notice"],
  recorded: ["info", "নথিভুক্ত", "Recorded"],
  paid: ["success", "পরিশোধিত", "Paid"],
  info: ["secondary", "তথ্য", "Info"],
};

export default function ActivityLog() {
  const tr = useT();
  const state = useRegister();
  const { area } = usePrefs();
  const [allAreas, setAllAreas] = useState(false);
  const chain = verifyLogChain(state.log);
  const who = (u) => {
    const o = officerName(u);
    if (o) return tr.pick(o).split(",")[0];
    return { citizen: tr("নাগরিক অ্যাপ", "Citizen App"), system: tr("সিস্টেম", "System"), sync: tr("সিঙ্ক", "Sync") }[u] || u;
  };
  // a line belongs to a plot directly, or through the deed it is about;
  // lines with neither (register started, sync) are register-wide and stay in view.
  const deedPlot = Object.fromEntries(state.deeds.map((d) => [d.no, d.plot]));
  const rows = [...state.log].reverse();
  const registerWide = (e) => !e.plot && !e.deed; // started, sync: not tied to any one area
  const shown = allAreas ? rows : rows.filter((e) => registerWide(e) || inArea(state, e.plot || deedPlot[e.deed], area));
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={tr("কার্যলিপি", "Activity log")}
        description={tr(
          "প্রতিটি যাচাই, অনুমোদন ও আটকানো চেষ্টা, কে কখন করেছেন তাসহ। কার্যলিপিতে শুধু নতুন লাইন যোগ হয়; পুরোনো লাইন বদলানো, অপসারণ কিংবা বাতিল করা যায় না।",
          "Every check, approval and blocked attempt, with who did it and when. New lines can only be added; old lines cannot be edited or deleted."
        )}
      />
      <AreaScope all={allAreas} setAll={setAllAreas} shown={shown.length} total={rows.length} noun={{ bn: "লাইন", en: "lines" }} />
      <Alert variant={chain.ok ? "success" : "destructive"}>
        {chain.ok ? <ShieldCheckIcon /> : <ShieldAlertIcon />}
        <AlertTitle>{chain.ok ? tr("কার্যলিপির শিকল অক্ষত", "Log chain intact") : tr(`কার্যলিপি বদলানো হয়েছে (লাইন ${tr.num(chain.brokenAt)})`, `Log was changed (line ${chain.brokenAt})`)}</AlertTitle>
        <AlertDescription>
          {tr("প্রতিটি লাইনের SHA-256 ছাপ আগের লাইনের ছাপের সঙ্গে যুক্ত, তাই মাঝখানের কোনো লাইন বদলালে শিকল ভেঙে যায়।", "Each line's SHA-256 fingerprint includes the previous line's, so changing any line breaks the chain.")}
        </AlertDescription>
      </Alert>
      <Card className="py-0">
        <Table className="min-w-[760px]">
          <TableHeader className={GREEN_HEAD}>
            <TableRow className={GREEN_HEAD}>
              <TableHead className="pl-5">#</TableHead>
              <TableHead>{tr("সময়", "Time")}</TableHead>
              <TableHead>{tr("কে", "Who")}</TableHead>
              <TableHead>{tr("ফল", "Result")}</TableHead>
              <TableHead>{tr("বিবরণ", "Details")}</TableHead>
              <TableHead className="pr-5">{tr("ছাপ", "Hash")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((e) => {
              const [variant, bn, en] = RESULT[e.result] || RESULT.info;
              return (
                <TableRow key={e.seq} className="align-top">
                  <TableCell className="num pl-5 text-muted-foreground">{tr.num(e.seq)}</TableCell>
                  <TableCell className="text-sm">{tr.time(e.time)}</TableCell>
                  <TableCell className="text-sm">{who(e.user)}</TableCell>
                  <TableCell>
                    <Badge variant={variant}>{tr(bn, en)}</Badge>
                  </TableCell>
                  <TableCell className="min-w-[18rem] whitespace-normal">{tr.num(tr.pick(e.text))}</TableCell>
                  <TableCell className="mono pr-5 text-xs text-muted-foreground">{e.hash.slice(0, 8)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
