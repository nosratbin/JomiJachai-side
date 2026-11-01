"use client";
// Small pieces shared by the land-service pages: who is on duty, a "not your job" notice,
// and one way to run an api.* action with a toast.
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { usePrefs } from "@/lib/store";
import { roleOf } from "@/lib/register";
import { ROLES } from "@/lib/seed";
import * as F from "@/lib/fraction";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function useDuty() {
  const { officer, area } = usePrefs();
  return { officer, area, role: roleOf(officer) };
}

export const dagName = (tr, plot) => `${tr("দাগ", "Dag")} ${tr.num(plot.dag)} · ${tr.pick(plot.mouza)}`;
export const dec = (tr, v) => tr.num(F.display(typeof v === "string" ? F.parse(v) : v));

// Shown in place of a form when the officer on duty may not do this job.
export function RoleNotice({ roles, title }) {
  const tr = useT();
  const names = roles.map((r) => tr.pick(ROLES.find((x) => x.id === r))).join(tr(" বা ", " or "));
  return (
    <Alert>
      <LockIcon />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{tr(`ওপরে “দায়িত্বরত কর্মকর্তা” হিসেবে ${names} বেছে নিন।`, `Choose a ${names} as the officer on duty at the top.`)}</AlertDescription>
    </Alert>
  );
}

// Runs one register action; the toast says what happened in plain words.
export async function run(action, success) {
  try {
    const value = await action();
    toast.success(success(value));
    return value;
  } catch (err) {
    toast.error(String(err.message || err));
    return null;
  }
}
