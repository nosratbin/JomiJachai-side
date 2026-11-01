import * as F from "./fraction";
import { sha256, sha256Sync } from "./sha256";
import {
  PEOPLE, PLOTS, SHARES, SEED_DEEDS, SEED_APPLICATIONS, SEED_VERIFICATIONS, FIRST_NEW_DEED, OFFICERS,
  TAX_OVERDUE, SEED_NOTICES, SEED_EROSION, SEED_KHAS, SEED_BORGA, FIRST_CARD,
} from "./seed";
import {
  taxYear, taxYearLabel, taxStatus, noticeOn, salesAfterNotice, erosionOf, borgaOn, khasOn, khasChecks, cardEligible, cardOf, addDays,
  EROSION_STEPS, TAX_ALERT_YEARS,
} from "./land-services";

export const STATE_VERSION = 7;
const DAY = 24 * 60 * 60 * 1000;

export function dateKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
const daysBetween = (a, b) => Math.round((new Date(b) - new Date(a)) / DAY);

export function fingerprintText(deed, state) {
  const plot = state.plots[deed.plot];
  return [
    deed.no,
    plot.mouza.en,
    `JL ${plot.jl}`,
    `Dag ${plot.dag}`,
    state.people[deed.seller].en,
    state.people[deed.buyer].en,
    F.toKey(F.parse(deed.decimals)),
    deed.date,
  ].join("|");
}

function logEntryText(e) {
  return JSON.stringify([e.seq, e.time, e.user, e.kind, e.result, e.plot || "", e.deed || "", e.text?.en || ""]);
}
function appendLog(state, entry) {
  const prev = state.log.length ? state.log[state.log.length - 1].hash : "0".repeat(64);
  const e = { seq: state.log.length + 1, time: new Date().toISOString(), ...entry };
  e.prev = prev;
  e.hash = sha256Sync(prev + logEntryText(e));
  return { ...state, log: [...state.log, e] };
}
export function verifyLogChain(log) {
  let prev = "0".repeat(64);
  for (const e of log) {
    if (e.prev !== prev || sha256Sync(prev + logEntryText(e)) !== e.hash) return { ok: false, brokenAt: e.seq };
    prev = e.hash;
  }
  return { ok: true };
}

export function createInitialState(now = new Date()) {
  let state = {
    version: STATE_VERSION,
    createdAt: now.toISOString(),
    people: JSON.parse(JSON.stringify(PEOPLE)),
    plots: JSON.parse(JSON.stringify(PLOTS)),
    shares: Object.fromEntries(
      Object.entries(SHARES).map(([plot, s]) => [plot, Object.fromEntries(Object.entries(s).map(([p, v]) => [p, F.toKey(F.parse(v))]))])
    ),
    deeds: [],
    log: [],
    nextDeed: FIRST_NEW_DEED,
    seedDeedCount: SEED_DEEDS.length,
    tax: {},
    notices: {},
    erosion: {},
    khas: {},
    borga: {},
    cards: {},
    nextCard: FIRST_CARD,
  };
  const dayStart = (daysAgo) => new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 10, (daysAgo * 53) % 330).getTime();
  const dayOf = (daysAgo) => dateKey(new Date(dayStart(daysAgo)));
  const todayKey = dateKey(now);

  // Land services records, written in full before the history is replayed.
  const current = taxYear(todayKey);
  for (const [id, plot] of Object.entries(state.plots))
    if (!plot.flags.khas) state.tax[id] = { paidUpTo: current - (id in TAX_OVERDUE ? 1 + TAX_OVERDUE[id] : 0) };
  for (const n of SEED_NOTICES)
    state.notices[n.id] = { id: n.id, project: n.project, plots: n.plots, date: dayOf(n.daysAgo), freeze: addDays(todayKey, n.freezeIn), acquire: addDays(todayKey, n.acquireIn), by: n.by };
  for (const e of SEED_EROSION) {
    state.erosion[e.plot] = { plot: e.plot, year: e.year, step: e.stepDaysAgo.length - 1, dates: e.stepDaysAgo.map(dayOf), rehab: e.rehab || null };
    delete state.tax[e.plot];
  }
  for (const k of SEED_KHAS) state.khas[k.id] = { id: k.id, plot: k.plot, family: k.family, decimals: k.decimals, date: dayOf(k.daysAgo), by: k.by };
  for (const b of SEED_BORGA) state.borga[b.id] = { id: b.id, plot: b.plot, owner: b.owner, bargadar: b.bargadar, decimals: b.decimals, since: dayOf(b.daysAgo), by: b.by };
  for (const person of Object.keys(state.people))
    if (cardEligible(state, person)) state.cards[String(state.nextCard++)] = { person, issued: dayOf(400) };

  const events = [
    ...SEED_DEEDS.map((x) => ({ kind: "deed", x })),
    ...SEED_APPLICATIONS.map((x) => ({ kind: "application", x })),
    ...SEED_VERIFICATIONS.map((x) => ({ kind: "verification", x })),
    ...SEED_NOTICES.map((x) => ({ kind: "notice", x })),
    ...SEED_KHAS.map((x) => ({ kind: "khas", x })),
    ...SEED_BORGA.map((x) => ({ kind: "borga", x })),
    ...SEED_EROSION.flatMap((e) => e.stepDaysAgo.map((daysAgo, step) => ({ kind: "erosion", x: { plot: e.plot, step, daysAgo, rehab: e.rehab } }))),
  ].sort((a, b) => b.x.daysAgo - a.x.daysAgo);
  const first = events.length ? events[0].x.daysAgo + 1 : 0;
  state = appendLog(state, {
    time: new Date(dayStart(first)).toISOString(),
    user: "system",
    kind: "seed",
    result: "info",
    text: { bn: "ভূমি রেজিস্টার চালু হলো", en: "Land register started" },
  });
  let lastDay = -1;
  let n = 0;
  for (const { kind, x } of events) {
    n = x.daysAgo === lastDay ? n + 1 : 0;
    lastDay = x.daysAgo;
    const at = (k) => new Date(dayStart(x.daysAgo) + (n * 3 + k) * 7 * 60 * 1000).toISOString();
    const day = dateKey(new Date(dayStart(x.daysAgo)));
    if (kind === "deed") {
      const deed = { no: x.no, plot: x.plot, seller: x.seller, buyer: x.buyer, decimals: F.toKey(F.parse(x.decimals)), date: day, officer: x.officer };
      deed.fingerprint = sha256Sync(fingerprintText(deed, state));
      state = { ...state, deeds: [...state.deeds, deed] };
      const plot = state.plots[x.plot];
      const [s, b, q] = [state.people[x.seller], state.people[x.buyer], F.display(F.parse(x.decimals))];
      state = appendLog(state, { time: at(0), user: x.officer, kind: "check", result: "passed", plot: x.plot, text: { bn: `যাচাই পাস: ${s.bn}, দাগ ${plot.dag}, ${q} শতাংশ`, en: `Checks passed: ${s.en}, Dag ${plot.dag}, ${q} decimals` } });
      state = appendLog(state, {
        time: at(1),
        user: x.officer,
        kind: "register",
        result: "approved",
        plot: x.plot,
        deed: x.no,
        text: { bn: `দলিল ${x.no} নিবন্ধিত: ${s.bn} → ${b.bn}, দাগ ${plot.dag}, ${q} শতাংশ`, en: `Deed ${x.no} registered: ${s.en} → ${b.en}, Dag ${plot.dag}, ${q} decimals` },
      });
    } else if (kind === "application") {
      const input = { plot: x.plot, seller: x.seller, decimals: x.decimals };
      state = logCheck(state, input, checkSale(state, input, day), x.officer, at(0));
    } else if (kind === "notice") {
      state = appendLog(state, { time: at(0), user: x.by, kind: "notice", result: "notice", plot: x.plots[0], text: noticeText(state, state.notices[x.id]) });
    } else if (kind === "khas") {
      state = appendLog(state, { time: at(0), user: x.by, kind: "khas", result: "recorded", plot: x.plot, text: khasText(state, state.khas[x.id]) });
    } else if (kind === "borga") {
      state = appendLog(state, { time: at(0), user: x.by, kind: "borga", result: "recorded", plot: x.plot, text: borgaText(state, state.borga[x.id]) });
    } else if (kind === "erosion") {
      const officer = officerFor(state.plots[x.plot].mouza.en, x.step >= 4 ? "uno" : "land");
      state = appendLog(state, { time: at(0), user: officer, kind: "erosion", result: x.step >= 4 ? "approved" : "recorded", plot: x.plot, text: erosionText(state, x.plot, x.step, x.rehab) });
    } else {
      state = logVerification(state, x.deed, x.result, "citizen", at(0));
    }
  }
  return state;
}

// ---- Lookups ----
export const ownersOf = (state, plotId) =>
  Object.entries(state.shares[plotId] || {})
    .map(([person, share]) => ({ person, share: F.parse(share) }))
    .filter((o) => !F.isZero(o.share))
    .sort((a, b) => F.cmp(b.share, a.share));

export const shareOf = (state, plotId, person) => F.parse(state.shares[plotId]?.[person] || "0");

export function findPerson(state, name) {
  const n = String(name || "").trim().toLowerCase();
  if (!n) return null;
  return Object.entries(state.people).find(([, p]) => p.bn.toLowerCase() === n || p.en.toLowerCase() === n)?.[0] || null;
}

export function lastAcquisition(state, plotId, person) {
  const deeds = state.deeds.filter((d) => d.plot === plotId && d.buyer === person);
  return deeds.length ? deeds[deeds.length - 1] : null;
}

export function plotTotalCheck(state, plotId) {
  return F.cmp(F.sum(Object.values(state.shares[plotId] || {})), F.parse(state.plots[plotId].total)) === 0;
}

export function checkSale(state, { plot: plotId, seller, decimals }, today = dateKey()) {
  const plot = state.plots[plotId];
  const qty = F.parse(decimals);
  const owned = shareOf(state, plotId, seller);
  const fmt = (f) => F.display(f);
  const rules = [];

  const isOwner = !F.isZero(owned);
  rules.push({
    id: 1,
    status: isOwner ? "pass" : "fail",
    title: { bn: "বিক্রেতা এই দাগের রেকর্ডভুক্ত মালিক", en: "Seller is a recorded owner of this dag" },
    detail: isOwner
      ? { bn: `রেজিস্টারে মালিক হিসেবে আছেন`, en: "Listed as an owner in the register" }
      : { bn: "এই দাগের মালিকের তালিকায় বিক্রেতার নাম নেই", en: "The seller is not on this dag's list of owners" },
  });

  const enough = qty && F.cmp(qty, owned) <= 0;
  rules.push({
    id: 2,
    status: enough ? "pass" : "fail",
    title: { bn: "বিক্রির শতাংশ ≤ বিক্রেতার অবশিষ্ট অংশ", en: "Decimals sold ≤ seller's remaining share" },
    detail: enough
      ? { bn: `${fmt(qty)} শতাংশ বিক্রি, আছে ${fmt(owned)}`, en: `Sells ${fmt(qty)}, owns ${fmt(owned)}` }
      : { bn: `${fmt(qty)} শতাংশ বিক্রি করছেন, কিন্তু আছে মাত্র ${fmt(owned)}`, en: `Sells ${fmt(qty)}, owns only ${fmt(owned)}` },
  });

  const cc = plot.flags.courtCase;
  rules.push({
    id: 3,
    status: cc ? "fail" : "pass",
    title: { bn: "জমিতে কোনো চলমান মামলা নেই", en: "No open court case on the plot" },
    detail: cc || { bn: "কোনো মামলা নথিভুক্ত নেই", en: "No case on record" },
  });

  const er = erosionOf(state, plotId);
  rules.push({
    id: 4,
    status: plot.flags.khas || (er && er.step >= 1) ? "fail" : er ? "warn" : "pass",
    title: { bn: "খাস জমি নয়, নদীতে বিলীনও নয়", en: "Not khas land and not lost to the river" },
    detail: plot.flags.khas
      ? plot.flags.khas
      : er && er.step >= 1
      ? { bn: `জমিটি ${er.year} সালে নদীতে বিলীন (সরেজমিন তদন্তে নিশ্চিত); বিক্রি করা যায় না`, en: `The land was lost to the river in ${er.year} (confirmed by a field visit); it cannot be sold` }
      : er
      ? { bn: "স্যাটেলাইট ছবিতে জমিটি নদীতে বিলীন দেখা যাচ্ছে; সরেজমিন তদন্ত বাকি", en: "Satellite images show the land may be lost to the river; field visit pending" }
      : { bn: "ব্যক্তিমালিকানাধীন জমি, মাটিতে আছে", en: "Privately owned land that still exists" },
  });

  const mg = plot.flags.mortgage;
  rules.push({
    id: 5,
    status: mg ? "warn" : "pass",
    title: { bn: "ব্যাংকে বন্ধক নেই", en: "Not mortgaged to a bank" },
    detail: mg || { bn: "কোনো বন্ধক নথিভুক্ত নেই", en: "No mortgage on record" },
  });

  const last = lastAcquisition(state, plotId, seller);
  const age = last ? daysBetween(last.date, today) : null;
  const flip = last && age <= 30;
  rules.push({
    id: 6,
    status: flip ? "warn" : "pass",
    title: { bn: "৩০ দিনের মধ্যে আবার বিক্রি নয়", en: "Not resold within 30 days" },
    detail: flip
      ? { bn: `বিক্রেতা ${age} দিন আগে দলিল ${last.no} মূলে কিনেছেন`, en: `Seller bought this ${age} days ago (deed ${last.no})` }
      : { bn: "সাম্প্রতিক কোনো কেনা নেই", en: "No recent purchase" },
  });

  const notice = noticeOn(state, plotId, today);
  const aq = plot.flags.acquisition;
  rules.push({
    id: 7,
    status: aq || notice?.frozen ? "fail" : notice ? "warn" : "pass",
    title: { bn: "অধিগ্রহণ বা অধিগ্রহণের নোটিশ নেই", en: "No acquisition or acquisition notice" },
    detail: aq
      ? aq
      : notice?.frozen
      ? { bn: `অধিগ্রহণের আগাম নোটিশ ${notice.id} (${notice.project.bn}): ${notice.freeze} থেকে বিক্রি বন্ধ`, en: `Advance acquisition notice ${notice.id} (${notice.project.en}): sales stopped from ${notice.freeze}` }
      : notice
      ? { bn: `অধিগ্রহণের আগাম নোটিশ ${notice.id} (${notice.project.bn}) জারি হয়েছে; ${notice.freeze} থেকে বিক্রি বন্ধ হবে। নোটিশের পর কেনাবেচা নজরে রাখা হয়, যাতে কেউ বাড়তি ক্ষতিপূরণ না নিতে পারে`, en: `Advance acquisition notice ${notice.id} (${notice.project.en}) is out; sales stop from ${notice.freeze}. Sales after a notice are watched so no one can claim extra compensation` }
      : { bn: "কোনো অধিগ্রহণ বা নোটিশ নেই", en: "No acquisition or notice on record" },
  });

  const tax = taxStatus(state, plotId, today);
  rules.push({
    id: 8,
    status: tax.alert ? "warn" : "pass",
    title: { bn: `ভূমি উন্নয়ন কর ${TAX_ALERT_YEARS} বছরের বেশি বকেয়া নয়`, en: `Land tax not overdue for ${TAX_ALERT_YEARS} years or more` },
    detail: tax.alert
      ? { bn: `ভূমি উন্নয়ন কর টানা ${tax.overdue} বছর বকেয়া (শেষ পরিশোধ ${taxYearLabel(tax.paidUpTo)}); বকেয়া শোধের রসিদ দেখে নিন`, en: `Land tax is ${tax.overdue} years overdue (last paid ${taxYearLabel(tax.paidUpTo)}); ask for the receipt for the dues` }
      : tax.exempt || tax.paidUpTo == null
      ? { bn: "ভূমি উন্নয়ন কর প্রযোজ্য নয়", en: "No land tax applies" }
      : { bn: `ভূমি উন্নয়ন কর পরিশোধিত (${taxYearLabel(tax.paidUpTo)} পর্যন্ত)`, en: `Land tax paid (up to ${taxYearLabel(tax.paidUpTo)})` },
  });

  const verdict = rules.some((r) => r.status === "fail") ? "blocked" : rules.some((r) => r.status === "warn") ? "warning" : "clear";
  return { rules, verdict, owned, qty };
}

// ---- Actions ----
export function logCheck(state, input, check, officer, time) {
  const plot = state.plots[input.plot];
  const sellerName = state.people[input.seller] || { bn: input.seller, en: input.seller };
  const failed = check.rules.filter((r) => r.status === "fail");
  const text =
    check.verdict === "blocked"
      ? {
          bn: `আটকানো হয়েছে: ${sellerName.bn}, দাগ ${plot.dag}, ${F.display(check.qty)} শতাংশ। কারণ: ${failed.map((r) => r.detail.bn).join("; ")}`,
          en: `Blocked: ${sellerName.en}, Dag ${plot.dag}, ${F.display(check.qty)} decimals. Reason: ${failed.map((r) => r.detail.en).join("; ")}`,
        }
      : {
          bn: `যাচাই পাস: ${sellerName.bn}, দাগ ${plot.dag}, ${F.display(check.qty)} শতাংশ${check.verdict === "warning" ? " (সতর্কতাসহ)" : ""}`,
          en: `Checks passed: ${sellerName.en}, Dag ${plot.dag}, ${F.display(check.qty)} decimals${check.verdict === "warning" ? " (with warnings)" : ""}`,
        };
  return appendLog(state, { ...(time && { time }), user: officer, kind: "check", result: check.verdict === "blocked" ? "blocked" : check.verdict === "warning" ? "warning" : "passed", plot: input.plot, text });
}

// ---- Land services: log wording ----
const who = (state, id) => state.people[id] || { bn: id, en: id };
const dags = (state, plots) => plots.map((p) => state.plots[p].dag).join(", ");

function noticeText(state, n) {
  return {
    bn: `অধিগ্রহণের আগাম নোটিশ ${n.id} জারি: ${n.project.bn}; দাগ ${dags(state, n.plots)}। ${n.freeze} থেকে বিক্রি বন্ধ, অধিগ্রহণ ${n.acquire} থেকে। মালিকদের সরাসরি জানানো হলো`,
    en: `Advance acquisition notice ${n.id} issued: ${n.project.en}; Dag ${dags(state, n.plots)}. Sales stop from ${n.freeze}, acquisition from ${n.acquire}. Owners told directly`,
  };
}
function khasText(state, k) {
  const q = F.display(F.parse(k.decimals));
  return {
    bn: `খাস জমি বন্দোবস্ত ${k.id}: দাগ ${state.plots[k.plot].dag}-এর ${q} শতাংশ ভূমিহীন পরিবার ${who(state, k.family).bn}-কে`,
    en: `Khas land settlement ${k.id}: ${q} decimals of Dag ${state.plots[k.plot].dag} to landless family ${who(state, k.family).en}`,
  };
}
function borgaText(state, b) {
  const q = F.display(F.parse(b.decimals));
  return {
    bn: `বর্গা চুক্তি ${b.id} নথিভুক্ত: দাগ ${state.plots[b.plot].dag}, ${q} শতাংশ; মালিক ${who(state, b.owner).bn}, বর্গাদার ${who(state, b.bargadar).bn}`,
    en: `Borga agreement ${b.id} recorded: Dag ${state.plots[b.plot].dag}, ${q} decimals; owner ${who(state, b.owner).en}, bargadar ${who(state, b.bargadar).en}`,
  };
}
function erosionText(state, plotId, step, rehab) {
  const s = EROSION_STEPS[step];
  const extra = step === 5 && rehab ? { bn: `: ${rehab.bn}`, en: `: ${rehab.en}` } : { bn: "", en: "" };
  return { bn: `নদীভাঙন, দাগ ${state.plots[plotId].dag}: ${s.bn}${extra.bn}`, en: `River erosion, Dag ${state.plots[plotId].dag}: ${s.en}${extra.en}` };
}
const officerFor = (area, role) => OFFICERS.find((o) => o.role === role && (!o.area || o.area === area))?.id || "system";
export const roleOf = (officer) => officerName(officer)?.role || "subreg";
const need = (ok, en) => {
  if (!ok) throw new Error(en);
};
const nextId = (prefix, map) => {
  const nums = Object.keys(map).map((k) => parseInt(k.split("-").pop(), 10)).filter((n) => !isNaN(n));
  return `${prefix}${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
};

// ---- Land services: actions ----
export function issueNotice(state, { project, plots, freeze, acquire }, officer, today = dateKey()) {
  need(["uno", "magistrate"].includes(roleOf(officer)), "Only a UNO or Executive Magistrate can issue an acquisition notice");
  need(plots.length > 0, "Choose at least one dag");
  need(project?.trim(), "Enter the project name");
  need(freeze >= today, "The sales-stop date cannot be in the past");
  need(acquire >= addDays(today, 180), "Acquisition must start at least 6 months after the notice");
  const year = today.slice(0, 4);
  const n = { id: nextId(`AQ-${year}-`, state.notices).replace(/-0+(\d{2,})$/, "-$1"), project: { bn: project.trim(), en: project.trim() }, plots, date: today, freeze, acquire, by: officer };
  state = { ...state, notices: { ...state.notices, [n.id]: n } };
  return { state: appendLog(state, { user: officer, kind: "notice", result: "notice", plot: plots[0], text: noticeText(state, n) }), value: n };
}

export function recordTaxPayment(state, plotId, officer, today = dateKey()) {
  need(["land", "uno"].includes(roleOf(officer)), "Only the land office records land tax");
  const t = taxStatus(state, plotId, today);
  need(!t.exempt, "No land tax applies to this dag");
  const year = taxYear(today);
  const receipt = `DK-${year}-${String(state.log.length + 1).padStart(5, "0")}`;
  const owed = year - (t.paidUpTo ?? year - 1);
  need(owed > 0, "Land tax is already paid for this year");
  state = { ...state, tax: { ...state.tax, [plotId]: { paidUpTo: year, receipt } } };
  const dag = state.plots[plotId].dag;
  return {
    state: appendLog(state, {
      user: officer,
      kind: "tax",
      result: "paid",
      plot: plotId,
      text: { bn: `ভূমি উন্নয়ন কর জমা: দাগ ${dag}, ${owed} বছরের কর (${taxYearLabel(year)} পর্যন্ত), দাখিলা ${receipt}`, en: `Land tax paid: Dag ${dag}, ${owed} year(s) (up to ${taxYearLabel(year)}), receipt ${receipt}` },
    }),
    value: receipt,
  };
}

export function advanceErosion(state, plotId, officer, { rehab } = {}, today = dateKey()) {
  const plot = state.plots[plotId];
  need(!plot.flags.khas, "Khas land is handled by the khas register");
  const e = erosionOf(state, plotId);
  const step = e ? e.step + 1 : 0;
  need(step < EROSION_STEPS.length, "This case is already closed");
  need(EROSION_STEPS[step].roles.includes(roleOf(officer)), step >= 4 ? "Only a UNO can verify or rehabilitate a family" : "Only the land office, a UNO or a magistrate can do this step");
  if (step === 5) need(rehab?.trim(), "Describe the rehabilitation");
  const rec = e
    ? { ...e, step, dates: [...e.dates, today], ...(step === 5 && { rehab: { bn: rehab.trim(), en: rehab.trim() } }) }
    : { plot: plotId, year: Number(today.slice(0, 4)), step: 0, dates: [today], rehab: null };
  state = { ...state, erosion: { ...state.erosion, [plotId]: rec } };
  if (step === 1) {
    const tax = { ...state.tax };
    delete tax[plotId];
    state = { ...state, tax };
  }
  return {
    state: appendLog(state, { user: officer, kind: "erosion", result: step >= 4 ? "approved" : "recorded", plot: plotId, text: erosionText(state, plotId, step, rec.rehab) }),
    value: rec,
  };
}

export function recordBorga(state, { plot: plotId, owner, bargadarName, decimals }, officer, today = dateKey()) {
  need(["land", "uno"].includes(roleOf(officer)), "Only the land office records borga agreements");
  const qty = F.parse(decimals);
  need(qty && F.cmp(qty, F.ZERO) > 0, "Enter the area in decimals");
  const free = F.sub(shareOf(state, plotId, owner), F.sum(borgaOn(state, plotId).filter((b) => b.owner === owner).map((b) => b.decimals)));
  need(F.cmp(qty, free) <= 0, `The owner has only ${F.display(free)} decimals not already on borga`);
  let bargadar;
  [state, bargadar] = ensurePerson(state, bargadarName);
  need(bargadar !== owner, "The owner cannot be their own bargadar");
  const b = { id: nextId("B-", state.borga), plot: plotId, owner, bargadar, decimals: F.toKey(qty), since: today, by: officer };
  state = { ...state, borga: { ...state.borga, [b.id]: b } };
  return { state: appendLog(state, { user: officer, kind: "borga", result: "recorded", plot: plotId, text: borgaText(state, b) }), value: b };
}

export function settleKhas(state, { plot: plotId, familyName, decimals }, officer, today = dateKey()) {
  need(roleOf(officer) === "uno", "Only a UNO settles khas land");
  need(state.plots[plotId].flags.khas, "This dag is not khas land");
  let family;
  [state, family] = ensurePerson(state, familyName);
  const { ok } = khasChecks(state, { plot: plotId, person: family, decimals }, today);
  need(ok, "The family does not meet the settlement checks");
  const k = { id: nextId(`K-${today.slice(0, 4)}-`, state.khas).replace(/-0+(\d{3,})$/, "-$1"), plot: plotId, family, decimals: F.toKey(F.parse(decimals)), date: today, by: officer };
  state = { ...state, khas: { ...state.khas, [k.id]: k } };
  state = appendLog(state, { user: officer, kind: "khas", result: "recorded", plot: plotId, text: khasText(state, k) });
  if (!cardOf(state, family)) state = issueCardRaw(state, family, officer, today);
  return { state, value: k };
}

function issueCardRaw(state, person, officer, today) {
  const no = String(state.nextCard);
  state = { ...state, cards: { ...state.cards, [no]: { person, issued: today } }, nextCard: state.nextCard + 1 };
  return appendLog(state, {
    user: officer,
    kind: "card",
    result: "recorded",
    text: { bn: `কৃষক কার্ড নং ${no} দেওয়া হলো: ${who(state, person).bn}`, en: `Krishak Card no. ${no} issued to ${who(state, person).en}` },
  });
}
export function issueCard(state, person, officer, today = dateKey()) {
  need(roleOf(officer) !== "subreg", "The land office or UNO issues Krishak Cards");
  need(!cardOf(state, person), "This person already has a card");
  need(cardEligible(state, person), "Only people who own or farm farmland on record can get a card");
  const next = issueCardRaw(state, person, officer, today);
  return { state: next, value: String(state.nextCard) };
}

function ensurePerson(state, name) {
  const existing = findPerson(state, name);
  if (existing) return [state, existing];
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  const clean = String(name).trim();
  return [{ ...state, people: { ...state.people, [id]: { bn: clean, en: clean } } }, id];
}

function applyTransfer(state, plotId, seller, buyer, qty) {
  const s = { ...state.shares[plotId] };
  s[seller] = F.toKey(F.sub(F.parse(s[seller] || "0"), qty));
  s[buyer] = F.toKey(F.add(F.parse(s[buyer] || "0"), qty));
  if (F.isZero(F.parse(s[seller]))) delete s[seller];
  return { ...state, shares: { ...state.shares, [plotId]: s } };
}

export async function registerSale(state, input, officer, today = dateKey()) {
  const check = checkSale(state, input, today);
  if (check.verdict === "blocked") throw new Error("Sale is blocked");
  let buyer;
  [state, buyer] = ensurePerson(state, input.buyerName);
  if (buyer === input.seller) throw new Error("Buyer and seller are the same person");
  const deed = {
    no: `2026-${String(state.nextDeed).padStart(4, "0")}`,
    plot: input.plot,
    seller: input.seller,
    buyer,
    decimals: F.toKey(check.qty),
    date: today,
    officer,
  };
  deed.fingerprint = await sha256(fingerprintText(deed, state));
  state = applyTransfer(state, input.plot, input.seller, buyer, check.qty);
  state = { ...state, deeds: [...state.deeds, deed], nextDeed: state.nextDeed + 1 };
  // A borga agreement stays with the land: if the seller no longer holds enough, it moves to the buyer.
  const left = shareOf(state, input.plot, input.seller);
  const moved = borgaOn(state, input.plot).filter((b) => b.owner === input.seller && F.cmp(F.parse(b.decimals), left) > 0);
  if (moved.length) state = { ...state, borga: { ...state.borga, ...Object.fromEntries(moved.map((b) => [b.id, { ...b, owner: buyer }])) } };
  const plot = state.plots[input.plot];
  state = appendLog(state, {
    user: officer,
    kind: "register",
    result: "approved",
    plot: input.plot,
    deed: deed.no,
    text: {
      bn: `দলিল ${deed.no} নিবন্ধিত: ${state.people[input.seller].bn} → ${state.people[buyer].bn}, দাগ ${plot.dag}, ${F.display(check.qty)} শতাংশ`,
      en: `Deed ${deed.no} registered: ${state.people[input.seller].en} → ${state.people[buyer].en}, Dag ${plot.dag}, ${F.display(check.qty)} decimals`,
    },
  });
  for (const b of moved)
    state = appendLog(state, {
      user: officer,
      kind: "borga",
      result: "info",
      plot: input.plot,
      deed: deed.no,
      text: { bn: `বর্গা চুক্তি ${b.id} বহাল: নতুন মালিক ${state.people[buyer].bn}, বর্গাদার ${state.people[b.bargadar].bn}`, en: `Borga agreement ${b.id} continues: new owner ${state.people[buyer].en}, bargadar ${state.people[b.bargadar].en}` },
    });
  return { state, deed };
}

// ---- Deed verification (QR) ----
export function verifyDeed(state, deedNo, qrHash) {
  const deed = state.deeds.find((d) => d.no === deedNo);
  if (!deed) return { found: false };
  const recomputed = sha256Sync(fingerprintText(deed, state));
  const recordIntact = recomputed === deed.fingerprint;
  const qrMatches = qrHash ? qrHash.toLowerCase() === recomputed : null;
  return { found: true, deed, recomputed, recordIntact, qrMatches };
}

export function logVerification(state, deedNo, result, who = "citizen", time) {
  return appendLog(state, {
    ...(time && { time }),
    user: who,
    kind: "verify",
    result,
    deed: deedNo,
    text:
      result === "genuine"
        ? { bn: `দলিল ${deedNo} যাচাই: আসল`, en: `Deed ${deedNo} verified: genuine` }
        : result === "altered"
        ? { bn: `দলিল ${deedNo} যাচাই: বদলানো কপি ধরা পড়েছে`, en: `Deed ${deedNo} checked: altered copy detected` }
        : { bn: `দলিল ${deedNo} যাচাই: কিউআর রেকর্ডের সঙ্গে মেলেনি`, en: `Deed ${deedNo} checked: QR does not match the record` },
  });
}

// ---- Citizen: one-word answer for a plot ----
export function plotStatus(state, plotId, today = dateKey()) {
  const plot = state.plots[plotId];
  const owners = ownersOf(state, plotId);
  const reasons = [];
  const cc = plot.flags.courtCase;
  if (cc) reasons.push({ level: "risky", bn: `এই জমিতে চলমান মামলা আছে (${cc.bn})`, en: `Open court case on this plot (${cc.en})` });
  if (plot.flags.khas) {
    const settled = khasOn(state, plotId);
    const q = F.display(F.sum(settled.map((k) => k.decimals)));
    reasons.push({
      level: "risky",
      bn: `এটি সরকারি খাস জমি; কেউ ব্যক্তিগতভাবে বিক্রি করতে পারেন না${settled.length ? `। ${q} শতাংশ ${settled.length}টি ভূমিহীন পরিবারকে চাষের জন্য বন্দোবস্ত দেওয়া` : ""}`,
      en: `This is government khas land; no private person can sell it${settled.length ? `. ${q} decimals are settled to ${settled.length} landless ${settled.length === 1 ? "family" : "families"} to farm` : ""}`,
    });
  }
  const er = erosionOf(state, plotId);
  if (er && er.step >= 1) reasons.push({ level: "risky", bn: `জমিটি ${er.year} সালে নদীতে বিলীন (সরেজমিন তদন্তে নিশ্চিত); কেনাবেচা করা যায় না`, en: `The land was lost to the river in ${er.year} (confirmed by a field visit); it cannot be bought or sold` });
  else if (er) reasons.push({ level: "careful", bn: "স্যাটেলাইট ছবিতে জমিটি নদীতে বিলীন দেখা যাচ্ছে; সরেজমিন তদন্ত চলছে", en: "Satellite images show the land may be lost to the river; a field visit is pending" });
  if (plot.flags.acquisition) reasons.push({ level: "risky", bn: `জমিটি সরকারি অধিগ্রহণাধীন (${plot.flags.acquisition.bn})`, en: `The plot is under government acquisition (${plot.flags.acquisition.en})` });
  const notice = noticeOn(state, plotId, today);
  const after = notice ? salesAfterNotice(state, notice).filter((d) => d.plot === plotId) : [];
  if (notice)
    reasons.push(
      notice.frozen
        ? { level: "risky", bn: `অধিগ্রহণের আগাম নোটিশ ${notice.id} (${notice.project.bn}); ${notice.freeze} থেকে কেনাবেচা বন্ধ`, en: `Advance acquisition notice ${notice.id} (${notice.project.en}); sales stopped from ${notice.freeze}` }
        : { level: "careful", bn: `অধিগ্রহণের আগাম নোটিশ ${notice.id} (${notice.project.bn}); ${notice.freeze} থেকে কেনাবেচা বন্ধ হবে`, en: `Advance acquisition notice ${notice.id} (${notice.project.en}); sales stop from ${notice.freeze}` }
    );
  if (after.length)
    reasons.push({ level: "careful", bn: `নোটিশের পরে বিক্রি (দলিল ${after.map((d) => d.no).join(", ")}): ক্ষতিপূরণ যাচাইয়ের সময় আলাদা করে দেখা হবে`, en: `Sold after the notice (deed ${after.map((d) => d.no).join(", ")}): checked separately when compensation is worked out` });
  if (plot.flags.mortgage) reasons.push({ level: "careful", bn: "জমিটি ব্যাংকে বন্ধক আছে; ঋণ শোধের প্রমাণ দেখে নিন", en: "The plot is mortgaged to a bank; ask for proof the loan is repaid" });
  const tax = taxStatus(state, plotId, today);
  if (tax.alert) reasons.push({ level: "careful", bn: `ভূমি উন্নয়ন কর টানা ${tax.overdue} বছর বকেয়া; কেনার আগে বকেয়া শোধের রসিদ (দাখিলা) দেখে নিন`, en: `Land tax is ${tax.overdue} years overdue; see the receipt (dakhila) for the dues before you buy` });
  for (const b of borgaOn(state, plotId))
    reasons.push({ level: "careful", bn: `${F.display(F.parse(b.decimals))} শতাংশে লিখিত বর্গা চুক্তি আছে (বর্গাদার ${state.people[b.bargadar].bn}); জমি বিক্রি হলেও চুক্তি বহাল থাকে`, en: `${F.display(F.parse(b.decimals))} decimals are farmed under a written borga agreement (bargadar ${state.people[b.bargadar].en}); it continues after a sale` });
  const recent = state.deeds.filter((d) => d.plot === plotId && daysBetween(d.date, today) <= 30);
  if (recent.length) reasons.push({ level: "careful", bn: `গত ৩০ দিনে এই জমির অংশ বিক্রি হয়েছে (দলিল ${recent.map((d) => d.no).join(", ")})`, en: `Part of this plot was sold in the last 30 days (deed ${recent.map((d) => d.no).join(", ")})` });
  if (owners.length > 1) reasons.push({ level: "careful", bn: `${owners.length} জন শরিক; আপনি অবিভক্ত অংশ কিনবেন, আর শরিকদের অগ্রক্রয়ের অধিকার থাকতে পারে`, en: `${owners.length} co-owners; you would buy an undivided share, and co-owners may have a pre-emption right` });
  const level = reasons.some((r) => r.level === "risky") ? "risky" : reasons.some((r) => r.level === "careful") ? "careful" : "safe";
  if (level === "safe") reasons.push({ level: "safe", bn: "কোনো মামলা, বন্ধক, সরকারি দাবি বা বকেয়া কর নথিভুক্ত নেই", en: "No court case, mortgage, government claim or overdue tax on record" });
  return { level, reasons, owners };
}

export function exportSync(state) {
  const deeds = state.deeds.slice(state.seedDeedCount).map((d) => [d.no, d.plot, d.seller, state.people[d.buyer].bn, state.people[d.buyer].en, d.decimals, d.date, d.officer]);
  const json = JSON.stringify(deeds);
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function importSync(state, payload) {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const rows = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
  let added = 0;
  for (const [no, plot, seller, buyerBn, buyerEn, decimals, date, officer] of rows) {
    if (state.deeds.some((d) => d.no === no)) continue;
    let buyer = findPerson(state, buyerEn) || findPerson(state, buyerBn);
    if (!buyer) {
      buyer = "p" + Math.random().toString(36).slice(2, 9);
      state = { ...state, people: { ...state.people, [buyer]: { bn: buyerBn, en: buyerEn } } };
    }
    const deed = { no, plot, seller, buyer, decimals, date, officer };
    deed.fingerprint = sha256Sync(fingerprintText(deed, state));
    state = applyTransfer(state, plot, seller, buyer, F.parse(decimals));
    state = { ...state, deeds: [...state.deeds, deed], nextDeed: Math.max(state.nextDeed, parseInt(no.split("-")[1], 10) + 1) };
    added++;
  }
  if (added)
    state = appendLog(state, { user: "sync", kind: "sync", result: "info", text: { bn: `অফিসার পোর্টাল থেকে ${added}টি দলিল যুক্ত হলো`, en: `${added} deed(s) copied from the Officer Portal` } });
  return { state, added };
}

export const officerName = (id) => OFFICERS.find((o) => o.id === id);
