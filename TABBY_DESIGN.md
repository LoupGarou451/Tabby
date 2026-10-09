# Tabby — Design & Behavior Spec

> **Tabby** splits the tab. Snap the receipt, tap who had what, and everyone knows what they owe before the server brings the card back.

| | |
|---|---|
| **Status** | Design — pre-implementation (awaiting review) |
| **Source brief** | *Take-Home Project: Split the Bill* (`~/Downloads/Take-Home_Project__Split_the_Bill.pdf`) |
| **Repo** | `github.com/LoupGarou451/Tabby` |
| **Run** | `npm install && npm run dev` (hard requirement from the brief) |
| **Last updated** | 2026-10-08 |

---

## 1. Goals

### 1.1 Required by the brief
1. Manually enter receipt items (name + price).
2. Add people to the bill.
3. Assign items to people, including shared items.
4. Handle tax and tip.
5. Show a final summary of what each person owes.
6. Fully client-side — no backend, no accounts, no auth.

### 1.2 Committed extras (this project)
7. **Brief splash logo** when the app opens (section 3).
8. **Receipt image upload** → items, tax, tip, and total extracted automatically **on-device**, then reviewed by the user. (Built *after* 1–6 work end to end, per the brief.)
9. A small set of "stand-out" features (section 8) chosen to answer the brief's prompts:
   - the friend who "only had a salad",
   - two people sharing an entrée,
   - the fastest path from receipt to "everyone knows what they owe",
   - "could you actually use this at dinner?"

### 1.3 Constraints
- **No API keys, no paid services, no third-party accounts.** Every feature runs on free, open-source libraries bundled with the app. Anyone can clone and run it with zero configuration.
- **No backend.** All state lives in the browser.
- **Works offline** once loaded, including receipt scanning (OCR assets are self-hosted; see 7.3).

### 1.4 Non-goals
- User accounts, sync servers, or a database.
- Processing payments. Tabby can *link out* to payment apps through plain URLs, but never moves money.
- Multi-receipt trip ledgers (Splitwise territory). One meal, one bill.

### 1.5 Evaluation criteria → how Tabby answers them

| Reviewer is looking for | Tabby's answer |
|---|---|
| Product instinct | Explicit, documented decisions for every ambiguity (section 6), "fair vs even" comparison, totals that add up to the exact cent |
| Working software | Base flow ships first and stays green; image upload is additive and optional |
| Tool fluency | Built entirely with Claude Code; iterative milestones, commits per milestone |
| UI/UX care | Mobile-first, one-thumb flow, splash, pass-the-phone mode, share sheet |
| Code quality | One pure, unit-tested `computeSplit()`; UI is a thin layer over a small store |

---

## 2. Core User Flow

```
            ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
 Splash ──▶ │ 1. Receipt │──▶│ 2. People  │──▶│ 3. Assign  │──▶│ 4. Tax/Tip │──▶│ 5. Summary │
 (~1.2s)    │ scan/type  │   │ add names  │   │ tap chips  │   │ % or $     │   │ share/pay  │
            └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
```

A persistent bottom bar shows step progress and a live **"Unassigned: $X.XX"** counter so the user always knows what's left. Users can jump between steps; nothing is lost.

### Step 1 — Receipt
- **Scan receipt** (primary button): camera/photo picker → on-device extraction → review (section 7).
- **Enter manually**: fast-entry row — `name` · `price` · `qty` (default 1). Enter moves to the next row; prices accept `12`, `12.5`, `$12.50`.
- **Try a sample receipt**: loads demo data so reviewers can see the whole flow in 10 seconds.
- Optional receipt-level fields: **Tax**, **Tip already included / service charge**, **Printed total** (used for reconciliation).

### Step 2 — People
- Add by name; each gets a color + initial avatar chip.
- Quick-add "+1, +2…" to add placeholder diners ("Guest 3") when names don't matter.
- Recent names from previous bills are offered as one-tap chips (localStorage).
- Optionally mark one person as **"I paid"** (the payer — used for payment links in step 5).

### Step 3 — Assign
- Each item is a card with the row of people chips beneath it. **Tap a chip to toggle** that person onto the item.
- One person tapped → they own it. Several tapped → split evenly among them.
- Long-press (or "⋯") an item for **custom shares** — e.g. Alex 2 parts, Sam 1 part ("I only had a couple bites").
- Shortcuts: **Everyone** (appetizers, shared bottle), **Split remaining items evenly**, and a **per-person mode** where you pick a person and tap all of *their* items (faster for "I just had the salad").
- Items with `qty > 1` can be **expanded into units** ("3 × Beer $18" → three $6 beers) so each can go to a different person.

### Step 4 — Tax & Tip
- **Tax**: dollar amount from the receipt (default) or a percentage.
- **Tip**: preset buttons **18% / 20% / 22%**, custom %, or custom $ amount.
- **Tip base** toggle: *pre-tax subtotal* (default) or *post-tax total*.
- If the receipt already includes gratuity/service charge, tip defaults to 0% with a notice.

### Step 5 — Summary
- One card per person: **total owed** in large type, expandable breakdown (their items with share fractions, tax share, tip share).
- Footer reconciliation: `Σ people = Bill total ✓` (to the cent).
- **Fair vs. Even** toggle showing what each person would pay under an even split, with the difference ("Priya saves $14.20 with a fair split").
- Actions: **Share summary** (Web Share API / copy as text), **Share link** (section 8.2), **Request payment** links, **Mark as paid** checkboxes.

---

## 3. Splash Logo

A short branded moment when the app opens. It should feel polished, never feel slow, and never block someone who's in a hurry.

### 3.1 Logo
- **Proposed concept:** a friendly, minimal **tabby-cat face whose forehead stripes are receipt lines**, with a small zig-zag "torn receipt" edge along the bottom of the chin. It's a pun on the name and reads clearly at favicon size. *(See open question Q2 for alternatives.)*
- **Format:** a single hand-authored **inline SVG** (`src/brand/Logo.tsx`, also exported as `public/logo.svg`). No image files, no icon-font or design-tool dependency.
- **Palette:** warm tabby orange (`#F28C28`) with a dark ink stroke (`#2B2118`). In dark mode the background flips to near-black and the ink stroke lightens. Colors are CSS custom properties, so one SVG serves both themes.
- **Wordmark:** "Tabby" in a rounded system-font stack (`ui-rounded, "SF Pro Rounded", system-ui, sans-serif`), so there's no web-font download.
- **Reuse:** the same SVG becomes the favicon, the `apple-touch-icon`, and the PWA icon, plus a small header logo inside the app.

### 3.2 Behavior
| Rule | Detail |
|---|---|
| **When** | Cold app open only — once per browser session (`sessionStorage` flag). Not shown on in-app navigation, on reloads within the same session, or when opening a shared bill link (people opening a link want their total right away). |
| **Duration** | ~1.2 s total: 300 ms logo pop-in (scale 0.9 → 1, fade in) → hold → 300 ms fade-out. |
| **Never slows the app** | The splash is markup in `index.html`, so it paints before JavaScript loads. React mounts the app *underneath* it, and the splash fades out at whichever comes later: the minimum display time or the app being ready. It never waits longer than the minimum once the app is ready. |
| **Skippable** | Tap or press any key to dismiss immediately. |
| **Reduced motion** | When `prefers-reduced-motion: reduce` is set: no scale animation, a quick 150 ms cross-fade, and a shorter ~600 ms hold. |
| **Accessibility** | `role="img"` with `aria-label="Tabby"`; the overlay is `aria-hidden` once dismissed and doesn't trap focus. |

### 3.3 Implementation sketch
- `index.html`: a `<div id="splash">` holding the inline SVG plus a CSS keyframe animation. This avoids a white flash.
- `src/brand/useSplash.ts`: on mount, checks the session flag and the shared-link hash, waits out the remaining minimum time, adds a `splash--out` class, and removes the node on `transitionend`.
- About 40 lines of code and no dependencies.

---

## 4. Tech Stack

Everything is free and open source (MIT / Apache-2.0) and bundled. **No API keys, no accounts, no paid tiers.**

| Concern | Choice | Why |
|---|---|---|
| Build / dev server | **Vite** + **React 18** + **TypeScript** | Fastest path to `npm install && npm run dev`; no server runtime needed |
| Styling | **Tailwind CSS** | Quick, consistent mobile-first UI; easy dark mode |
| State | **Zustand** + `persist` middleware (localStorage) | Tiny, no boilerplate; survives a refresh at the table |
| Validation | **Zod** | Validates user input, share-link payloads, and parsed OCR output |
| Receipt OCR | **tesseract.js** (Apache-2.0), lazy-loaded, assets self-hosted | Free, on-device, works offline; no external service |
| Share links | **lz-string** | Compresses bill state into a URL hash |
| QR codes | **qrcode** | Generated locally as SVG/canvas |
| Tests | **Vitest** | Unit tests for the money math and receipt parser (where bugs would hurt most) |
| PWA (stretch) | `vite-plugin-pwa` | "Add to Home Screen", works offline at the restaurant |

No router is required — the five steps are a single-page stepper. Shared links use the URL hash.

---

## 5. Data Model

All money is stored as **integer cents**. Floats never touch money.

```ts
type Cents = number; // integer

interface Person {
  id: string;
  name: string;
  color: string;        // avatar color token
}

interface Item {
  id: string;
  name: string;
  priceCents: Cents;    // line total (qty × unit)
  quantity: number;     // default 1
  shares: Record<string /* personId */, number /* weight */>; // {} = unassigned
  source: 'manual' | 'scan';
  confidence?: number;  // from OCR, 0–1, drives "please review" highlighting
}

interface Adjustments {
  tax:  { mode: 'amount'; cents: Cents } | { mode: 'percent'; rate: number };
  tip:  { mode: 'amount'; cents: Cents } | { mode: 'percent'; rate: number };
  tipBase: 'preTax' | 'postTax';
  serviceChargeCents: Cents;   // auto-gratuity on the receipt
  discountCents: Cents;        // coupons / comps, applied proportionally
}

interface Bill {
  id: string;
  title: string;               // "Friday at Nopa"
  createdAt: string;
  currency: string;            // 'USD' default; Intl.NumberFormat for display
  people: Person[];
  items: Item[];
  adjustments: Adjustments;
  payerId?: string;
  printedTotalCents?: Cents;   // from receipt, for reconciliation
  paid: Record<string, boolean>;
}
```

Storing `shares` as **weights** handles every assignment case with one shape:
- solo: `{ alex: 1 }`
- even split: `{ alex: 1, sam: 1 }`
- uneven split: `{ alex: 2, sam: 1 }`

---

## 6. Calculation Rules (the product decisions)

All logic lives in one pure function — `computeSplit(bill): SplitResult` in `src/lib/split.ts` — with unit tests. The UI never does arithmetic.

### 6.1 Algorithm
1. **Item shares.** For each item, divide `priceCents` across its weights using the *largest-remainder method*: give everyone the rounded-down amount, then hand out the leftover cents one at a time to the largest fractional remainders, breaking ties by a stable person order. Each item's per-person cents then sum *exactly* to the item price.
2. **Per-person subtotal** = Σ their item shares.
3. **Discount** is allocated in proportion to each subtotal (largest-remainder again).
4. **Tax** is allocated in proportion to each post-discount subtotal.
   - *Why proportional, not even:* the salad-eater shouldn't pay tax on someone else's steak.
5. **Tip** is computed on the chosen base (pre-tax subtotal by default), then allocated proportionally.
   - *Why pre-tax by default:* that's the etiquette convention; post-tax is one toggle away.
6. **Service charge** is allocated proportionally, like tip.
7. **Total per person** = subtotal − discount + tax + tip + service.

### 6.2 Invariants (tested)
- `Σ person totals === bill total` — to the cent, always.
- Every allocation is a non-negative integer.
- Same input → same output (deterministic tie-breaking for leftover cents).
- Unassigned items are **excluded** from per-person totals and shown as a blocking warning on the Summary ("$12.00 still unassigned — assign or split evenly?"). They're never silently spread across everyone.

### 6.3 Decisions on ambiguous cases

| Situation | Decision |
|---|---|
| Friend "only had a salad" | Proportional tax & tip by default; Summary shows **Fair vs Even** so the group sees why. |
| Two people share an entrée | Tap both chips → 50/50. Uneven? Custom weights (2:1, etc.). |
| Shared appetizer for the table | **Everyone** shortcut. |
| One person covers another (birthday) | "Treat" toggle on a person: their total is redistributed proportionally across everyone else (section 8.5). |
| Leftover cent from rounding | Largest-remainder method; the payer never silently absorbs a penny. |
| Scanned items don't add up to printed subtotal | Reconciliation banner shows the difference, with a one-tap "Add as 'Unlisted item'" fix. |
| Tip already on the receipt | Detected as a service charge; tip defaults to 0%. |
| Zero people or zero items | Steps can be skipped, but the Summary shows an empty state with a clear next action. |

---

## 7. Receipt Image Upload (on-device OCR)

Built only after sections 2–6 work end to end, as the brief requires. It's purely additive: its output is the same `Item[]` + `Adjustments` that the manual flow produces. **Everything runs in the browser — the image never leaves the device.**

### 7.1 Flow
```
Pick/take photo ─▶ Crop & straighten ─▶ Preprocess ─▶ OCR (Web Worker) ─▶ Line parser ─▶ Zod validate ─▶ Review screen ─▶ Items in bill
```

1. **Capture**: `<input type="file" accept="image/*" capture="environment">` opens the rear camera on phones and a file picker on desktop. Drag-and-drop and paste also work.
2. **Crop & rotate** (lightweight, hand-built): the photo appears with a draggable crop rectangle and a 90° rotate button. Trimming the table and background around the receipt is the biggest single accuracy gain for OCR. "Use whole image" skips this step.
3. **Preprocess** with a plain `<canvas>` (no library):
   - apply the photo's orientation, then scale so the receipt is about 1500–2000 px tall (upscale small photos, downscale huge ones),
   - grayscale → contrast stretch → adaptive threshold to black-on-white, which handles shadows and thermal-paper fade.
4. **OCR**: `tesseract.js` runs in a Web Worker so the UI stays responsive. A progress bar is driven by Tesseract's `logger` callback. It's configured for receipts: English, single-column page segmentation, and a character whitelist that favors letters, digits, `$.,-@x%`.
5. **Parse** (`src/scan/parseReceipt.ts`, pure and unit-tested against sample OCR text):
   - **Price lines**: match a trailing amount, e.g. `/^(.*?)\s+\$?(-?\d{1,4}[.,]\d{2})\s*[A-Z]?$/` (the optional trailing letter covers tax-code flags like `T` or `F`).
   - **Quantities**: leading `2 x`, `2 @`, `2 ` patterns → `quantity`, keeping the printed line total.
   - **Totals section**: keyword detection (case-insensitive and tolerant of OCR typos like `5ubtotal` / `T0TAL`) for `subtotal`, `tax`, `tip`, `gratuity`, `service`, `discount`/`comp`, `total`/`amount due`/`balance`. These go to `Adjustments` / `printedTotalCents`, never to items.
   - **Noise filtering**: drop lines like card numbers, dates/times, phone numbers, addresses, `change`, `cash`, `visa`, and `thank you`.
   - **Modifiers**: an indented line or one starting with `+` (e.g. "+ avocado 2.00") merges into the item above it.
   - **Confidence**: Tesseract's per-line confidence is copied onto each item. Lines below ~70 are flagged for review.
6. **Validate & convert**: Zod schema → integer cents → `Item[]`, plus `adjustments.tax`, `serviceChargeCents`, `discountCents`, and `printedTotalCents`.
7. **Review screen** (always shown, never auto-committed):
   - Receipt thumbnail (tap to zoom) beside the editable item list.
   - Low-confidence rows highlighted in amber; one-tap delete for junk rows.
   - **Reconciliation check**: `Σ items` vs the printed subtotal, and the computed total vs the printed total. A green ✓ when they match; otherwise an amber banner with the difference and quick fixes ("Add as unlisted item", "Edit items").
   - "Looks good →" goes straight to **People** (or to **Assign** if people already exist).

### 7.2 Honest expectations
On-device OCR is good, not perfect. Crumpled, faded, or angled receipts will need some edits. The design handles this with crop, contrast cleanup, low-confidence highlighting, and reconciliation, so the review step is quick rather than frustrating. Manual entry stays one tap away at every point.

### 7.3 Offline & self-hosting
By default, tesseract.js downloads its worker, WASM core, and language data from a public CDN on first use. Tabby instead **copies those assets into `public/tesseract/`** at build time and points `workerPath`, `corePath`, and `langPath` there. That gives:
- no third-party network requests,
- scanning that works offline after the first load,
- about 2–4 MB of assets (English "fast" model), loaded **only** when the user first taps *Scan receipt*. The main bundle is unaffected.

### 7.4 Privacy
- The image is processed in memory and never stored or uploaded. Only a small thumbnail is kept, for the review screen, until the user leaves it.

---

## 8. Stand-Out Features

Ranked by impact versus effort. **Bold = recommended for the first submission.** None require keys or services.

### 8.1 **Fair vs. Even toggle** *(low effort, high signal)*
On the Summary, flip between proportional and even splits, with per-person differences. It answers the "only had a salad" prompt head-on and shows product thinking visually.

### 8.2 **Share link — no backend** *(medium effort, high wow)*
Serialize the bill → `lz-string` compress → put it in the URL hash: `…/#b=N4Ig…`. Friends open it on their phones, **tap their own name**, and see only their total and items, plus a payment button. There's no server and no accounts, so it stays within the brief's "client-side" rule. The link is also shown as a **QR code**, generated locally, so the table can scan the organizer's screen.

### 8.3 **Pass-the-phone claim mode** *(medium effort, real-world)*
"Who had what?" → the phone shows *"Hand to Alex"* → Alex taps their items (shared items show "+ split") → *"Hand to Sam"* … → Summary. It turns the slowest part of splitting a bill into a 20-second game, and directly answers "would you actually use this at dinner?"

### 8.4 **Payment request links** *(low effort)*
If a payer is set, each person's card gets a **Pay {payer}** button. These are plain URLs: no API, no keys, no integration.
- Venmo: `https://venmo.com/{handle}?txn=pay&amount={x}&note={title}`
- Cash App: `https://cash.app/${cashtag}/{x}`
- Fallback: copy "You owe Jordan $23.47 for Friday at Nopa".

The payer's handles are saved locally after the first entry.

### 8.5 "Treat" someone *(low effort, delightful)*
Mark a birthday person; their share is redistributed across everyone else proportionally. A 🎂 shows on their card.

### 8.6 **Penny-perfect reconciliation** *(already in the core; make it visible)*
A subtle "✓ Adds up to $187.43 exactly" badge. Reviewers who check the math will notice; most split apps end up a cent off.

### 8.7 Live "remaining" meter
A progress bar on the Assign step showing $ assigned / $ total. It turns green at 100%, so users know when they're done.

### 8.8 Bill history
Recent bills are saved locally ("Friday at Nopa — $187.43 — 4 people"), so you can reopen one when someone asks "what did I owe again?"

### 8.9 Polish checklist
- Mobile-first, thumb-reachable primary actions, 44px tap targets.
- Dark mode (restaurants are dim).
- Undo snackbar for deletes.
- `Intl.NumberFormat` currency formatting; locale-aware decimal input.
- Keyboard-only manual entry flow on desktop.
- Haptic tick (`navigator.vibrate`) on assignment where supported.
- Accessible: labelled controls, visible focus, and avatar chips show initials so color isn't the only signal.

### 8.10 Stretch / "another hour" candidates
- PWA install + full offline caching.
- Automatic receipt edge detection (perspective correction) to replace the manual crop.
- Item-level "who's drinking?" bulk select (assign all drinks to the drinkers in one tap).
- Multi-currency (travel) with a manually entered exchange rate.
- Tap a scanned item to highlight its line on the receipt image (Tesseract already returns the line positions needed).

---

## 9. Project Structure

```
Tabby/
├── TABBY_DESIGN.md          ← this document
├── README.md                ← run instructions, screenshots, AI-tools note, "another hour"
├── LICENSE
├── index.html               ← includes the inline splash markup
├── package.json
├── vite.config.ts           ← copies tesseract assets into public/tesseract
├── tailwind.config.ts
├── public/
│   ├── logo.svg             ← favicon / touch icon
│   └── tesseract/           ← self-hosted worker, core, eng.traineddata
├── src/
│   ├── main.tsx
│   ├── App.tsx              ← stepper shell + bottom bar
│   ├── brand/
│   │   ├── Logo.tsx         ← inline SVG logo
│   │   └── useSplash.ts     ← splash timing / dismissal
│   ├── steps/
│   │   ├── ReceiptStep.tsx
│   │   ├── PeopleStep.tsx
│   │   ├── AssignStep.tsx
│   │   ├── TaxTipStep.tsx
│   │   └── SummaryStep.tsx
│   ├── components/          ← PersonChip, ItemCard, MoneyInput, Reconciliation, …
│   ├── scan/
│   │   ├── CropView.tsx     ← crop rectangle + rotate
│   │   ├── preprocess.ts    ← orient / scale / grayscale / threshold (canvas)
│   │   ├── ocr.ts           ← lazy tesseract.js worker
│   │   ├── parseReceipt.ts  ← OCR text → draft items + totals
│   │   └── schema.ts        ← Zod schema + toBillDraft()
│   ├── lib/
│   │   ├── money.ts         ← parse/format cents, largest-remainder allocate()
│   │   ├── split.ts         ← computeSplit() — the core
│   │   └── share.ts         ← encode/decode share links, payment URLs
│   ├── store/
│   │   └── billStore.ts     ← Zustand + persist
│   └── sample/
│       └── sampleReceipt.ts ← demo bill + a sample receipt image for the scanner
└── tests/
    ├── money.test.ts
    ├── split.test.ts
    └── parseReceipt.test.ts
```

---

## 10. Security & Constraints

- **No backend, no API keys, no external services.** The app makes no network requests at runtime other than loading its own files.
- **Share links** contain bill data only (names, items, amounts), never images. URL hash fragments aren't sent to servers.
- **Input safety**: all user and OCR strings are rendered as text (React escaping); no `dangerouslySetInnerHTML`. Share-link payloads are Zod-validated before use.

---

## 11. Milestones

Each milestone ends in a working app and a commit.

| # | Milestone | Done when |
|---|---|---|
| M0 | Scaffold + splash | Vite + React + TS + Tailwind; logo + splash; `npm install && npm run dev` works; repo public with LICENSE |
| M1 | Money core | `money.ts` + `split.ts` with Vitest tests passing (invariants in 6.2) |
| M2 | Manual flow | Steps 1–5 work end to end with manual entry, sample receipt, persistence |
| M3 | Assign UX | Custom weights, Everyone, split remaining, per-person mode, qty expansion |
| M4 | **Image upload** | Crop → preprocess → on-device OCR → parse → review/reconcile; self-hosted assets |
| M5 | Stand-outs | Fair vs Even, share link + QR, payment links, pass-the-phone |
| M6 | Polish & submit | Dark mode, a11y pass, README, screenshots/recording, AI-tools note |

---

## 12. Open Questions (for review)

| # | Question | Proposed default |
|---|---|---|
| Q1 | **Implementation scope now** — all of M0–M6, or stop at a checkpoint (e.g. after M4) for review? | Build M0–M6, committing and pushing per milestone |
| Q2 | **Logo concept** — (a) tabby-cat face with receipt-line stripes, (b) torn receipt with a dashed cut line, (c) "Tabby" wordmark only | (a) |
| Q3 | **License** for the public repo — MIT, Apache-2.0, or none (visible but not reusable) | MIT |
| Q4 | **Currency** — USD only for v1, or a currency picker? | USD default with `Intl` formatting; picker is a stretch item |

---

## 13. Submission Checklist (from the brief)

- [ ] Public GitHub repo link
- [ ] Screen recording or screenshots of the full flow (manual *and* scan)
- [ ] A few sentences on "what I'd do with another hour" (draw from 8.10)
- [ ] Note on AI tools used and how (Claude Code for all implementation; no AI or paid services inside the app)
- [ ] Verified on a clean clone: `npm install && npm run dev`
