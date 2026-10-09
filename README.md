<p align="center"><img src="public/logo.svg" width="96" alt="Tabby logo: a tabby cat whose stripes are receipt lines"></p>

<h1 align="center">Tabby</h1>
<p align="center"><b>Split the tab.</b> Scan or type in a restaurant receipt, say who had what, and see what everyone owes.</p>

---

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer. Nothing else: no API keys, accounts, or `.env` file.

```bash
git clone https://github.com/LoupGarou451/Tabby.git
cd Tabby
npm install && npm run dev
```

Then open the **Local** address Vite prints (usually http://localhost:5173).

To try it on your phone, including the camera, open the **Network** address it prints while your phone is on the same Wi-Fi.

## What it does

Tabby walks through five steps. You can go back at any time, and each step only asks for what's needed to work out the totals.

1. **Receipt.** Scan a receipt (take a photo on a phone, or upload an image) or type the items in. Scanning runs entirely in your browser, so the photo is never uploaded. You then review what was read, fix anything, and add items the scan missed. Tax and any gratuity on the receipt carry over automatically.
2. **People.** Add everyone at the table, and mark who paid the bill.
3. **Assign.** Choose how to split:
   - **By what each person had:** tap people on each item. Tap several people to share an item, or give someone more "parts" if they had more of it. **Pass the phone** lets each person tap their own items in turn.
   - **Evenly:** everyone pays the same share.
4. **Tax & tip.** Adjust the tax, any gratuity from the receipt, and the tip (18 / 20 / 22% or a custom amount). Bills start with no tip until you pick one.
5. **Summary.** See what each person owes. Tax and tip are shared in proportion to what people ordered, and totals always add up to the exact cent. From here you can:
   - share a link or QR code, which friends open to see their own total with a Venmo / Cash App button,
   - share the totals as text,
   - treat someone (their share is covered by everyone else) or round everyone up,
   - tap **Done** to save the bill to history and start a new one.

Bill history, settings (theme, suggested tip, payment handles), a currency picker, and dark mode are in the ☰ menu.

## Technical details

Everything runs in the browser. There's no backend, and every library is free and open source.

| Technology | Used for |
|---|---|
| [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) | The user interface |
| [Vite](https://vite.dev) | Dev server and production build; also serves the OCR files from `node_modules` so no setup or downloads are needed |
| [Tailwind CSS 4](https://tailwindcss.com) | Styling, including light and dark themes |
| [Zustand](https://zustand.docs.pmnd.rs) | App state; saves the current bill, history, and settings to the browser's local storage |
| [Zod](https://zod.dev) | Validating saved bills, share links, and scanned receipt data |
| [Tesseract.js](https://tesseract.projectnaptha.com) | On-device text recognition (OCR) for receipt photos, in a background Web Worker |
| [lz-string](https://github.com/pieroxy/lz-string) | Compressing a bill into a short share link |
| [qrcode](https://github.com/soldair/node-qrcode) | Generating the share link's QR code |
| [Vitest](https://vitest.dev) | Unit tests for the money math, split rules, receipt parser, share links, and step validation |
| [oxlint](https://oxc.rs) + [Prettier](https://prettier.io) | Linting and formatting |
| GitHub Actions + GitHub Pages | Runs the tests and publishes the [live version](https://loupgarou451.github.io/Tabby/) on every push |

All of the bill math lives in one tested function, `computeSplit()` in [`src/lib/split.ts`](src/lib/split.ts). Money is stored as whole cents, so totals never drift by a penny.

Other commands: `npm test` (unit tests), `npm run build` (production build), `npm run lint`.

The full product and technical spec, including the reasoning behind each decision, is in [TABBY_DESIGN.md](TABBY_DESIGN.md).

## License

[MIT](LICENSE) © 2026 Jeff Fulton
