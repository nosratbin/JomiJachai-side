// Land services: land tax, advance acquisition notices, river erosion,
// borga (sharecropping), khas land settlement, co-sharers and the Krishak Card.
// Pure lookups on the register state; every change goes through lib/register.js and api.*.
import * as F from "./fraction";
import { SHARE_BASIS } from "./seed";

const DAY = 24 * 60 * 60 * 1000;
const keyOf = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today0 = () => keyOf(new Date());
export const addDays = (key, n) => {
  const d = new Date(key + "T00:00:00");
  d.setDate(d.getDate() + n);
  return keyOf(d);
};
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);
const sumOf = (list) => F.sum(list.map((x) => F.parse(x)));

const FARM = ["Agricultural", "Orchard", "Highland", "Khas land"];
export const isFarmland = (plot) => FARM.includes(plot.landType.en);

// ---- Land development tax (tax year 1 July – 30 June) ----
export const taxYear = (today = today0()) => {
  const d = new Date(today + "T00:00:00");
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
};
export const taxYearLabel = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
export const TAX_ALERT_YEARS = 3;

export function taxStatus(state, plotId, today = today0()) {
  const plot = state.plots[plotId];
  if (plot.flags.khas) return { exempt: "khas" };
  if ((erosionOf(state, plotId)?.step ?? -1) >= 1) return { exempt: "river" };
  const t = state.tax?.[plotId];
  if (!t) return { paidUpTo: null, overdue: 0, currentDue: true, alert: false };
  const current = taxYear(today);
  const overdue = Math.max(0, current - 1 - t.paidUpTo);
  return { paidUpTo: t.paidUpTo, overdue, currentDue: t.paidUpTo < current, alert: overdue >= TAX_ALERT_YEARS, receipt: t.receipt };
}

// ---- Advance notice of acquisition ----
export function noticeOn(state, plotId, today = today0()) {
  const list = Object.values(state.notices || {})
    .filter((n) => n.plots.includes(plotId) && n.date <= today)
    .sort((a, b) => (a.freeze < b.freeze ? -1 : 1));
  if (!list.length) return null;
  return { ...list[0], frozen: list[0].freeze <= today };
}
export const salesAfterNotice = (state, notice) => state.deeds.filter((d) => notice.plots.includes(d.plot) && d.date >= notice.date);

// ---- River erosion ----
export const EROSION_STEPS = [
  { key: "flag", bn: "স্যাটেলাইট ছবিতে চিহ্নিত", en: "Flagged on satellite images", roles: ["land", "uno", "magistrate"] },
  { key: "field", bn: "সরেজমিন তদন্ত", en: "Field visit", roles: ["land", "uno", "magistrate"] },
  { key: "records", bn: "পুরোনো খতিয়ান ও মৌজা ম্যাপ মেলানো", en: "Old khatian and mouza map checked", roles: ["land", "uno", "magistrate"] },
  { key: "witness", bn: "স্থানীয় সাক্ষ্য নেওয়া", en: "Local witnesses heard", roles: ["land", "uno", "magistrate"] },
  { key: "verified", bn: "ক্ষতিগ্রস্ত পরিবার হিসেবে যাচাই", en: "Verified as an affected family", roles: ["uno"] },
  { key: "rehab", bn: "পুনর্বাসন", en: "Rehabilitated", roles: ["uno"] },
];
export const erosionOf = (state, plotId) => state.erosion?.[plotId] || null;
export const isLost = (state, plotId) => (erosionOf(state, plotId)?.step ?? -1) >= 1;

// ---- Borga and khas settlement ----
export const borgaOn = (state, plotId) => Object.values(state.borga || {}).filter((b) => b.plot === plotId);
export const khasOn = (state, plotId) => Object.values(state.khas || {}).filter((k) => k.plot === plotId);
export function khasFree(state, plotId) {
  const plot = state.plots[plotId];
  return F.sub(F.parse(plot.total), sumOf(khasOn(state, plotId).map((k) => k.decimals)));
}
export const KHAS_LIMIT = "100"; // decimals per family (1 acre)

// ---- Co-sharers ----
const ownersRaw = (state, plotId) =>
  Object.entries(state.shares[plotId] || {})
    .map(([person, share]) => ({ person, share: F.parse(share) }))
    .filter((o) => !F.isZero(o.share))
    .sort((a, b) => F.cmp(b.share, a.share));

export function coSharers(state, plotId) {
  return ownersRaw(state, plotId).map((o) => {
    const bought = [...state.deeds].reverse().find((d) => d.plot === plotId && d.buyer === o.person);
    return { ...o, basis: bought ? "purchase" : SHARE_BASIS[plotId] || "record", deed: bought?.no };
  });
}
export const BASIS = {
  inheritance: { bn: "উত্তরাধিকার", en: "Inheritance" },
  purchase: { bn: "ক্রয়", en: "Purchase" },
  record: { bn: "খতিয়ানমূলে", en: "By the khatian record" },
};

const personByName = (state, name) => {
  const n = String(name || "").trim().toLowerCase();
  return n ? Object.entries(state.people).find(([, p]) => p.bn.toLowerCase() === n || p.en.toLowerCase() === n)?.[0] || null : null;
};

// Notes that go with a sale (not rules): who must be told, and agreements that continue.
export function saleNotes(state, { plot, seller, buyerName }) {
  const buyer = personByName(state, buyerName);
  const all = coSharers(state, plot);
  const buyerOutsider = !buyer || !all.some((c) => c.person === buyer);
  const others = all.filter((c) => c.person !== seller).map((c) => ({ ...c, preempt: buyerOutsider && c.basis === "inheritance" }));
  return { coSharers: others, borga: borgaOn(state, plot).filter((b) => b.owner === seller), buyerOutsider };
}

// ---- A person's land, for the Krishak Card ----
export const CATEGORIES = [
  { max: 5, key: "landless", bn: "ভূমিহীন", en: "Landless" },
  { max: 50, key: "marginal", bn: "প্রান্তিক কৃষক", en: "Marginal farmer" },
  { max: 250, key: "small", bn: "ক্ষুদ্র কৃষক", en: "Small farmer" },
  { max: 750, key: "medium", bn: "মাঝারি কৃষক", en: "Medium farmer" },
  { max: Infinity, key: "large", bn: "বড় কৃষক", en: "Large farmer" },
];

export function landOf(state, person) {
  const owned = Object.keys(state.shares)
    .filter((p) => !F.isZero(F.parse(state.shares[p][person] || "0")))
    .map((p) => ({ plot: p, share: F.parse(state.shares[p][person]), lost: isLost(state, p), farm: isFarmland(state.plots[p]) }));
  const borgaIn = Object.values(state.borga || {}).filter((b) => b.bargadar === person);
  const borgaOut = Object.values(state.borga || {}).filter((b) => b.owner === person);
  const khas = Object.values(state.khas || {}).filter((k) => k.family === person);
  const ownedFarm = F.sum(owned.filter((o) => o.farm && !o.lost).map((o) => o.share));
  const operated = F.add(F.sub(F.add(ownedFarm, sumOf(borgaIn.map((b) => b.decimals))), sumOf(borgaOut.map((b) => b.decimals))), sumOf(khas.map((k) => k.decimals)));
  const n = F.toNumber(F.toKey(operated));
  const category = CATEGORIES.find((c) => n < c.max);
  return { owned, borgaIn, borgaOut, khas, ownedFarm, operated, category, lostAny: owned.some((o) => o.lost) };
}

export const cardOf = (state, person) => Object.entries(state.cards || {}).find(([, c]) => c.person === person)?.[0] || null;
export function cardEligible(state, person) {
  if (person === "govt") return false;
  const l = landOf(state, person);
  return !F.isZero(l.ownedFarm) || l.borgaIn.length > 0 || l.khas.length > 0 || l.lostAny;
}

// ---- Khas settlement eligibility (officer checks) ----
export function khasChecks(state, { plot, person, decimals }, today = today0()) {
  const checks = [];
  const qty = (() => {
    try {
      return F.parse(decimals);
    } catch {
      return null;
    }
  })();
  const free = khasFree(state, plot);
  const fits = qty && F.cmp(qty, F.ZERO) > 0 && F.cmp(qty, free) <= 0;
  checks.push({
    status: fits ? "pass" : "fail",
    bn: fits ? `খালি খাস জমি আছে (${F.display(free)} শতাংশ)` : `এই দাগে খালি আছে মাত্র ${F.display(free)} শতাংশ`,
    en: fits ? `Unsettled khas land available (${F.display(free)} decimals)` : `Only ${F.display(free)} decimals of this dag are unsettled`,
  });
  // a name not yet in the register (person = null) is a family with no land on record
  const l = landOf(state, person);
  const landless = F.isZero(l.ownedFarm);
  checks.push({
    status: landless ? "pass" : "fail",
    bn: landless ? "রেজিস্টারে পরিবারটির কোনো কৃষিজমি নেই (ভূমিহীন)" : `রেজিস্টারে পরিবারটির ${F.display(l.ownedFarm)} শতাংশ কৃষিজমি আছে`,
    en: landless ? "The family owns no farmland in the register (landless)" : `The family owns ${F.display(l.ownedFarm)} decimals of farmland in the register`,
  });
  const already = sumOf(l.khas.map((k) => k.decimals));
  const within = qty && F.cmp(F.add(already, qty), F.parse(KHAS_LIMIT)) <= 0;
  checks.push({
    status: within ? "pass" : "fail",
    bn: within ? `মোট বন্দোবস্ত ${KHAS_LIMIT} শতাংশের (১ একর) মধ্যে থাকবে` : `মোট বন্দোবস্ত ${KHAS_LIMIT} শতাংশ (১ একর) ছাড়িয়ে যাবে (আগে পেয়েছেন ${F.display(already)})`,
    en: within ? `Total settled stays within ${KHAS_LIMIT} decimals (1 acre)` : `Total settled would pass ${KHAS_LIMIT} decimals (1 acre); already has ${F.display(already)}`,
  });
  const sold = state.deeds.filter((d) => d.seller === person && daysBetween(d.date, today) <= 5 * 365);
  if (sold.length)
    checks.push({
      status: "warn",
      bn: `গত ৫ বছরে জমি বিক্রি করেছেন (দলিল ${sold.map((d) => d.no).join(", ")}); ভূমিহীন দেখাতে জমি বিক্রি করা হয়েছে কি না দেখুন`,
      en: `Sold land in the last 5 years (deed ${sold.map((d) => d.no).join(", ")}); check the land was not sold just to qualify`,
    });
  if (l.lostAny)
    checks.push({ status: "pass", bn: "নদীভাঙনে জমি হারানো পরিবার: অগ্রাধিকার পাবে", en: "Family lost land to the river: gets priority" });
  return { checks, ok: !checks.some((c) => c.status === "fail") };
}

// ---- Messages for a person (shown in the app; SMS is the next phase) ----
export function messagesFor(state, person, today = today0()) {
  const out = [];
  const name = (id) => state.people[id] || { bn: id, en: id };
  const l = landOf(state, person);
  for (const o of l.owned) {
    const plot = state.plots[o.plot];
    const n = noticeOn(state, o.plot, today);
    if (n)
      out.push({
        level: n.frozen ? "risky" : "careful",
        date: n.date,
        kind: "notice",
        bn: `অধিগ্রহণের আগাম নোটিশ ${n.id}: আপনার দাগ ${plot.dag} (${plot.mouza.bn}) “${n.project.bn}” প্রকল্পের প্রস্তাবিত এলাকায়। ${n.freeze} থেকে এই জমি বিক্রি বন্ধ; অধিগ্রহণ শুরু হতে পারে ${n.acquire} থেকে। ক্ষতিপূরণের খবর সরাসরি আপনাকে জানানো হবে।`,
        en: `Advance acquisition notice ${n.id}: your dag ${plot.dag} (${plot.mouza.en}) is in the area proposed for "${n.project.en}". Sales of this land stop from ${n.freeze}; acquisition may start from ${n.acquire}. You will be told about compensation directly.`,
      });
    const t = taxStatus(state, o.plot, today);
    if (t.alert)
      out.push({
        level: "careful",
        date: today,
        kind: "tax",
        bn: `দাগ ${plot.dag}-এর ভূমি উন্নয়ন কর টানা ${t.overdue} বছর বকেয়া (শেষ পরিশোধ ${taxYearLabel(t.paidUpTo)})। আইন অনুযায়ী বকেয়া ও সুদ জমা দিন, না হলে আদায়ের ব্যবস্থা নেওয়া হতে পারে।`,
        en: `Land development tax on dag ${plot.dag} is ${t.overdue} years overdue (last paid ${taxYearLabel(t.paidUpTo)}). Please pay the dues and any surcharge under the law, or recovery action may follow.`,
      });
    const e = erosionOf(state, o.plot);
    if (e) {
      const s = EROSION_STEPS[e.step];
      out.push({
        level: e.step >= 4 ? "info" : "careful",
        date: e.dates[e.step],
        kind: "erosion",
        bn: `নদীভাঙন: দাগ ${plot.dag} (${e.year} সালে বিলীন)। এখনকার ধাপ: ${s.bn}।${e.step === 5 && e.rehab ? ` ${e.rehab.bn}।` : ""}`,
        en: `River erosion: dag ${plot.dag} (lost in ${e.year}). Current step: ${s.en}.${e.step === 5 && e.rehab ? ` ${e.rehab.en}.` : ""}`,
      });
    }
    if (state.shares[o.plot] && Object.keys(state.shares[o.plot]).length > 1) {
      for (const d of state.deeds.filter((d) => d.plot === o.plot && d.seller !== person && d.buyer !== person && daysBetween(d.date, today) <= 60)) {
        const pre = coSharers(state, o.plot).find((c) => c.person === person)?.basis === "inheritance";
        out.push({
          level: "info",
          date: d.date,
          kind: "cosharer",
          bn: `শরিক ${name(d.seller).bn} দাগ ${plot.dag}-এর ${F.display(F.parse(d.decimals))} শতাংশ ${name(d.buyer).bn}-এর কাছে বিক্রি করেছেন (দলিল ${d.no})।${pre ? " উত্তরাধিকারসূত্রে শরিক হিসেবে নোটিশ পাওয়ার ২ মাসের মধ্যে আপনি অগ্রক্রয়ের আবেদন করতে পারেন।" : ""}`,
          en: `Co-sharer ${name(d.seller).en} sold ${F.display(F.parse(d.decimals))} decimals of dag ${plot.dag} to ${name(d.buyer).en} (deed ${d.no}).${pre ? " As a co-sharer by inheritance you may apply for pre-emption within 2 months of the notice." : ""}`,
        });
      }
    }
  }
  for (const b of l.borgaIn) {
    const plot = state.plots[b.plot];
    out.push({
      level: "info",
      date: b.since,
      kind: "borga",
      bn: `বর্গা চুক্তি ${b.id}: আপনি দাগ ${plot.dag}-এর ${F.display(F.parse(b.decimals))} শতাংশ চাষ করেন (মালিক ${name(b.owner).bn})। ফসল তিন ভাগ: মালিক, বর্গাদার, আর বীজ-সার যিনি দেন। জমি বিক্রি হলেও চুক্তি বহাল থাকে।`,
      en: `Borga agreement ${b.id}: you farm ${F.display(F.parse(b.decimals))} decimals of dag ${plot.dag} (owner ${name(b.owner).en}). The crop is shared in thirds: owner, bargadar, and whoever pays for seed and fertiliser. The agreement continues even if the land is sold.`,
    });
    const n = noticeOn(state, b.plot, today);
    if (n)
      out.push({
        level: "careful",
        date: n.date,
        kind: "notice",
        bn: `অধিগ্রহণের আগাম নোটিশ ${n.id}: আপনার বর্গা জমি (দাগ ${plot.dag}) প্রস্তাবিত এলাকায়। ফসলের ক্ষতিপূরণের জন্য বর্গা চুক্তি নথিভুক্ত আছে।`,
        en: `Advance acquisition notice ${n.id}: the land you farm on borga (dag ${plot.dag}) is in the proposed area. Your borga agreement is on record for crop compensation.`,
      });
  }
  for (const k of l.khas) {
    const plot = state.plots[k.plot];
    out.push({
      level: "info",
      date: k.date,
      kind: "khas",
      bn: `খাস জমি বন্দোবস্ত ${k.id}: দাগ ${plot.dag} (${plot.mouza.bn}) থেকে ${F.display(F.parse(k.decimals))} শতাংশ কৃষিজমি আপনার পরিবারকে চাষের জন্য দেওয়া হয়েছে। জমির মালিক সরকার; এই জমি বিক্রি বা হস্তান্তর করা যায় না।`,
      en: `Khas land settlement ${k.id}: ${F.display(F.parse(k.decimals))} decimals of farmland on dag ${plot.dag} (${plot.mouza.en}) were settled to your family to farm. The government stays the owner; the land cannot be sold or transferred.`,
    });
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : -1));
}
