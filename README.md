# Paykit

Drop-in MUSD checkout for any website. One `<script>` tag — your customers pay with Bitcoin-backed stablecoin, you get a webhook when it lands on-chain.

**Live demo:** https://sammy-xxiv.github.io/paykit/  
**Worker:** https://paykit.samsonsamuel531.workers.dev

---

## The problem

Merchants who want to accept MUSD have to build their own wallet integration, write a polling loop against the Mezo RPC, handle webhooks, and deploy infra — before taking a single payment.

Paykit does all of that. Drop in one script tag.

---

## Quick start

```html
<script
  src="https://paykit.samsonsamuel531.workers.dev/widget.js"
  data-amount="10"
  data-merchant="YOUR_MEZO_ADDRESS"
  data-token="0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503"
  data-endpoint="https://paykit.samsonsamuel531.workers.dev"
></script>
```

Listen for confirmation:

```js
window.addEventListener('paykit:success', (e) => {
  console.log('paid', e.detail.tx_hash)
})
```

Optional webhook — pass `data-webhook="https://yourserver.com/hook"` and the worker POSTs `{ intent_id, status, tx_hash, merchant_address, amount_musd }` on confirmation.

---

## How it works

```
Browser                  Paykit Worker            Mezo RPC
  │                           │                       │
  ├─ POST /intents ──────────►│  store in KV          │
  │◄─ { id } ────────────────┤                       │
  │                           │                       │
  ├─ GET /intents/:id ───────►│  eth_getLogs ────────►│
  │                           │◄─ Transfer events ────┤
  │◄─ { status: completed } ──┤                       │
  │                           ├─ POST webhook ───────►│
```

- No smart contract deployment — read-only on-chain queries only
- Lazy polling: every `GET /intents/:id` triggers a chain check
- 15-minute payment windows, stored in Cloudflare KV
- CORS-open, works from any origin

---

## API

### `POST /intents`

```json
{
  "merchant_address": "0x…",
  "amount_musd": "10",
  "webhook_url": "https://…"   // optional
}
```

Returns an intent with `id`, `expires_at`, `status: "pending"`.

### `GET /intents/:id`

Checks the chain, updates status, fires webhook if newly completed.

Returns `{ id, status, tx_hash?, merchant_address, amount_musd, expires_at }`.

### `GET /widget.js`

Serves the embeddable IIFE widget. No bundler needed.

---

## Token addresses

| Network | Chain ID | MUSD address |
|---------|----------|-------------|
| Mezo Testnet | 31611 | `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` |
| Mezo Mainnet | 31612 | `0xdD468A1DDc392dcdbEf6db6e34E89AA338F9F186` |

---

## Local dev

```bash
cd worker
npm install
npm test          # 9 tests
npm run dev       # wrangler dev on :8787
```

Build widget after editing `widget/src/widget.ts`:

```bash
npm run build:widget
```

---

## Stack

- **Cloudflare Workers** — edge compute, zero cold starts
- **Cloudflare KV** — intent storage
- **Mezo RPC** — `eth_getLogs` for MUSD Transfer events
- **Hono** — routing
- **Vanilla JS widget** — no dependencies, ~7KB

---

## Roadmap

- npm package (`paykit-mezo`) for React/Vue
- Hosted payment links
- Mainnet deployment
- Merchant dashboard
- Multi-token (mUSDC, MEZO)
