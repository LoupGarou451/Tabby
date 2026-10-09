<p align="center"><img src="public/logo.svg" width="96" alt="Tabby logo"></p>

<h1 align="center">Tabby</h1>
<p align="center"><b>Split the tab.</b> Snap the receipt, tap who had what, and everyone knows what they owe.</p>

---

## Getting started

```bash
git clone https://github.com/LoupGarou451/Tabby.git
cd Tabby
npm install && npm run dev
```

That's it. No API keys, no `.env`, no accounts, no extra downloads. Requires Node.js 20 or newer.

- Open the **Local** URL Vite prints (usually http://localhost:5173).
- To try it on your phone (including the camera), open the **Network** URL it prints while on the same Wi-Fi.
- Live version: https://loupgarou451.github.io/Tabby/

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server (also reachable on your local network) |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build |
| `npm test` | Run unit tests (money math, split rules, receipt parser) |
| `npm run lint` | Lint with oxlint |

## Design

The full product and technical spec is in [TABBY_DESIGN.md](TABBY_DESIGN.md).

## License

[MIT](LICENSE) © 2026 Jeff Fulton
