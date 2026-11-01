# JomiJachai (জমিযাচাই)

**Secure land for every family, checked before it is sold.** JomiJachai checks every land sale against eight rules *before* the deed is registered, and lets anyone verify a deed with one phone tap, in Bangla. On the same register it runs the land services a village family needs: land tax status, advance notice of government acquisition, river-erosion rehabilitation, khas land for the landless, protected borga (sharecropping), and a Krishak Card (farmer card) for each farmer.

BCS ICT Fest 2026 · Project Showcasing · Software project

> **All data in this app is fictional.** No real land records, names, NID or phone numbers are used, and nothing is taken from government websites.

- Live site: [jomijachai-production.up.railway.app](https://jomijachai-production.up.railway.app/)
- Team: **ICCHE GHURI** · `[team members]`

---

## The problem

- About 80% of court cases in Bangladesh are land-related, and about 4.5 million cases were pending at the end of 2024 (Daily Observer). One household in seven is in a land dispute, which costs it about 45% of its yearly income (PRI/BRAC study, Daily Star).
- The same plot is often sold twice, or a co-owner sells more than their share, because the khatian does not show what each owner has already sold. The Sub-Registrar has no quick way to check.
- Farmers hear about government acquisition late and sell cheap to middlemen. Families who lose land to river erosion wait years to be recognised. Khas land meant for the landless and the rights of sharecroppers (bargadars) are hard to track. Land tax piles up unnoticed until recovery action starts.

## How it works

1. **One register, two screens.** The *Officer Portal* (`#officer`) is for the Sub-Registry, the land office and the UNO, on a computer. The *Citizen App* (`#citizen`) is a phone app for buyers, owners and farmers.
2. **A share register.** For every dag (plot) the register keeps how many decimals each owner still holds, as exact fractions, so a sale can never take more than the seller has left.
3. **Eight checks before registration.** When a sale application is submitted, the checker runs eight rules (below). The officer sees one answer: approved, refused with the reason, or warnings to review.
4. **Tamper-evident deeds.** An approved deed gets a SHA-256 fingerprint and a QR code. Scanning the QR tells a buyer whether the paper is genuine, an altered copy, or a fake.
5. **Append-only activity log.** Every check, approval, notice, tax payment and settlement is written to a log where each line holds the previous line's hash, so changing any old line is detected.
6. **Land services on the same register.** Tax, acquisition notices, erosion cases, khas settlements, borga agreements and Krishak Cards are records linked to dags and people, so each one also affects the sale checks and the messages a person sees.

## How it serves the SDGs

| Goal | UN target | What JomiJachai does today |
|---|---|---|
| **SDG 1** No poverty | 1.4: equal rights to ownership and control over land | Every owner's remaining share is on record, so nobody can sell a poorer co-owner's share. Khas farmland is settled to landless families, with eligibility checked from the register. |
| **SDG 2** Zero hunger | 2.3: secure and equal access to land for small food producers | The Krishak Card works out from the register who is a landless, marginal, small, medium or large farmer. A recorded borga agreement stays with the land when it is sold, so the bargadar is not evicted. |
| **SDG 5** Gender equality | 5.a: women's equal rights to own and control land | Shares that sisters, daughters and mothers inherit sit on the register in their own names. When a co-sharer sells, they are told directly, including their right of pre-emption. |
| **SDG 13** Climate action | 13.1: resilience to climate-related disasters | Families who lose land to river erosion are identified and verified in six recorded steps. Sales of the lost land stop, its tax is waived, and the family gets priority for khas land. |
| **SDG 16** Peace, justice and strong institutions | 16.5: less corruption and bribery; 16.6: accountable, transparent institutions | Eight checks block over-selling and double-selling before registration. QR-verified deeds and a hash-chained log make changes visible. Advance acquisition notices stop middlemen buying cheap. |

The website's SDG section shows live counts from the register for each goal.

---

## What works

| Feature | Where |
|---|---|
| **Eight-rule checker** runs when a sale application is submitted; the officer sees only the result | Officer Portal → Register a sale |
| **Sale notes**: which co-sharers will be told, who may claim pre-emption, and which borga agreements go with the land | Officer Portal → Register a sale |
| **Share register** with each owner's basis (inheritance, purchase with deed number, or khatian record), as exact fractions | Officer Portal → Plots & shares |
| **Deed with SHA-256 fingerprint and QR code**, printable | Officer Portal → Deeds |
| **Append-only activity log**, chained by SHA-256 | Officer Portal → Activity log |
| **Advance acquisition notice**: a UNO or Executive Magistrate picks the dags, the date sales stop and the acquisition date (at least 6 months on). Every owner and bargadar gets a message; sales after the notice are flagged for the compensation review | Officer Portal → Acquisition notices |
| **Land development tax**: paid-up year for every dag, an alert when 3 or more years are overdue, and a payment record with a receipt number | Officer Portal → Land tax |
| **River erosion**: six steps (satellite flag → field visit → old records → witnesses → verified by UNO → rehabilitated), each with who and when. Lost dags are drawn blue and dashed on the map | Officer Portal → River erosion |
| **Khas land settlement** (UNO only), with live checks: free land on the dag, the family owns no farmland, total stays within 1 acre, recent land sales flagged, river-hit families first. A Krishak Card is issued at once | Officer Portal → Khas land & borga |
| **Borga agreements** (land office): owner, bargadar, area; cannot exceed the owner's share | Officer Portal → Khas land & borga |
| **Krishak Card**: card number, farmer category, land owned, farmed on borga and settled from khas, every related message, and a QR link | Citizen App → Krishak Card; Officer Portal → Krishak Card |
| **Statistics** with filters by date, area, dag and type (including the new services) | Officer Portal → Statistics |
| **Check land before buying**: search a dag; the map pins it and a card lists every warning (court case, notice, tax, erosion, borga…), with **Read aloud** in Bangla | Citizen App → Check land |
| **Verify a deed**: scan its QR → genuine, altered copy, or fake QR | Citizen App → Check a deed |
| Bangla first, English toggle, light and dark theme; installable phone app (PWA) | Everywhere |

### The eight rules

| # | Rule | If it fails |
|---|---|---|
| 1 | Seller is a recorded owner of this dag | ❌ Block |
| 2 | Decimals sold ≤ seller's remaining share | ❌ Block (over-selling or double-selling) |
| 3 | No open court case on the plot | ❌ Block |
| 4 | Not khas land and not lost to the river (a satellite flag alone only warns) | ❌ Block |
| 5 | Not mortgaged to a bank | ⚠️ Warning |
| 6 | Not resold within 30 days | ⚠️ Warning |
| 7 | Not under acquisition: blocked once the sales-stop date has passed; a warning while a notice is out before that date | ❌ Block / ⚠️ Warning |
| 8 | Land tax not 3 or more years overdue | ⚠️ Warning |

Code: [`lib/register.js`](lib/register.js) → `checkSale()`; the land services are in [`lib/land-services.js`](lib/land-services.js).

### Planned next phase (shown as mockups, not working yet)

Dividing an inheritance by faraiz, automatic namjari after a checked sale, paying land tax by SMS and bKash like a utility bill, SMS copies of the in-app messages, and help at Union Digital Centres with OTP consent. See Officer Portal → Next phase.

### Laws the rules follow (to be confirmed by a lawyer; we are not lawyers)

- Transfer of Property Act 1882 (a sale must be registered); Registration Act 1908 (the seller must be in the latest record).
- State Acquisition and Tenancy Act 1950, s.96: pre-emption by a co-sharer by inheritance, within 2 months of notice, depositing the price + 25% + 8% a year.
- Acquisition and Requisition of Immovable Property Act 2017 (acquisition and compensation). The 6-month minimum notice and the sales stop are JomiJachai's own design.
- Land Development Tax Act 2023 (tax year 1 July – 30 June). The 3-year alert is our design choice.
- Agricultural khas land settlement policy: khas farmland to landless farming families, up to 1 acre per family.
- Land Reform law on borga: the crop is shared in thirds, and a bargadar cannot be evicted without lawful grounds.
- Farmer categories follow the Bangladesh Bureau of Statistics land bands: under 5 decimals landless, 5–49 marginal, 50–249 small, 250–749 medium, 750+ large.

---

## Data storage: two backends behind one API

Every screen reads and changes the land register only through one API (`lib/api/`). The rules always run in `lib/register.js`; the API hands each change to one of two backends:

- **This browser (default, no setup).** The register is saved in each device's browser (localStorage). **Officer Portal → Sync to phone** copies new deeds to a phone through a QR link. The sync link carries deeds only; notices, tax payments, erosion steps, settlements, borga agreements and cards stay on the device where they were made.
- **Shared database (Supabase / PostgreSQL).** Switches on by itself when two keys are set. Every device then shares one register, and changes appear live. The database refuses any edit or delete of deeds and log lines, and checks the log's hash chain.

### Switch on the shared database (about 10 minutes)

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**.
3. In **Project Settings → API**, copy the **Project URL** and the **anon public** key.
4. Put them in `.env.local` (and in your hosting provider's environment variables) as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`, then build again.

> **Already set up before the land services were added?** Run `supabase/schema.sql` again. It adds the `records` table that holds tax, notices, erosion cases, khas settlements, borga agreements and cards. Without it the site shows "Could not reach the database". Running it resets the register to the sample data.

The footer and the Officer Portal show which backend is in use.

### Google Maps view (optional)

The land map works without any setup (satellite photo and street map). A **Google** view with the same outlines appears when a Google Maps API key is set:

1. Go to [console.cloud.google.com](https://console.cloud.google.com), create a project and turn on **Maps JavaScript API** (Google asks for a billing card; the monthly free usage is far more than this project needs).
2. **APIs & Services → Credentials → Create credentials → API key.** Under **API restrictions**, choose **Restrict key → Maps JavaScript API**. Leave **Application restrictions** on **None**: the site sends no "Referer" header (needed for the Bangla voice), so a website restriction would block the map. Set a daily quota under **Quotas** to be safe.
3. Put the key in `.env.local` (and in your hosting provider's environment variables) as `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, then build again.

Without a key, the dag card's **Open in Google Maps** link opens the spot in the Google Maps app.

---

## Run it on your computer

You need **Node.js 22 or newer** (download from nodejs.org).

```bash
npm install
npm run dev
```

Open http://localhost:3000. To test on a phone on the same Wi-Fi, open `http://<your computer's IP>:3000` on the phone.

Build the static website (written to the `out/` folder):

```bash
npm run build
```

**Install on a phone:** open the site in Chrome on Android → menu (⋮) → **Add to Home screen**.

### Try it

| To see | Do this |
|---|---|
| Double-selling blocked | Officer Portal → Register a sale → dag 245, seller Karim, 40 decimals → refused (Karim has 25) |
| A clean sale and its deed | Same dag, 20 decimals → approved as deed 2026-0147 → scan its QR |
| Acquisition notice | Choose a UNO as officer → Acquisition notices → issue one; open that owner's Krishak Card to see the message |
| River erosion | Area Charpara → River erosion → dags 790, 794, 798 at different steps |
| Khas settlement | A UNO → Khas land & borga → type a new family name → the checks turn green |
| Krishak Card | Citizen App → Krishak Card → try the sample cards |

---

## Project structure

```
app/                 Next.js App Router: layout (fonts, PWA manifest), page, global styles and design tokens
components/
  App.jsx            Screen switching by URL hash, language and theme settings, loading the register
  Landing.jsx        The website: plot search, map, services, SDGs, deed check, questions
  PlotSlip.jsx       A plot's answer printed like a porcha slip (website and Citizen App)
  LandMap.jsx        Real map (Leaflet satellite/street view, or Google Maps) with every dag drawn on it
  brand.jsx          Logo, date strip (Bangla calendar), language/theme toggles, share bar, QR
  ui/                shadcn/ui components
  officer/           Officer Portal: RegisterSale, Plots, Deeds, ActivityLog, Statistics, Notices, LandTax,
                     Erosion, KhasBorga, Cards, SyncPhone, NextPhase
  citizen/           Citizen App: CheckLand, CheckDeed (QR scan + compare), KrishakCard, Help
lib/
  api/               The register API: core.js, local.js (browser), supabase.js (shared database), index.js
  register.js        Land register, eight-rule checker, deeds, verification, log, and every action that changes the register
  land-services.js   Read-only lookups: tax status, notices, erosion, khas, borga, co-sharers, farmer category, messages
  seed.js            The fictional register data (61 dags, owners, earlier deeds, notices, erosion cases, settlements, borga)
  fraction.js        Exact fractions for shares
  sha256.js          SHA-256 (Web Crypto, with a pure-JS fallback)
  qr.js              QR code generator
  bangla-date.js     Bangla calendar date for the top strip
  speech.js          Read aloud in Bangla
  store.js, i18n.js, nav.js, map.js
supabase/            schema.sql: tables, append-only rules, hash-chain check, reset
public/              PWA manifest, service worker, app icons, photos
```

**Tech stack:** Next.js, React, Tailwind CSS, shadcn/ui (Radix, lucide icons), Progressive Web App, SHA-256 via Web Crypto. Data in the browser by default, or a shared Supabase (PostgreSQL) database when its keys are set.

**Design:** Bangla first, in the style of Bangladesh's public land-service portals, with JomiJachai's own name and logo and no government emblems. It is not a government website.

---

## Open-source parts and credits

The idea, the rules, the register, the land services, the QR encoder and every screen were designed and written for this project. It is built on these open-source tools and openly licensed media, used under their licences:

- Next.js, React, Tailwind CSS, shadcn/ui and Radix UI, lucide icons (MIT / ISC licences)
- Leaflet map library (BSD-2); satellite imagery © Esri, Maxar, Earthstar Geographics; street map © OpenStreetMap contributors; Google Maps when a key is set
- Supabase client (MIT), only when the shared database is switched on
- Fonts: Noto Sans Bengali and IBM Plex Mono (SIL Open Font License)
- Photos: Wikimedia Commons (CC BY / CC BY-SA), credited in the site footer and in `assets/credits.json`
- Read aloud: the phone's own Bangla voice, or Google Translate's Bangla voice when the phone has none

## AI tools used

We used **Claude (Anthropic)** as a coding assistant to help write the code and documents. We designed the solution, reviewed the code, and can explain every part of it.
