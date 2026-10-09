# Tabby — Design & Behavior Spec

> **Tabby** splits the tab. Snap the receipt, tap who had what, and everyone knows what they owe before the server brings the card back.

| | |
|---|---|
| **Status** | Design — pre-implementation |
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
7. **Receipt image upload** → items, tax, tip, and total extracted automatically, then reviewed by the user. (Built *after* 1–6 work end to end, per the brief.)
8. A small set of "stand-out" features (section 7) chosen to answer the brief's prompts:
   - the friend who "only had a salad",
   - two people sharing an entrée,
   - the fastest path from receipt to "everyone knows what they owe",
   - "could you actually use this at dinner?"

### 1.3 Non-goals
- User accounts, sync servers, or a database.
- Processing payments. Tabby can *link out* to payment apps, but never moves money.
- Multi-receipt trip ledgers (Splitwise territory). One meal, one bill.

### 1.4 Evaluation criteria → how Tabby answers them

| Reviewer is looking for | Tabby's answer |
|---|---|
| Product instinct | Explicit, documented decisions for every ambiguity (section 5), "fair vs even" comparison, penny-perfect totals |
| Working software | Base flow ships first and stays green; image upload is additive and optional |
| Tool fluency | Built entirely with Claude Code; iterative milestones, commits per milestone |
| UI/UX care | Mobile-first, one-thumb flow, pass-the-phone mode, share sheet |
| Code quality | One pure, unit-tested `computeSplit()`; UI is a thin layer over a small store |

---

## 2. Core User Flow

```
 ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
 │ 1. Receipt │──▶│ 2. People  │──▶│ 3. Assign  │──▶│ 4. Tax/Tip │──▶│ 5. Summary │
 │ scan/type  │   │ add names  │   │ tap chips  │   │ % or $     │   │ share/pay  │
 └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
```

A persistent bottom bar shows step progress and a live **"Unassigned: $X.XX"** counter so the user always knows what's left. Users can jump between steps; nothing is lost.

### Step 1 — Receipt
- **Scan receipt** (primary button): camera/photo picker → extraction → review (section 6).
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
- **Fair vs. Even** toggle showing what each person would pay under an even split, with the delta ("Priya saves $14.20 with a fair split").
- Actions: **Share summary** (Web Share API / copy as text), **Share link** (section 7.2), **Request payment** links, **Mark as paid** checkboxes.

---

## 3. Tech Stack

| Concern | Choice | Why |
|---|---|---|
| Build / dev server | **Vite** + **React 18** + **TypeScript** | Fastest path to `npm install && npm run dev`; no server runtime needed |
| Styling | **Tailwind CSS** | Quick, consistent mobile-first UI; easy dark mode |
| State | **Zustand** + `persist` middleware (localStorage) | Tiny, no boilerplate; refresh-safe at the table |
| Validation | **Zod** | Validates both user input and the AI extraction result |
| Receipt AI | **`@anthropic-ai/sdk`** (Claude vision, structured outputs) | Most accurate extraction of item lines, tax, tip |
| Offline OCR fallback | **tesseract.js** (lazy-loaded) | Works with no API key, fully on-device |
| Share links | **lz-string** | Compresses bill state into a URL hash |
| Tests | **Vitest** | Unit tests for the money math only (where bugs would hurt) |
| PWA (stretch) | `vite-plugin-pwa` | "Add to Home Screen", works offline at the restaurant |

No router is required — the five steps are a single-page stepper. (If share links need a separate view, use the URL hash.)

---

## 4. Data Model

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
  confidence?: number;  // from scan, 0–1, drives "please review" highlighting
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

`shares` as **weights** handles all assignment cases with one shape:
- solo: `{ alex: 1 }`
- even split: `{ alex: 1, sam: 1 }`
- uneven split: `{ alex: 2, sam: 1 }`

---

## 5. Calculation Rules (the product decisions)

All logic lives in one pure function — `computeSplit(bill): SplitResult` in `src/lib/split.ts` — with unit tests. The UI never does arithmetic.

### 5.1 Algorithm
1. **Item shares.** For each item, divide `priceCents` across its weights using the *largest-remainder method* (allocate floors, then give leftover cents one at a time to the largest fractional remainders; ties broken by stable person order). Result: each item's per-person cents sum *exactly* to the item price.
2. **Per-person subtotal** = Σ their item shares.
3. **Discount** allocated proportionally to subtotal (largest-remainder again).
4. **Tax** allocated proportionally to post-discount subtotal.
   - *Why proportional, not even:* the salad-eater shouldn't subsidize tax on someone else's steak.
5. **Tip** computed on the chosen base (pre-tax subtotal by default), then allocated proportionally.
   - *Why pre-tax by default:* that's etiquette convention; post-tax is one toggle away.
6. **Service charge** allocated proportionally like tip.
7. **Total per person** = subtotal − discount + tax + tip + service.

### 5.2 Invariants (tested)
- `Σ person totals === bill total` — to the cent, always.
- Every allocation is a non-negative integer.
- Same input → same output (deterministic remainder tie-breaking).
- Unassigned items are **excluded** from per-person totals and surfaced as a blocking warning on the Summary ("$12.00 still unassigned — assign or split evenly?"). We never silently spread them.

### 5.3 Decisions on ambiguous cases

| Situation | Decision |
|---|---|
| Friend "only had a salad" | Proportional tax & tip by default; Summary shows **Fair vs Even** so the group sees why. |
| Two people share an entrée | Tap both chips → 50/50. Uneven? Custom weights (2:1, etc.). |
| Shared appetizer for the table | **Everyone** shortcut. |
| One person covers another (birthday) | "Treat" toggle on a person: their total is redistributed proportionally across everyone else (section 7.5). |
| Leftover cent from rounding | Largest-remainder method; never "the payer eats the penny" silently. |
| Scanned items don't add up to printed subtotal | Reconciliation banner with the difference and a one-tap "Add as 'Unlisted item'" fix. |
| Tip already on the receipt | Detected as service charge; tip defaults to 0%. |
| Zero people or zero items | Steps are skippable but Summary shows an empty state with a clear next action. |

---

## 6. Receipt Image Upload

Built only after sections 2–5 work end to end (as the brief requires). It's purely additive: its output is the same `Item[]` + `Adjustments` the manual flow produces.

### 6.1 Flow
```
Pick/take photo ─▶ Client-side preprocess ─▶ Extract (Claude or OCR) ─▶ Zod validate ─▶ Review screen ─▶ Items in bill
```

1. **Capture**: `<input type="file" accept="image/*" capture="environment">` — opens the rear camera on phones, file picker on desktop. Also supports drag-and-drop and paste. HEIC is converted via canvas where the browser can decode it.
2. **Preprocess (client-side)**: downscale so the long edge is ≤ 1568 px, re-encode as JPEG ~0.85, strip EXIF and apply its orientation. Keeps the payload small and fast.
3. **Extract** with one of two engines (user-selectable in Settings):

#### Engine A — Claude vision (recommended, best accuracy)
- **Bring-your-own-key**: the user pastes an Anthropic API key in Settings. Stored only in their browser's localStorage, sent only to `api.anthropic.com`. Clear copy in the UI explains this, with a "Forget key" button.
- Browser call via the official SDK, which requires opting in to browser use:
  ```ts
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  ```
  This is acceptable *only* because the key belongs to the person holding the device. A deployed multi-user version would put a tiny proxy in front instead (see section 9).
- **Structured output** with a Zod schema so the response is guaranteed to parse:
  ```ts
  import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';

  const ReceiptSchema = z.object({
    merchant: z.string().nullable(),
    currency: z.string(),                  // ISO code, e.g. "USD"
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      lineTotal: z.number(),               // as printed, in currency units
      confidence: z.number(),              // 0–1, model's self-assessed legibility
    })),
    subtotal: z.number().nullable(),
    tax: z.number().nullable(),
    serviceCharge: z.number().nullable(),
    tip: z.number().nullable(),
    discount: z.number().nullable(),
    total: z.number().nullable(),
  });

  const res = await client.messages.parse({
    model: 'claude-opus-5',               // configurable in Settings
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data } },
        { type: 'text', text: EXTRACTION_PROMPT },
      ],
    }],
    output_config: { format: zodOutputFormat(ReceiptSchema) },
  });
  // Check res.stop_reason before trusting res.parsed_output (may be null).
  ```
- **Prompt guidance** (`EXTRACTION_PROMPT`): extract purchasable line items only; fold modifiers ("+ avocado $2") into their parent item; keep printed line totals (don't multiply again); report tax/tip/service/discount separately and never as items; mark low-legibility lines with low confidence.
- **Model**: `claude-opus-5` by default; Settings exposes `claude-sonnet-5` / `claude-haiku-4-5` as cheaper, faster options.
- **Errors**: invalid key (401) → re-prompt for key; rate limit (429) / network → retry button + "Use offline scan instead"; `parsed_output === null` → fall back to OCR.

#### Engine B — On-device OCR (no key, offline)
- `tesseract.js` lazy-loaded on first use (keeps the main bundle small).
- A heuristic line parser: regex for trailing prices (`/(.+?)\s+\$?(\d+[.,]\d{2})$/`), keyword detection for `subtotal|tax|tip|gratuity|service|total|discount`, quantity prefixes (`2 x`, `2 @`).
- Less accurate, so every OCR item is flagged for review. It guarantees the feature works for reviewers without an API key.

4. **Validate & convert**: Zod parse → convert to integer cents → build `Item[]`, set `adjustments.tax`, `serviceChargeCents`, `discountCents`, `printedTotalCents`.
5. **Review screen** (always shown, never auto-commit):
   - Receipt thumbnail (tap to zoom) beside the editable item list.
   - Low-confidence rows highlighted amber.
   - **Reconciliation check**: `Σ items` vs printed subtotal, and computed total vs printed total. A green ✓ when they match, or an amber banner with the difference and quick fixes.
   - "Looks good →" goes straight to **People** (or **Assign** if people already exist).

### 6.2 Privacy
- The receipt image is never stored after extraction (only an in-memory thumbnail for the review screen).
- With Engine B nothing leaves the device. With Engine A the image goes only to the Anthropic API using the user's own key.

---

## 7. Stand-Out Features

Ranked by impact versus effort. **Bold = recommended for the first submission.**

### 7.1 **Fair vs. Even toggle** *(low effort, high signal)*
On the Summary, flip between proportional and even splits with per-person deltas. It answers the "only had a salad" prompt head-on and shows product thinking visually.

### 7.2 **Share link — no backend** *(medium effort, high wow)*
Serialize the bill → `lz-string` compress → put it in the URL hash: `…/#b=N4Ig…`. Friends open it on their phones, **tap their own name**, and see only their total and items (plus a payment button). No server, no accounts, still fully within the brief's "client-side" rule. Also shown as a **QR code** so the table can scan the organizer's screen.

### 7.3 **Pass-the-phone claim mode** *(medium effort, real-world)*
"Who had what?" → the phone shows *"Hand to Alex"* → Alex taps their items (shared items show "+ split") → *"Hand to Sam"* … → Summary. Turns the slowest part of splitting a bill into a 20-second game. Directly answers "would you actually use this at dinner?"

### 7.4 **Payment request links** *(low effort)*
If a payer is set, each person's card gets a **Pay {payer}** button:
- Venmo: `https://venmo.com/{handle}?txn=pay&amount={x}&note={title}`
- Cash App: `https://cash.app/${cashtag}/{x}`
- Fallback: copy "You owe Jordan $23.47 for Friday at Nopa".

The payer's handles are saved locally once.

### 7.5 "Treat" someone *(low effort, delightful)*
Mark a birthday person; their share is redistributed across everyone else proportionally. A 🎂 shows on their card.

### 7.6 **Penny-perfect reconciliation** *(already in core — make it visible)*
A subtle "✓ Adds up to $187.43 exactly" badge. Reviewers who check the math will notice; most split apps are off by a cent.

### 7.7 Live "remaining" meter
A progress bar on the Assign step showing $ assigned / $ total, which turns green at 100%. Gives users confidence they're done.

### 7.8 Bill history
Recent bills saved locally ("Friday at Nopa — $187.43 — 4 people") so you can reopen one when someone asks "what did I owe again?"

### 7.9 Polish checklist
- Mobile-first, thumb-reachable primary actions, 44px tap targets.
- Dark mode (restaurants are dim).
- Undo snackbar for deletes.
- `Intl.NumberFormat` currency formatting; locale-aware decimal input.
- Keyboard-only manual entry flow on desktop.
- Haptic tick (`navigator.vibrate`) on assignment where supported.
- Accessible: labelled controls, visible focus, color isn't the only signal on avatar chips (initials too).

### 7.10 Stretch / "another hour" candidates
- PWA install + offline.
- Item-level "who's drinking?" bulk-select (assign all alcohol to drinkers in one tap).
- Multi-currency (travel) with a manual exchange rate.
- Tap a scanned item to highlight its line on the receipt image (needs bounding boxes in the extraction schema).

---

## 8. Project Structure

```
Tabby/
├── TABBY_DESIGN.md          ← this document
├── README.md                ← run instructions, screenshots, AI-tools note, "another hour"
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── src/
│   ├── main.tsx
│   ├── App.tsx              ← stepper shell + bottom bar
│   ├── steps/
│   │   ├── ReceiptStep.tsx
│   │   ├── PeopleStep.tsx
│   │   ├── AssignStep.tsx
│   │   ├── TaxTipStep.tsx
│   │   └── SummaryStep.tsx
│   ├── components/          ← PersonChip, ItemCard, MoneyInput, Reconciliation, …
│   ├── scan/
│   │   ├── preprocess.ts    ← resize / orient / encode
│   │   ├── claudeExtract.ts ← Engine A
│   │   ├── ocrExtract.ts    ← Engine B (lazy tesseract.js)
│   │   └── schema.ts        ← ReceiptSchema + toBillDraft()
│   ├── lib/
│   │   ├── money.ts         ← parse/format cents, largest-remainder allocate()
│   │   ├── split.ts         ← computeSplit() — the core
│   │   └── share.ts         ← encode/decode share links, payment URLs
│   ├── store/
│   │   └── billStore.ts     ← Zustand + persist
│   └── sample/
│       └── sampleReceipt.ts
└── tests/
    ├── money.test.ts
    └── split.test.ts
```

---

## 9. Security & Constraints

- **No backend** — honored. The only network call is the optional, user-initiated Claude request with the user's own key.
- **API key handling**: localStorage only, masked input, "Forget key" control, never logged, never included in share links. The README states plainly that browser-side keys are fine for personal use and that a production version would put a ~20-line serverless proxy in front of the API.
- **Share links** contain bill data only (names, items, amounts), never keys or images. Hash fragments aren't sent to servers.
- **Input safety**: all user and AI strings are rendered as text (React escaping); no `dangerouslySetInnerHTML`.

---

## 10. Milestones

Each milestone ends in a working app and a commit.

| # | Milestone | Done when |
|---|---|---|
| M0 | Scaffold | Vite + React + TS + Tailwind; `npm install && npm run dev` works; repo pushed |
| M1 | Money core | `money.ts` + `split.ts` with Vitest tests passing (invariants in 5.2) |
| M2 | Manual flow | Steps 1–5 work end to end with manual entry, sample receipt, persistence |
| M3 | Assign UX | Custom weights, Everyone, split remaining, per-person mode, qty expansion |
| M4 | **Image upload** | Preprocess → Claude extraction → review/reconcile; OCR fallback |
| M5 | Stand-outs | Fair vs Even, share link + QR, payment links, pass-the-phone |
| M6 | Polish & submit | Dark mode, a11y pass, README, screenshots/recording, AI-tools note |

---

## 11. Submission Checklist (from the brief)

- [ ] GitHub repo link
- [ ] Screen recording or screenshots of the full flow (manual *and* scan)
- [ ] A few sentences on "what I'd do with another hour" (draw from 7.10)
- [ ] Note on AI tools used and how (Claude Code for all implementation; Claude vision inside the app for receipt extraction)
- [ ] Verified on a clean clone: `npm install && npm run dev`
