# Tabby — Design & Behavior Spec

> **Tabby** splits the tab. Snap the receipt, tap who had what, and everyone knows what they owe before the server brings the card back.

| | |
|---|---|
| **Status** | **Implemented** — milestones M0–M8 complete (see `git log`). No open questions. |
| **Live app** | `https://loupgarou451.github.io/Tabby/` (deployed automatically from `main` once M0 is pushed; section 10.2) |
| **Source brief** | *Take-Home Project: Split the Bill* — reproduced in full in Appendix A |
| **Repo** | `https://github.com/LoupGarou451/Tabby` (public) |
| **License** | MIT — `Copyright (c) 2026 Jeff Fulton` |
| **Run** | `git clone` → `npm install && npm run dev` — **zero setup, nothing else required** (section 1.3) |
| **Last updated** | 2026-10-08 |

---

## 0. How to Use This Document (read first)

This document is the **single source of truth** for Tabby. A developer or AI session with no other context should be able to build the whole app from it. Everything needed is here, including the original brief (Appendix A).

### 0.1 Current repo state
All milestones (M0–M8) are implemented; commits are prefixed `M0:` … `M8:`. Further work should follow the same rules: update this spec first, then build, and log decisions in section 16.

### 0.2 Working rules for implementers
1. **Build milestones in order** (M0 → M7). Each milestone must leave the app working end to end.
2. **Receipt scanning (M5) comes only after the manual flow is complete** (brief requirement).
3. **Before every commit**, run: `npm run build`, `npm test`, `npm run lint` — all must pass.
4. **One commit per milestone** (or smaller), pushed to `main`. Message format: `M2: Manual flow — steps 1–5 end to end`.
5. **Never add** anything that breaks zero setup (section 1.3): no API keys, no `.env`, no paid services, no `postinstall` downloads.
6. **When the spec is silent**, pick the simplest option that fits the principles below, and record it in the **Decision Log** (section 16). Don't stop to ask about small things; do stop for anything that contradicts this document.
7. **Don't re-open decisions** recorded in section 14 (Resolved Decisions).

### 0.3 Product principles (tie-breakers)
1. **Fast at the table** — fewest taps from receipt to "everyone knows what they owe".
2. **Fair by default, flexible when needed.**
3. **Never wrong by a cent** — totals always reconcile exactly.
4. **Nothing leaves the device**, and nothing needs setting up.
5. **Polished small scope beats broken big scope** — if a feature can't be made solid, cut it and log why.

---

## 1. Goals

### 1.1 Required by the brief
1. Manually enter receipt items (name + price).
2. Add people to the bill.
3. Assign items to people, including shared items.
4. Handle tax and tip.
5. Show a final summary of what each person owes.
6. Fully client-side — no backend, no accounts, no auth.

### 1.2 Committed extras (all in scope)
7. **Splash logo** shown briefly when the app opens (section 3).
8. **Currency picker** (section 4).
9. **Receipt image upload** → items, tax, tip, and total extracted **on-device**, then reviewed (section 9). Upload a file on any device, or take a photo with the camera on mobile.
10. **Stand-out features** (section 10): Fair vs Even, share link + QR (reachable on the local network and via a public GitHub Pages URL), pass-the-phone, payment links, Treat, penny-perfect badge, remaining meter, bill history, round up, first-run hints, polish.

### 1.3 Constraints
- **Zero setup.** The *only* thing a user does is:
  ```bash
  git clone https://github.com/LoupGarou451/Tabby.git
  cd Tabby
  npm install && npm run dev
  ```
  Every feature, including receipt scanning, must then work with nothing else. Specifically, the project must **not** require:
  - `.env` files, environment variables, or config edits,
  - API keys, tokens, sign-ups, or accounts,
  - globally installed tools (beyond Node.js + npm) or system packages,
  - manual download steps (e.g. OCR language data), or extra scripts like `npm run setup`,
  - `postinstall` scripts that fetch files from the internet.

  Everything the app needs is either a regular npm dependency (installed by `npm install`) or committed to the repo. The only prerequisite is a current Node.js LTS (≥ 20), declared in `package.json` `engines` and in the README.
- **No API keys, no paid services, no third-party accounts.** Every feature runs on free, open-source libraries bundled with the app.
- **No backend.** All state lives in the browser.
- **Works offline** once loaded, including receipt scanning (OCR assets are self-hosted; see 9.3).

### 1.4 Non-goals
- User accounts, sync servers, or a database.
- Processing payments. Tabby can *link out* to payment apps through plain URLs, but never moves money.
- Currency **conversion** (the picker changes the currency of the bill; it doesn't convert between currencies).
- Multi-receipt trip ledgers (Splitwise territory). One meal, one bill.
- UI translation — the interface is English-only. Number and currency *formatting* follow the user's locale.

### 1.5 Supported browsers
Latest two major versions of iOS Safari, Android Chrome, and desktop Chrome, Edge, Firefox, and Safari. Primary design target: a phone held in one hand (375–430 px wide). Desktop works, using a centered column with a max width of ~480 px.

### 1.6 Evaluation criteria → how Tabby answers them

| Reviewer is looking for | Tabby's answer |
|---|---|
| Product instinct | Explicit, documented decisions for every ambiguity (section 8), "fair vs even" comparison, totals that add up to the exact cent |
| Working software | Base flow ships first and stays green; image upload is additive and optional |
| Tool fluency | Built entirely with Claude Code; iterative milestones, commits per milestone |
| UI/UX care | Mobile-first, one-thumb flow, splash, pass-the-phone mode, share sheet |
| Code quality | One pure, unit-tested `computeSplit()`; UI is a thin layer over a small store |

---

## 2. App Shell & Core User Flow

### 2.1 Shell
```
┌─────────────────────────────────────────┐
│ [🐱 Tabby]                    [USD ▾] ☰ │  ← header: logo + "Tabby" (tap → start over), currency chip, menu
├─────────────────────────────────────────┤
│                                         │
│            (current step)               │
│                                         │
├─────────────────────────────────────────┤
│ Unassigned: $12.00     [ Next: People → ]│  ← bottom bar: live status + primary action
│ ● ● ○ ○ ○  Receipt·People·Assign·Tip·Sum │  ← step dots (tappable)
└─────────────────────────────────────────┘
```
- **Header**: the logo and the word **"Tabby"** — nothing about the meal. Tapping either is the "home" gesture:
  - If the current bill has anything in it (items or people), a confirmation sheet asks **"Start over?"** — "Your current receipt will be saved to Bill history." with **[Start over]** / **[Keep editing]**. Start over archives the bill to history (7) and returns to Step 1.
  - If the bill is empty, it just returns to Step 1 (no prompt).
- **Header menu (☰)**: New bill (same confirmation as above) · Bill history · Settings · About (version, license, GitHub link). Each item opens its sheet.
- **Bill title**: not shown in the header. It defaults to a neutral date label — `"Bill · Oct 9"` — and is editable on the Summary (Step 5). It's used in history, share links, the share text, and payment notes.
- **Steps are freely navigable** by tapping the dots. Nothing is lost when moving between steps.
- **Primary action** is always bottom-right, within thumb reach.

### 2.2 Flow
```
            ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────┐
 Splash ──▶ │ 1. Receipt │──▶│ 2. People  │──▶│ 3. Assign  │──▶│ 4. Tax/Tip │──▶│ 5. Summary │
 (~1.2s)    │ scan/type  │   │ add names  │   │ tap chips  │   │ % or amt   │   │ share/pay  │
            └────────────┘   └────────────┘   └────────────┘   └────────────┘   └────────────┘
```

### Step 1 — Receipt (the home screen)
The step opens with a clear **choice of input method**: two large, equal-weight cards. There is no sample data and no separate "split evenly" entry point — how to split is decided on the Assign step (Step 3). The heading and cards are **vertically centred** in the space between the header and the bottom bar, so the home screen doesn't leave a large empty area below.

```
┌───────────────────────────┐  ┌───────────────────────────┐
│  📷  Scan a receipt        │  │  ✏️  Enter manually        │
│  Photo → items in seconds │  │  Type items and prices    │
│ [ Take photo ] [ Upload ] │  │                           │
└───────────────────────────┘  └───────────────────────────┘
```

**Scan a receipt** offers two capture options:

| Option | Shown on | How it works |
|---|---|---|
| **Take photo** | Mobile / tablet (touch devices) | `<input type="file" accept="image/*" capture="environment">` opens the rear camera directly. |
| **Upload image** | All devices | `<input type="file" accept="image/*">` with *no* `capture` attribute, so it opens the photo library / file picker. On desktop, the card also accepts **drag-and-drop** and **paste** (⌘/Ctrl+V). |

- **Device detection**: "Take photo" is shown when `matchMedia('(pointer: coarse)').matches` is true. Desktop browsers ignore `capture`, so a camera button there would just be a duplicate file picker. Desktop users get "Upload image" plus the drop zone instead.
- File inputs work over plain `http://` (unlike `getUserMedia`), so the camera works when the dev server is opened from a phone on the LAN.
- Both options feed the same pipeline: crop → preprocess → OCR → review (section 9).

**Enter manually** opens the fast-entry list: `name` · `price` · `qty` (default 1).
- Enter/Return in the price field adds a new row and focuses its name field.
- Prices accept `12`, `12.5`, `$12.50`, `12,50` (section 4.3).
- An empty name becomes `Item N`. Price must be > 0; a row with an empty price is ignored, not saved.
- Each row has a delete button; deletes show an **Undo** snackbar (5 s).

**Switching between methods** is always possible, and nothing is lost:
- After either method, the item list shows **"+ Add item"** and **"📷 Scan more"** buttons, so users can mix methods (scan, then type a missed item, or scan page 2 of a long receipt).
- If items already exist when a new scan finishes, the review screen asks **"Add to current items"** (default) or **"Replace current items"**.
- The last-used method is remembered and shown first next time (left card), but both cards are always visible.

**Also on this step:** a collapsible **"Receipt totals (optional)"** panel: **Tax**, **Gratuity / service charge**, **Discount**, **Printed total** (used for reconciliation). A scan fills these in automatically, and they're the same values shown (and editable) on the Tax & tip step.

### Step 2 — People
- Add by name (Enter adds and keeps focus). Each person gets an avatar chip: a color from a fixed 10-color palette (assigned in order, high contrast in both themes) + initials.
- **Quick add**: "+ Guest" adds "Guest N" for when names don't matter.
- **Recent names**: names from the last 5 bills are offered as one-tap chips.
- Tap a person to rename; swipe or tap ✕ to remove (with Undo). Removing a person removes them from every item's shares; items left with no one become unassigned (and the bottom bar updates).
- **Payer**: optionally mark one person as "Paid the bill". This drives payment links (10.4) and the "Paid" checkmarks.
- Duplicate names are allowed but shown with a suffix ("Sam (2)") so chips stay distinguishable.

### Step 3 — Assign
The step starts with **how to split** — the only place this choice is made:

```
How should we split it?
[ By what each person had ]  [ Evenly ]
```
- **By what each person had** (default, "fair"): the item-assignment tools below.
- **Evenly**: everyone pays an equal share of the whole bill (8.2). The item cards are replaced by a short explainer ("Everyone pays the same share of the total, including tax and tip"), and nothing needs assigning. Switching back keeps any assignments already made.
- The choice is stored on the bill (`splitMode`), so it's saved, restored from history, and included in share links.

When splitting by what each person had:
- Each item is a card with the row of people chips beneath it. **Tap a chip to toggle** that person onto the item.
- One person selected → they own it. Several → split evenly among them.
- **Custom shares**: "⋯" on an item opens a sheet with a stepper per selected person (0–10 parts, default 1). For example, Alex 2 parts and Sam 1 part means Alex pays ⅔. The sheet live-previews each person's amount.
- **Shortcuts**:
  - **Everyone** on an item card: selects all people for that item.
  - **Split remaining items evenly**: assigns every unassigned item to everyone.
  - **By item / By person** toggle: in By person, pick one person, then tap all of *their* items. Faster for "I just had the salad".
  - **Pass the phone** (10.3).
- **Quantity expansion**: items with `quantity > 1` show "Split into N" on the card. "3 × Beer $18" becomes three "Beer" items at $6 each (using the largest-remainder method from section 8.1 if the amount doesn't divide evenly), so each can go to a different person.
- **Remaining meter** (10.7) at the top: amount assigned / total, which turns green at 100%.

### Step 4 — Tax & Tip
- **Tax**: amount or percentage. **If the receipt (scan or the Receipt totals panel) has a tax line, it's pre-filled here** and labelled "From your receipt".
- **Gratuity / service charge**: if the receipt includes one, it's **pre-filled here** as its own editable row ("Gratuity on the receipt"), labelled "From your receipt". It can also be added manually (an "+ Add gratuity / service charge" link).
- **Tip**: preset buttons **18% / 20% / 22%**, each showing its resulting amount underneath (e.g. "20% · $31.40"). Also a custom % and a custom amount. Defaults to the user's preferred tip % from Settings (initially 20%).
  - **When a gratuity is present**, this section is titled **"Additional tip"**, defaults to 0%, and shows: "Gratuity of $24.00 is already included. Add more if you'd like." The presets still work, so people can tip on top of the gratuity.
- **Tip base** toggle: *pre-tax* (default) or *post-tax* (definitions in 8.1).
- A summary row at the bottom: Tax · Gratuity · Tip · **Bill total**.
- No tax or tip is valid (0).

### Step 5 — Summary
- **Bill name** at the top, editable in place (defaults to "Bill · Oct 9"; e.g. rename to "Friday dinner").
- The split method chosen on Assign is shown as a label — "Split by what each person had" or "Split evenly" — with a **Change** link back to Step 3. In Even mode, each card shows the difference from a by-item split when every item is assigned (10.1).
- One card per person: **total owed** in large type, expandable breakdown (their items with share fractions such as "½ Nachos", then subtotal, discount, tax, tip, gratuity).
- Footer reconciliation: "✓ Adds up to $187.43 exactly" (10.6).
- If anything is unassigned (by-item mode): a blocking banner — "$12.00 still unassigned" with **[Assign items]** and **[Split evenly among everyone]** buttons. Per-person totals are still shown, marked "so far".
- **Round up** switch (10.11), off by default.
- Actions:
  - **Share link / QR** (10.2), **Share as text** (Web Share API where available, otherwise copy):
    ```
    Friday dinner — $187.43 total
    Alex   $52.10
    Sam    $41.88
    ...
    Split with Tabby
    ```
  - **Pay {payer}** buttons (10.4), and a **Paid back** checkbox per person.
  - **✓ Done — save to history** (last, full width): completes the flow. It archives the bill to Bill history (10.8), starts a fresh bill, and returns to the home screen (Step 1), with a snackbar "Saved to history" + **Undo**.

---

## 3. Splash Logo

A short branded moment when the app opens. It should feel polished, never feel slow, and never get in the way of someone who's in a hurry.

### 3.1 Logo (decided: tabby-cat face with receipt-line stripes)
- **Concept:** a friendly, minimal **front-facing tabby-cat face**:
  - two triangular ears,
  - **three horizontal forehead stripes drawn as receipt lines** — short rows of varying length, like printed item lines, the last one with a small "price" dash at the right,
  - simple oval eyes, a small triangle nose, and three whiskers per side,
  - a **zig-zag "torn receipt" edge** along the bottom of the chin, so the head reads as a receipt.
- **Format:** a single hand-authored **SVG** (`viewBox="0 0 128 128"`), flat shapes + strokes, no gradients, **no text inside the icon**. It lives in `src/brand/Logo.tsx` and is exported identically to `public/logo.svg`. No image files and no design-tool dependency.
- **Palette:** tabby orange `#F28C28` fill, ink `#2B2118` strokes, receipt-paper `#FFF8EE` for the face's lower half. In dark mode the ink becomes `#F5E9DA` and the background `#14110F`. Colors are CSS custom properties, so one SVG serves both themes.
- **Wordmark:** "Tabby" set beside or below the icon in a rounded system-font stack (`ui-rounded, "SF Pro Rounded", system-ui, sans-serif`), weight 800. No web-font download.
- **Legibility test:** at 32×32 px, the ears, stripes, and torn edge must still read. If the whiskers muddy it, the favicon variant may omit them.
- **Reuse:** favicon, `apple-touch-icon`, PWA/manifest icon, and the small header logo in the app.

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
- `index.html`: a `<div id="splash">` holding the inline SVG plus a CSS keyframe animation. This avoids a white flash. An inline `<script>` in `<head>` hides it immediately if the session flag is set or the URL hash starts with `#b=`.
- `src/brand/useSplash.ts`: on mount, waits out the remaining minimum time, adds a `splash--out` class, removes the node on `transitionend`, and sets the session flag.
- About 40 lines of code and no dependencies.

---

## 4. Currency Picker (decided: included)

### 4.1 Behavior
- The **currency chip** in the header (e.g. `USD ▾`) opens a bottom sheet:
  - a search field (matches code or name: "eur", "euro", "yen"),
  - a **Common** section pinned at the top: USD, EUR, GBP, CAD, AUD, MXN, JPY, INR, CHF, CNY,
  - an **All currencies** list below.
- The list comes from the browser — `Intl.supportedValuesOf('currency')` with names from `new Intl.DisplayNames([locale], { type: 'currency' })`. **No library, no network.** If `supportedValuesOf` is unavailable, fall back to the Common list.
- **Default**: USD for the very first bill. After that, new bills use the last currency chosen (stored in preferences). Each bill stores its own currency.
- **Changing currency on a bill with items** keeps the *displayed numbers* (12.50 stays 12.50) and only changes the symbol. There is no conversion (non-goal). If the new currency has fewer decimal places, amounts are rounded with a one-line notice ("Amounts rounded to whole yen").

### 4.2 Minor units (all money math)
- All money is stored as **integers in the currency's minor unit** (cents for USD, whole yen for JPY, fils for BHD).
- Decimal places come from `new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits` (0, 2, or 3).
- Display uses `Intl.NumberFormat(userLocale, { style: 'currency', currency })`.

### 4.3 Money input parsing (`parseMoney(text, currency)`)
- Strips currency symbols, letters, and spaces.
- Decimal separator: if the string contains both `.` and `,`, the **last** one is the decimal separator. If it contains only one, that is the decimal separator when followed by 1–3 digits at the end (`12,50` → 12.50); otherwise it's a thousands separator (`1,250` → 1250).
- Rounds to the currency's decimal places. Returns `null` for invalid or negative input (shown as an inline error).

### 4.4 Effects elsewhere
- **Payment links** (10.4): Venmo appears only for USD; Cash App only for USD and GBP. "Copy request text" is always available.
- **OCR parsing** (9.1) uses the bill's currency decimals when matching prices.
- **Share links** include the currency.

---

## 5. Tech Stack

Everything is free and open source (MIT / Apache-2.0) and bundled. **No API keys, no accounts, no paid tiers.** Versions below were verified on npm on 2026-10-08. Use these majors (latest minor/patch within them).

| Concern | Package(s) | Major | Notes |
|---|---|---|---|
| Build / dev server | `vite`, `@vitejs/plugin-react` | 8 / 6 | Scaffold with `npm create vite@latest` (react-ts template), then adapt |
| UI | `react`, `react-dom` | 19 | |
| Language | `typescript` | as shipped by the Vite template | Strict mode on |
| Styling | `tailwindcss`, `@tailwindcss/vite` | 4 | v4 is configured in CSS (`@import "tailwindcss";` + `@theme`), **no `tailwind.config` file**. Dark mode via a `.dark` class on `<html>` (`@custom-variant dark`). |
| State | `zustand` (+ `persist` middleware) | 5 | localStorage persistence |
| Validation | `zod` | 4 | Share-link payloads, persisted state, parsed OCR output |
| OCR | `tesseract.js`, `tesseract.js-core`, `@tesseract.js-data/eng` | 7 / 7 / 1 | Lazy-loaded; assets self-hosted (9.3) |
| Asset serving | (none — a ~40-line plugin in `vite.config.ts`) | — | Serves OCR assets from `node_modules` in dev; emits them into the build |
| Share links | `lz-string` | 1 | `compressToEncodedURIComponent` |
| QR codes | `qrcode` | 1 | Render to SVG string locally |
| Tests | `vitest` | 5 | Unit tests for pure logic |
| Lint / format | `eslint` (template config), `prettier` | latest | |

**`package.json` scripts**: `dev` (`vite`), `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `lint` (`eslint .`), `format` (`prettier --write .`).
**`engines`**: `{ "node": ">=20" }`.
**No router** — the steps are a single-page stepper. Shared links use the URL hash.

---

## 6. Data Model

```ts
type Money = number; // integer, in the currency's minor unit (section 4.2)

interface Person {
  id: string;            // crypto.randomUUID()
  name: string;
  colorIndex: number;    // 0–9, into the fixed avatar palette
}

interface Item {
  id: string;
  name: string;
  price: Money;          // line total (qty × unit), > 0
  quantity: number;      // integer ≥ 1, default 1
  shares: Record<string /* personId */, number /* weight, integer 1–10 */>; // {} = unassigned
  source: 'manual' | 'scan';
  confidence?: number;   // 0–100 from OCR; < 70 → flagged for review
}

type Amount = { mode: 'amount'; value: Money } | { mode: 'percent'; bps: number }; // bps: basis points, 2000 = 20%

interface Adjustments {
  tax: Amount;               // default { mode: 'amount', value: 0 }
  tip: Amount;               // default { mode: 'percent', bps: prefs.defaultTipBps }
  tipBase: 'preTax' | 'postTax';
  serviceCharge: Money;      // auto-gratuity printed on the receipt
  discount: Money;           // coupons / comps (positive number, subtracted)
}

interface Bill {
  schemaVersion: 1;
  id: string;
  splitMode: 'fair' | 'even';  // chosen on Assign (Step 3); default 'fair'
  title: string;               // default "Bill · Oct 9"; editable on Summary
  createdAt: string;         // ISO
  updatedAt: string;
  currency: string;          // ISO 4217 code
  roundUp: boolean;          // section 10.11, default false
  people: Person[];
  items: Item[];
  adjustments: Adjustments;
  printedTotal?: Money;      // for reconciliation
  payerId?: string;
  treatedIds: string[];      // people whose share is covered by others (10.5)
  paid: Record<string, boolean>;
}

interface Preferences {
  schemaVersion: 1;
  currency: string;          // last used, default 'USD'
  defaultTipBps: number;     // default 2000
  lastInputMethod: 'scan' | 'manual';
  recentNames: string[];     // most recent first, max 20
  payHandles: { venmo?: string; cashtag?: string };
  theme: 'system' | 'light' | 'dark';
  hintsSeen: string[];       // ids of first-run hints already dismissed (10.12)
  shareTarget: 'public' | 'local'; // last choice in the share sheet (10.2)
}
```

**Storage (localStorage, via Zustand `persist`):**
- `tabby:bill` — the current bill and up to 20 past bills (`{ bill, history }`, see the decision log).
- `tabby:prefs` — preferences.

Persisted data is validated with Zod on load (a missing `splitMode` from older saves defaults to `'fair'`). If validation fails (corrupt data or an old schema with no migration), the app starts fresh rather than crashing, and logs to the console.

**Shares as weights** cover every case with one shape: solo `{ alex: 1 }`, even `{ alex: 1, sam: 1 }`, uneven `{ alex: 2, sam: 1 }`.

---

## 7. State & Actions

Two Zustand stores: `useBill` (current bill + history) and `usePrefs`. Components call actions and never mutate state directly. They read derived numbers only from `computeSplit()` (memoized with `useMemo` on the bill).

`useBill` actions: `newBill()`, `setSplitMode('fair'|'even')`, `setRoundUp(bool)`, `setTitle`, `setCurrency`, `addItem`, `updateItem`, `removeItem`, `expandItem(id)`, `addItems(items, mode: 'append'|'replace')`, `addPerson`, `updatePerson`, `removePerson`, `toggleShare(itemId, personId)`, `setShareWeight(itemId, personId, w)`, `assignToEveryone(itemId)`, `splitRemainingEvenly()`, `setAdjustments(partial)`, `setPrintedTotal`, `setPayer`, `toggleTreat(personId)`, `togglePaid(personId)`, `openFromHistory(id)`, `deleteFromHistory(id)`, `importSharedBill(bill)`.

`newBill()` archives the current bill to history if it has at least one item, then starts a blank bill. The UI confirms first ("Start over?") whenever the bill has items or people; **Done — save to history** on the Summary calls it without a prompt, since that's the explicit end of the flow.

**Undo**: a single-level undo for destructive actions (remove item, remove person, replace items, new bill), surfaced through a snackbar.

---

## 8. Calculation Rules (the product decisions)

All logic lives in one pure function — `computeSplit(bill, mode: 'fair' | 'even' = 'fair'): SplitResult` in `src/lib/split.ts` — with unit tests. The UI never does arithmetic on money.

### 8.1 Algorithm (fair mode)
Let **assigned items** be items with at least one share weight > 0.

1. **Allocation primitive — `allocate(total, weights)`** (largest-remainder method): give each weight `floor(total × w / Σw)`, then hand out the leftover units one at a time to the largest fractional remainders. Ties go to the earlier index (people in list order). The result always sums *exactly* to `total`. If every weight is 0, the result is all zeros (callers handle this case).
2. **Item shares**: for each assigned item, `allocate(item.price, weights)`. Unassigned items go into an **Unassigned** bucket.
3. **Subtotals**: `itemsSubtotal` = Σ all item prices. Each person's subtotal = Σ their item shares.
4. **Bill-level amounts** (computed once for the whole bill):
   - `discount` = `adjustments.discount`, capped at `itemsSubtotal`.
   - `taxableBase` = `itemsSubtotal − discount`.
   - `tax` = the amount, or `round(taxableBase × bps / 10000)` in percent mode.
   - `tipBase` = `itemsSubtotal` (**pre-tax**, before discount — tip on what was served) or `itemsSubtotal + tax` (**post-tax**).
   - `tip` = the amount, or `round(tipBase × bps / 10000)` in percent mode.
   - `service` = `adjustments.serviceCharge`.
   - `billTotal` = `itemsSubtotal − discount + tax + tip + service`.
5. **Distribute** each bill-level amount (discount, tax, tip, service) across **people + the Unassigned bucket**, in proportion to their item subtotals, using `allocate`. Unassigned items therefore carry their fair share of tax and tip until someone is assigned to them.
   - *Why proportional, not even:* the salad-eater shouldn't pay tax and tip on someone else's steak.
   - *Why pre-tax tip by default:* that's the etiquette convention; post-tax is one toggle away.
6. **Treat** (10.5): for each treated person, their computed total is re-allocated across the non-treated people, in proportion to the non-treated people's totals, and the treated person's total becomes 0. If everyone is treated, the Treat toggle is disabled for the last person.
7. **Per-person total** = subtotal − discount share + tax share + tip share + service share (+ treat redistribution).
8. **Round up** (only when `bill.roundUp` is true; section 10.11): each non-treated person's total is raised to the next multiple of the **rounding unit**, and the difference is added to that person's tip share (`roundUpExtra`). `billTotal` and `tip` increase by the sum of the extras. A total already on a multiple is unchanged. The rounding unit is 1 major unit (100 minor units) for 2-decimal currencies, 1 000 for 3-decimal currencies, and 10 for 0-decimal currencies.

### 8.2 Even mode
`personTotal = allocate(billTotal, [1, 1, …])` across non-treated people (treated people pay 0). Unassigned items don't matter in even mode. Used when `bill.splitMode === 'even'` (chosen on Assign). Round up (step 8) applies afterwards in the same way.

### 8.3 SplitResult
```ts
interface SplitResult {
  billTotal: Money;
  itemsSubtotal: Money;
  unassigned: { subtotal: Money; total: Money; itemIds: string[] };
  people: Array<{
    personId: string;
    items: Array<{ itemId: string; share: Money; fraction: [number, number] }>; // e.g. [1, 2] = ½
    subtotal: Money; discount: Money; tax: Money; tip: Money; service: Money;
    treatAdjustment: Money; // + for people covering, − for the treated person
    roundUpExtra: Money;    // 0 unless round up is on; already included in tip
    total: Money;
  }>;
  reconciles: boolean; // Σ people totals + unassigned.total === billTotal
}
```

### 8.4 Invariants (unit-tested)
- `Σ person.total + unassigned.total === billTotal`, always, to the minor unit.
- Every allocation is an integer ≥ 0.
- Same input → same output.
- In even mode, totals differ by at most 1 minor unit.
- A person with no items pays 0 in fair mode (unless they're covering a treat).
- Works for 0-, 2-, and 3-decimal currencies.
- With round up on, every non-treated total is a multiple of the rounding unit, each `roundUpExtra` is in `[0, unit)`, and the sum invariant still holds.

### 8.5 Decisions on ambiguous cases

| Situation | Decision |
|---|---|
| Friend "only had a salad" | Proportional tax & tip by default; Summary shows **Fair vs Even** so the group sees why. |
| Two people share an entrée | Tap both chips → 50/50. Uneven? Custom weights (2:1, etc.). |
| Shared appetizer for the table | **Everyone** shortcut. |
| One person covers another (birthday) | **Treat** toggle (10.5). |
| Leftover cent from rounding | Largest-remainder method; no one silently absorbs a penny. |
| Scanned items don't add up to printed subtotal | Reconciliation banner shows the difference, with a one-tap "Add as 'Unlisted item'" fix. |
| Tip already on the receipt | Treated as a gratuity / service charge (pre-filled on Tax & tip); the additional tip defaults to 0% but can still be added. |
| Discount larger than items | Capped at the items subtotal. |
| Zero people or zero items | Steps can be skipped; the Summary shows an empty state with a clear next action ("Add people" / "Add items"). |
| Person removed | Removed from all shares; any items left with no one become unassigned. |

---

## 9. Receipt Image Upload (on-device OCR)

Built only after sections 2–8 work end to end (milestone M5), as the brief requires. It's purely additive: its output is the same `Item[]` + `Adjustments` that the manual flow produces. **Everything runs in the browser; the image never leaves the device.**

### 9.1 Flow
```
Take photo / Upload ─▶ Crop & rotate ─▶ Preprocess ─▶ OCR (Web Worker) ─▶ Line parser ─▶ Zod validate ─▶ Review screen ─▶ Items in bill
```

1. **Capture**: **Take photo** (camera, on touch devices) or **Upload image** (file picker / photo library on any device; plus drag-and-drop and paste on desktop), as described in Step 1. Accepts JPEG, PNG, WebP, and HEIC where the browser can decode it (iOS converts HEIC to JPEG when picking). Files that can't be decoded show "We couldn't read that image" with **Try another photo** / **Enter manually instead**.
2. **Crop & rotate** (hand-built, no library): the photo appears full-width with a draggable crop rectangle (corner handles, 44 px touch targets) and a ↻ 90° button. **Use whole image** skips the crop. Trimming the table and background around the receipt is the biggest single accuracy gain.
3. **Preprocess** with a plain `<canvas>` (`src/scan/preprocess.ts`):
   - load with `createImageBitmap(file, { imageOrientation: 'from-image' })` so EXIF rotation is applied,
   - apply the rotation and crop, then scale so the long edge is 1600 px.
   - **No thresholding or contrast enhancement.** Tesseract binarizes internally, and in testing it beat both a hand-rolled adaptive threshold (which turned paper texture into junk characters) and a contrast stretch (which dropped a line's confidence from 94% to 67%).
4. **OCR** (`src/scan/ocr.ts`): `createWorker('eng', 1, { workerPath, corePath, langPath, logger })` from `tesseract.js`, with paths from 9.3. Set `tessedit_pageseg_mode` to `6` (single uniform block) and `preserve_interword_spaces` to `1`. A progress bar is driven by `logger` (`progress` 0–1), with a **Cancel** button that terminates the worker. Reuse the worker for later scans in the same session.
5. **Parse** (`src/scan/parseReceipt.ts`, a pure function `parseReceipt(lines: {text, confidence}[], currency) → ReceiptDraft`, unit-tested on text fixtures):
   - **Price lines**: a trailing amount, `/^(.*?)[\s.]+[^\d-]?(-?\d{1,5}(?:[.,]\d{1,3})?)\s*[A-Z]{0,2}$/`, interpreted with the currency's decimals (for 2-decimal currencies, require exactly 2 decimals). The optional trailing letters cover tax-code flags like `T`, `F`, `TX`.
   - **Quantities**: a leading `2 x`, `2x`, `2 @`, or a bare `2 ` before a name → `quantity: 2`. The printed line total is kept as the price.
   - **Totals section**: keyword matching, case-insensitive and tolerant of common OCR substitutions (`0↔O`, `1↔l/I`, `5↔S`, `8↔B`): `sub ?total`; `tax|vat|gst|hst`; `tip`; `gratuity|service( charge)?`; `discount|comp|coupon|promo`; `total|amount due|balance( due)?`. These set `Adjustments` / `printedTotal`, never items. A line matching `tip` with `%` but no amount is ignored.
   - **Negative lines** (e.g. `-5.00 promo`) add to `discount`.
   - **Noise filtering**: drop lines with no price and lines matching card numbers (`\*{2,}\d{4}`), dates/times, phone numbers, `change`, `cash`, `visa|mastercard|amex|debit|credit`, `auth`, `table`, `server`, `guests`, `thank you`.
   - **Modifiers**: a line starting with `+` or indented more than its predecessor, with a price, is merged into the item above (name gets " + avocado", price is added).
   - **Confidence**: Tesseract's per-line confidence is copied onto each item; lines below 70 are flagged.
6. **Validate & convert**: Zod schema → integer minor units → `Item[]` (`source: 'scan'`), plus tax, service charge, discount, and printed total. Confirming the review writes tax and gratuity into the bill's adjustments, so they're **already filled in on the Tax & tip step** (Step 4).
7. **Review screen** (always shown, never auto-committed):
   - Receipt thumbnail (tap to zoom) above or beside the editable item list.
   - Low-confidence rows highlighted in amber; one-tap delete for junk rows; inline edit for name and price.
   - **Reconciliation**: Σ items vs the printed subtotal (if found), and the computed bill total vs the printed total (if found). A green ✓ when they match; otherwise an amber banner with the difference and quick fixes: **Add as "Unlisted item"** / **Edit items**.
   - **"From the bottom of the receipt"** card (formerly an unclear "Also found"): lists any subtotal, tax, gratuity / service charge, tip, discount, and total that were read, with the caption **"These fill in the Tax & tip step and are used to check the math above."** Hidden when none were found.
   - **Add to current items** / **Replace current items** (only when items already exist).
   - **Looks good →** goes to **People**, or to **Assign** if people already exist.
   - If OCR finds no price lines at all: "We couldn't find any items on this receipt", with **Try again** / **Enter manually**.

### 9.2 Honest expectations
On-device OCR is good, not perfect. Crumpled, faded, or angled receipts will need some edits. The design handles this with crop, contrast cleanup, low-confidence highlighting, and reconciliation, so the review step is quick rather than frustrating. Manual entry stays one tap away at every point.

### 9.3 Offline & self-hosting (zero setup)
By default, tesseract.js downloads its worker, WASM core, and language data from a public CDN. Tabby serves them itself instead, **without any setup step**:

| Asset | Source in `node_modules` | Served at |
|---|---|---|
| Worker | `tesseract.js/dist/worker.min.js` | `/tesseract/worker.min.js` |
| WASM core (all variants; the library picks SIMD/LSTM at runtime) | `tesseract.js-core/tesseract-core*.wasm.js` and `*.wasm` | `/tesseract/core/` |
| English data (~3 MB, best_int) | `@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz` | `/tesseract/lang/eng.traineddata.gz` |

- A small plugin in `vite.config.ts` (`ocrAssets()`) maps these paths to files in `node_modules`: dev-server middleware serves them during `npm run dev`, and `generateBundle` emits them into `dist/` on `npm run build`. Nothing is copied by hand, there are no `postinstall` scripts, and `public/` holds no OCR files.
- `ocr.ts` sets `workerPath: BASE + 'tesseract/worker.min.js'`, `corePath: BASE + 'tesseract/core'`, `langPath: BASE + 'tesseract/lang'`, `gzip: true`, where `BASE = import.meta.env.BASE_URL` (`/` locally, `/Tabby/` on GitHub Pages; see 10.2).
- First scan downloads ~7 MB from the local server (core + language data); the browser caches it afterwards. These assets load **only** on first scan; the main bundle is unaffected.
- **Fallback** if the language-data package misbehaves: commit `eng.traineddata.gz` into `public/tesseract/lang/`. That still requires no setup.

### 9.4 Privacy
The image is processed in memory and never stored or uploaded. A downscaled thumbnail is kept only while the review screen is open.

---

## 10. Stand-Out Features (all in scope)

### 10.1 Fair vs. Even
The choice lives on the **Assign step** (Step 3): *By what each person had* (fair, 8.1) or *Evenly* (8.2), stored on the bill as `splitMode`. The Summary shows which one is in use with a **Change** link. In Even mode — when every item is also assigned — each card shows the difference from a by-item split: "+$6.20 vs by item" in muted red, "−$14.20" in muted green, so the group can see who's subsidizing whom.

### 10.2 Share link + QR (no backend)
- **Share link** button → serialize a *share payload* (the bill minus `paid`/history; names, items, amounts, currency, adjustments, split mode, treats, round up, payer, and the payer's pay handles) → `lz-string` `compressToEncodedURIComponent` → `<base URL>#b=<data>`, where `<base URL>` is chosen as described in **Reachability** below.
- The **QR code** (generated locally with `qrcode`, as SVG) is shown in a sheet along with **Copy link** and **Share**. If the payload is too large for a QR code (> ~2,000 characters), only the link is offered, with a note.
- **Opening a link** (`#b=` present) shows a **read-only Viewer**:
  1. "Who are you?" → a grid of name chips.
  2. That person's card: total, items, breakdown, and **Pay {payer}** buttons.
  3. "See everyone" expands all cards. **Save a copy to edit** imports the bill into the viewer's own storage (it doesn't overwrite their current bill without asking).
  - Payloads are Zod-validated; an invalid link shows "This link looks broken" with a button to open Tabby normally.
  - No splash on the viewer.
#### Reachability (decided: local network + GitHub Pages)
A link only works if the friend's phone can reach the URL it points to. `localhost` only works on the computer running the app, so Tabby offers two reachable targets.

**1. Public — GitHub Pages (default when running locally)**
- `.github/workflows/deploy.yml` builds the app and deploys it to GitHub Pages on every push to `main`, using the official `actions/configure-pages`, `actions/upload-pages-artifact`, and `actions/deploy-pages` actions. Pages is free for public repos.
- Public URL: `https://loupgarou451.github.io/Tabby/`, stored once as `PUBLIC_URL` in `src/lib/share.ts`.
- Vite `base` is `'/'` locally and `'/Tabby/'` in the Pages build. `vite.config.ts` picks it from `process.env.GITHUB_ACTIONS`, which GitHub sets automatically. All asset URLs, including the OCR paths in 9.3, are built from `import.meta.env.BASE_URL`, so they work under both.
- **Privacy**: the bill lives in the `#hash` part of the URL, which browsers never send to the server. GitHub only serves the static app; it never sees bill data.
- **One-time repo setting** (done by the implementer in M0, not by anyone cloning): enable Pages with source "GitHub Actions" — `gh api -X POST repos/LoupGarou451/Tabby/pages -f build_type=workflow`. Cloners don't need to do anything; this has no effect on `npm install && npm run dev`.

**2. Local network (same Wi-Fi)**
- `vite.config.ts` sets `server.host: true`, so the dev server is reachable from other devices on the LAN. Vite prints the "Network:" URL at startup.
- At startup, `vite.config.ts` finds the first non-internal IPv4 address with `os.networkInterfaces()` and injects it as `__LAN_HOST__` (e.g. `192.168.1.20`) via `define`. The app adds the port it's actually running on (`location.port`), since Vite picks another port when 5173 is busy. Still zero setup.
- Plain `http://` on a LAN IP is not a secure context, so the app avoids secure-only APIs there: ids fall back from `crypto.randomUUID()` to `crypto.getRandomValues()`, and copying falls back from `navigator.clipboard` to `document.execCommand('copy')`.
- This is useful for trying the app on a phone during development (including the camera) and for sharing without internet.

**Share sheet logic**
- Running on a non-localhost origin (e.g. the Pages site or a LAN IP): link to the current `origin + pathname`. No choice is shown.
- Running on `localhost`: a small toggle — **Anyone (public link)** [default] / **Same Wi-Fi only** — remembered in `prefs.shareTarget`. If no LAN address was found, the Wi-Fi option is disabled with a short explanation.
- Share payloads carry `schemaVersion`, so the deployed app can reject (with a friendly message) links from an incompatible future version.

### 10.3 Pass-the-phone claim mode
Started from Assign ("👋 Pass the phone"):
1. "Hand the phone to **Alex**" (full-screen, large name, **I'm Alex** button).
2. Alex sees every item as a large tappable row and taps what they had. Items others already claimed show those people's avatars, and tapping one adds Alex as a sharer.
3. **Done → Hand to Sam** … until everyone has had a turn (any person can be skipped).
4. A wrap-up screen lists unclaimed items ("Who had these?") with chip pickers and a **Split evenly among everyone** option. Then go to the Summary.
- Items claimed by several people become even splits. This mode writes to the same `shares` data as normal assignment.

### 10.4 Payment request links
On the Summary, if a payer is set, each non-payer card shows **Pay {payer}** buttons. The payer's handles are entered once (prompted the first time) and saved in preferences.
- Venmo (USD only): `https://venmo.com/{handle}?txn=pay&amount={x.xx}&note={encoded title}`
- Cash App (USD, GBP): `https://cash.app/${cashtag}/{x.xx}`
- Always available: **Copy request** → "Hey Sam, your share of Friday dinner is $41.88 — pay Jordan 🙏".

### 10.5 Treat someone
On People or Summary: a 🎂 toggle per person. Their share is spread across everyone else (8.1 step 6). Their card shows "🎂 On us!" and each covering card shows "+$X for Sam's treat".

### 10.6 Penny-perfect badge
The Summary footer reads "✓ Adds up to $187.43 exactly" when `reconciles` is true. If a printed total exists and differs, it shows an amber note instead: "Receipt says $188.00 — $0.57 difference" with **Fix** (jumps to receipt totals).

### 10.7 Remaining meter
A progress bar at the top of Assign: "$142.00 of $154.00 assigned". It turns green with a ✓ at 100%.

### 10.8 Bill history
Menu → **Bill history** opens a sheet listing past bills ("Friday dinner · $187.43 · 4 people · Oct 8"). Bills get here via **Done — save to history** on the Summary, or **Start over** / **New bill**. Tap one to reopen it on its Summary (the current bill, if non-empty, is archived in its place); ✕ deletes (with Undo). The list holds up to 20 bills, dropping the oldest. History also feeds "Recent names" in People.

### 10.9 Settings
Menu → **Settings** opens a sheet: Theme (System / Light / Dark), Default tip %, Payment handles (Venmo, Cash App), **Show tips again** (10.12), **Clear all data** (with confirmation), and a link to **About**. Menu → **About Tabby** opens a sheet with the logo, version, MIT license, GitHub link, and public app link.

*Implementation note:* opening one sheet from another (menu → history) must not let the closing sheet's `close` event dismiss the new one. Sheets only report a user-initiated close (Esc / backdrop / ✕).

### 10.10 (Removed) Quick Split
A separate "Just split it evenly" screen was built in M6 and **removed in M8** at the user's request: having both it and per-item splitting on the home screen was confusing. Even splitting now lives on the Assign step (10.1).

### 10.11 Round up
- A **Round up** switch on the Summary. It's off by default, and its state is saved per bill.
- When on, each person's total rounds **up** to the next whole unit (e.g. $41.37 → $42.00), and the extra goes to the tip (8.1 step 8). Nobody's total ever goes down.
- Each card shows the new total, with "+$0.63 rounded up → tip" in the breakdown. The Summary footer shows the new bill total and how much extra tip the round-up added: "Tip $31.40 + $2.18 from rounding".
- Treated people stay at 0.
- Units: whole major unit for 2- and 3-decimal currencies; 10 for 0-decimal currencies (e.g. ¥1,234 → ¥1,240).

### 10.12 First-run hints
Three short, dismissible coach marks, shown once each, the first time their screen appears:

| id | Where | Text |
|---|---|---|
| `choose-input` | Step 1 | "Scan a receipt or type items in — you can mix and match." |
| `tap-chips` | Step 3, anchored to the first item's chips | "Tap people to assign. Tap more than one to share an item." |
| `share` | Step 5, anchored to the Share button | "Send everyone their total — they don't need the app." |

- Each is a small callout with an arrow and a **Got it** button. Tapping anywhere outside it also dismisses it. Only one shows at a time.
- Dismissed ids are saved in `prefs.hintsSeen`. **Settings → Show tips again** clears them.
- Never shown in the shared-link Viewer, in pass-the-phone mode, or while a sheet is open.
- Accessible: `role="dialog"`, `aria-live="polite"`, focusable **Got it**, Esc dismisses. Respects reduced motion.

### 10.13 Polish checklist (definition of done for M7)
- Mobile-first layout, thumb-reachable primary actions, **≥ 44 px tap targets**.
- Dark mode following the system by default (restaurants are dim).
- Undo snackbar for destructive actions.
- `Intl` currency formatting; locale-aware money input (4.3); `inputmode="decimal"` on price fields.
- Full keyboard flow on desktop (Tab order, Enter to add, Esc closes sheets).
- Haptic tick (`navigator.vibrate(10)`) on chip toggle where supported.
- Accessibility: WCAG 2.1 AA contrast; labelled controls; visible focus rings; avatar chips show initials so color isn't the only signal; sheets trap focus and restore it on close.
- Empty states for every step, with a single clear call to action.
- No layout shift when the bottom bar's values change (tabular numerals).

### 10.14 Out of scope (README "what I'd do with another hour" candidates)
- PWA install + full offline caching (`vite-plugin-pwa`).
- Automatic receipt edge detection and perspective correction instead of a manual crop.
- "Who's drinking?" bulk select to assign all drinks to the drinkers in one tap.
- Currency conversion with an exchange rate (travel).
- Tap a scanned item to highlight its line on the receipt image (Tesseract already returns line positions).

---

## 11. Sample Receipt (tests only)

There is **no sample data in the app** (removed in M8 — users try the real flow). `tests/fixtures/sampleBill.ts` holds the receipt below for unit tests:

| Item | Qty | Price |
|---|---|---|
| Truffle Fries | 1 | 12.00 |
| Burrata | 1 | 16.50 |
| Margherita Pizza | 1 | 19.00 |
| Steak Frites | 1 | 34.00 |
| Caesar Salad | 1 | 14.00 |
| House Red (bottle) | 1 | 48.00 |
| Sparkling Water | 2 | 8.00 |
| Tiramisu | 1 | 11.00 |

Subtotal 162.50 · Tax 14.42 (8.875%) · Printed total 176.92 · Currency USD.

---

## 12. Project Structure

```
Tabby/
├── TABBY_DESIGN.md          ← this document
├── README.md                ← getting started, features, screenshots, AI-tools note, "another hour", decision log link
├── LICENSE                  ← MIT, Copyright (c) 2026 Jeff Fulton
├── .github/workflows/
│   └── deploy.yml           ← build + deploy to GitHub Pages on push to main
├── index.html               ← inline splash markup + early-hide script
├── package.json
├── vite.config.ts           ← react, tailwind, OCR-asset plugin, base path, server.host, __LAN_HOST__
├── eslint.config.js
├── public/
│   └── logo.svg             ← favicon / touch icon
├── src/
│   ├── main.tsx
│   ├── index.css            ← Tailwind v4 import + @theme tokens
│   ├── App.tsx              ← shell: header, step router, bottom bar, viewer switch
│   ├── brand/
│   │   ├── Logo.tsx
│   │   └── useSplash.ts
│   ├── steps/
│   │   ├── ReceiptStep.tsx
│   │   ├── PeopleStep.tsx
│   │   ├── AssignStep.tsx
│   │   ├── TaxTipStep.tsx
│   │   └── SummaryStep.tsx
│   ├── features/
│   │   ├── CurrencySheet.tsx
│   │   ├── PassThePhone.tsx
│   │   ├── ShareSheet.tsx
│   │   ├── Viewer.tsx       ← read-only shared-link view
│   │   ├── History.tsx
│   │   ├── Settings.tsx
│   │   └── Hint.tsx         ← first-run coach marks
│   ├── components/          ← PersonChip, ItemCard, MoneyInput, Sheet, Snackbar, Meter, …
│   ├── scan/
│   │   ├── CropView.tsx
│   │   ├── ReviewScreen.tsx
│   │   ├── preprocess.ts
│   │   ├── ocr.ts
│   │   ├── parseReceipt.ts
│   │   └── schema.ts
│   ├── lib/
│   │   ├── money.ts         ← allocate(), parseMoney(), formatMoney(), minorDigits()
│   │   ├── split.ts         ← computeSplit()
│   │   ├── share.ts         ← encode/decode share links, PUBLIC_URL / LAN URL choice, payment URLs
│   │   └── currencies.ts    ← Intl-based currency list + common list
│   ├── store/
│   │   ├── billStore.ts
│   │   └── prefsStore.ts
└── tests/
    ├── fixtures/sampleBill.ts  ← the sample receipt (section 11)
    ├── money.test.ts
    ├── split.test.ts
    ├── share.test.ts
    └── parseReceipt.test.ts  ← fixtures: realistic OCR text, incl. typos and noise
```

---

## 13. Milestones

Each milestone ends with a working app, passing `build`/`test`/`lint`, and a pushed commit.

| # | Milestone | Done when |
|---|---|---|
| M0 | **Scaffold, license, splash** | Vite + React + TS + Tailwind v4 + ESLint/Prettier + Vitest; `LICENSE` (MIT, Jeff Fulton); logo SVG + favicon + splash (section 3); app shell placeholder; `engines` set; README "Getting started"; **repo made public**; Pages workflow + Pages enabled, live URL serves the app; `server.host` + `__LAN_HOST__`; zero-setup check passes |
| M1 | **Money core** | `money.ts` (`allocate`, `parseMoney`, `formatMoney`, `minorDigits`) + `split.ts` (`computeSplit`, fair + even + treat + round up + quick split) with tests for every invariant in 8.4 |
| M2 | **Manual flow** | Shell (2.1); input-method choice (Scan card disabled "Coming soon"); steps 1–5 end to end with manual entry; sample bill; persistence; empty states |
| M3 | **Currency picker** | Section 4 complete, including 0- and 3-decimal currencies, locale input parsing, and rounding notice |
| M4 | **Assign UX** | Custom weights sheet, Everyone, Split remaining, By person, quantity expansion, remaining meter, undo |
| M5 | **Receipt scanning** | Take photo (touch) + Upload (all; drag/drop/paste) → crop → preprocess → OCR → parse → review/reconcile; self-hosted assets; "Try scanning a sample"; parser tests |
| M6 | **Stand-outs** | Fair vs Even, Treat, round up, penny-perfect badge, share link + QR + Viewer (public + Wi-Fi targets), pass-the-phone, payment links, Quick Split (incl. scan for total), history, settings |
| M7 | **Polish & submit** | First-run hints (10.12); polish checklist (10.13); verify a share link from the public URL opens on a phone; README complete (features, screenshots/GIF, AI-tools note, "another hour", decision log); fresh-clone zero-setup check (section 17) |
| M8 | **Feedback round 1** | All of section 14's D13–D20: neutral header that starts over (with confirmation), no sample data or Quick Split, split method chosen on Assign, clearer scan review, tax/gratuity pre-filled with an additional tip, working menu sheets, and Done → history → home |

---

## 14. Resolved Decisions

| # | Decision | Answer |
|---|---|---|
| D1 | Implementation scope | **Build everything**: M0–M7 |
| D2 | Logo | **Tabby-cat face with receipt-line stripes** (section 3.1) |
| D3 | License | **MIT**, `Copyright (c) 2026 Jeff Fulton` |
| D4 | Currency | **Currency picker** (section 4), USD default |
| D5 | AI / paid services | **None.** No API keys; receipt scanning is on-device (Tesseract.js) |
| D6 | Setup | **Zero setup**: clone → `npm install && npm run dev` |
| D7 | Input methods | User chooses **Scan** (Take photo on mobile / Upload on any device) or **Manual**; both can be mixed |
| D8 | Repo visibility | **Public** (done in M0) |
| D9 | Share-link reachability | **Both**: dev server on the local network with injected LAN URL, **and** automatic GitHub Pages deployment for a public URL (10.2) |
| D10 | Quick "split evenly" mode | ~~Included~~ → **Removed in M8** (D15); even splitting moved to Assign |
| D11 | Round up | **Included**, off by default (10.11, 8.1 step 8) |
| D12 | First-run hints | **Included** (10.12) |
| D13 | Header | Shows only the logo + "Tabby" (no meal name). Tapping it offers to **start over** (with confirmation); the bill name is edited on the Summary |
| D14 | Sample data | **Removed** from the app (no "Try a sample receipt" / sample photo / sample people) |
| D15 | Where to choose "evenly" vs "by item" | **Assign step only** (stored per bill); no separate Quick Split screen |
| D16 | Scan review "Also found" | Renamed **"From the bottom of the receipt"** with a caption explaining what it's for |
| D17 | Tax & gratuity from the receipt | **Pre-filled** on Tax & tip; gratuity shown as its own row, with an **Additional tip** on top |
| D18 | Menu | Bill history, Settings, About **fixed** (they opened and immediately closed) |
| D19 | Ending the flow | **Done — save to history** on the Summary archives the bill and returns home |
| D20 | Default bill name | Neutral date label, "Bill · Oct 9" |

---

## 15. Open Items

None. All questions are resolved (section 14). New questions that come up during implementation go here, with a proposed default and the milestone they block.

---

## 16. Decision Log

Implementers append here any decision made where this spec was silent (date · decision · reason).

| Date | Decision | Reason |
|---|---|---|
| 2026-10-08 | Lint with **oxlint** (the current `create-vite` react-ts default) instead of ESLint; Prettier kept for formatting. TypeScript is the template's pinned version (~6.0). | Follow the official template; faster, zero config. |
| 2026-10-08 | Logo ink stays dark (`#2B2118`) in dark mode; only the page background changes. | The ink sits on the logo's own orange and paper fills, so a light ink would lose contrast. |
| 2026-10-08 | `npm test` runs `vitest run --passWithNoTests`. | Keeps M0 green before tests exist; harmless afterwards. |
| 2026-10-08 | Current bill and history persist together under one key, `tabby:bill` (`{ bill, history }`), instead of separate `tabby:bill` / `tabby:history` keys. | One Zustand store, one `persist`; both are still Zod-validated on load. |
| 2026-10-08 | "Recent names" come from a most-recent-first list of typed names (max 20, 8 shown), not strictly "the last 5 bills". Guests and sample people aren't remembered. | Simpler, and better matches who you actually eat with. |
| 2026-10-09 | Preprocessing is crop + resize only (long edge 1600 px); the planned grayscale/contrast/adaptive-threshold steps were removed. | Measured on the sample receipt: thresholding produced junk text and took ~14 s; plain input read every line at 93–96% confidence in ~3 s. |
| 2026-10-09 | Share links use a compact positional format (names/colors as arrays, item shares as per-person weight arrays, ids regenerated on open) instead of the raw bill JSON. | The raw JSON made a typical 8-item, 4-person bill too long for a QR code; the compact form is ~475 characters. |
| 2026-10-09 | The 🎂 Treat toggle lives on the Summary cards only (not also on People). | That's where its effect is visible; one place keeps People simple. |
| 2026-10-09 | The payment-handles prompt sits below the person cards on the Summary. | Totals come first; payment setup is secondary. |
| 2026-10-09 | M8 feedback round: D13–D20. Quick Split code, its data (`mode`, `quick`), and its share-link fields were removed rather than hidden; `splitMode` was added to the bill (old saves default to `'fair'`). | Keep one clear way to split; no dead code. |
| 2026-10-09 | Root cause of the dead menu items: `Sheet` called `onClose` from the `<dialog>` `close` event even when the app itself closed it, so opening History from the menu immediately reset the open sheet. `Sheet` now reports only user-initiated closes. | Bug found via user feedback; the M6 browser pass only exercised "New bill". |
| 2026-10-09 | Replaced `vite-plugin-static-copy` with a ~40-line plugin in `vite.config.ts`. | Found in the fresh-clone check: the plugin pulled in `chokidar` → `braces`, so `npm install` reported 3 high-severity advisories (dev-only, not exploitable here, and the suggested fix was a breaking downgrade). Now `npm install` reports 0 vulnerabilities. |
| 2026-10-09 | LAN share links use the runtime port; ids and copying have insecure-context fallbacks. | Found in testing: the app crashed on load over `http://<LAN IP>` (`crypto.randomUUID` is secure-context only), and the Wi-Fi link hard-coded port 5173. |
| 2026-10-09 | First-run hints render inline above their target (with an arrow) rather than as floating overlays. | Never covers content, no positioning code, works at any width. |
| 2026-10-09 | `Button` renders a leading emoji in its own `aria-hidden` span. | Chrome dropped the space after some emoji, and screen readers shouldn't announce decorative icons. |
| 2026-10-09 | The scan progress bar eases forward on a timer during recognition. | Tesseract only reports recognition progress at 0% and 100%. |
| 2026-10-09 | `tesseract.js-core` must be the **same major as `tesseract.js`** (7). npm's `latest` tag for core still pointed at 6.x, which lacks the `relaxedsimd` build v7 loads. | Found in browser testing; pinned `^7.0.0`. |
| 2026-10-08 | Duplicate names get their suffix when added ("Sam (2)"), stored in the name. | Keeps every label (chips, summary, share text) consistent without extra logic. |

---

## 17. Submission Checklist (from the brief)

- [x] Public GitHub repo link
- [x] Screenshots of the full flow (manual *and* scan, phone-sized) — `docs/screenshots/`, shown in the README. A screen recording is still to be made by the submitter.
- [x] A few sentences on "what I'd do with another hour" (README)
- [x] Note on AI tools used and how (README)
- [ ] **Zero-setup check:** fresh `git clone` into an empty folder → `npm install && npm run dev` → the full flow works, *including receipt scanning*, with no other steps, no `.env`, and no warnings asking for configuration
- [x] README's "Getting started" is exactly those commands, with nothing else required
- [x] `npm run build`, `npm test`, `npm run lint` all pass

---

## Appendix A — The Original Brief

> **Take-Home Project: Split the Bill**
>
> **The Task** — Build a web app that helps a group of friends split a restaurant bill. Spend about 30 minutes on this. It's fine to let it run in the background — we care about the output, not whether you timed yourself. This is not a test of whether you can build everything from memory. It's a test of how you build with AI. It is better if you actually didn't write any code manually and it was written by Claude Code, Codex or any other tool.
>
> **Starting Point** — At minimum, your app should let users:
> - Start by manually entering the items and image upload is a nice-to-have. Don't attempt the image upload until you are done with the full functionality.
> - Add people to the bill
> - Assign items to people (including shared items)
> - Handle tax and tip
> - Show a final summary of what each person has to pay
> - Keep it client-side. No backend is needed, and there is no need to create users or integrate authentication.
>
> **Make It Yours** — The spec above is intentionally minimal. Once the basics work, make it better. Some directions you could take it (not an exhaustive list):
> - How do you handle the friend who "only had a salad"?
> - What if two people shared an entree?
> - What's the fastest path from receipt to "everyone knows what they owe"?
> - Could you actually use this next time you're at dinner?
>
> Don't try to do everything. Pick what excites you and do it well.
>
> **Tech Stack** — Use whatever you're comfortable with. React or Next.js is the path of least resistance, but we are fine with other choices.
>
> **What We're Looking For**
> - Product instinct — When the spec is ambiguous, what decisions do you make? Do they feel thoughtful?
> - Working software — Does it actually work end-to-end? A polished small scope beats a broken big scope.
> - Tool fluency — How effectively do you use AI tools to move fast? Do you iterate or try to get it perfect in one shot?
> - UI/UX care — Is it something you'd hand your phone to a friend at dinner? Small touches matter.
> - Code quality — Clean, readable code. Not over-engineered, not hacked together.
>
> We will not be evaluating: memorized algorithms or trivia; test coverage percentage; whether you used any specific library.
>
> **Submission** — Send us: (1) A link to the GitHub repo (or zip the project and email it); (2) A short screen recording or screenshots of it working; (3) A few sentences on what you'd do with another hour; (4) Include a brief note on which AI tools you used and how.
>
> No need to deploy — we'll run it locally. Just make sure `npm install && npm run dev` works.
>
> Good luck — and have fun with it. We mean that.
