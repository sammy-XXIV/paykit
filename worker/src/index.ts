import { Hono } from "hono"
import { cors } from "hono/cors"
import type { Env } from "./types"
import { createIntent, getIntent, updateIntent } from "./intents"
import { checkPayment } from "./monitor"
import { fireWebhook } from "./webhook"
import { WIDGET_JS } from "./widget-inline"

const app = new Hono<{ Bindings: Env }>()
app.use("*", cors())

app.post("/intents", async (c) => {
  const body = await c.req.json().catch(() => null)
  if (!body?.merchant_address || !body?.amount_musd) {
    return c.json({ error: "merchant_address and amount_musd required" }, 400)
  }
  const intent = await createIntent(c.env, {
    merchant_address: body.merchant_address,
    amount_musd: body.amount_musd,
    webhook_url: body.webhook_url,
  })
  return c.json(intent, 201)
})

app.get("/intents/:id", async (c) => {
  const intent = await getIntent(c.env, c.req.param("id"))
  if (!intent) return c.json({ error: "not found" }, 404)

  if (intent.status === "completed") return c.json(intent)

  const now = Math.floor(Date.now() / 1000)
  if (intent.expires_at < now && intent.status === "pending") {
    await updateIntent(c.env, intent.id, { status: "expired" })
    return c.json(await getIntent(c.env, intent.id))
  }

  const result = await checkPayment(intent, c.env)
  await updateIntent(c.env, intent.id, { last_block: result.block })

  if (result.found) {
    await updateIntent(c.env, intent.id, { status: "completed", tx_hash: result.tx_hash })
    const updated = await getIntent(c.env, intent.id)
    if (intent.webhook_url && updated) {
      c.executionCtx.waitUntil(
        fireWebhook(intent.webhook_url, {
          intent_id: intent.id,
          status: "completed",
          tx_hash: result.tx_hash!,
          merchant_address: intent.merchant_address,
          amount_musd: intent.amount_musd,
        })
      )
    }
    return c.json(updated)
  }

  return c.json(await getIntent(c.env, intent.id))
})

app.get("/widget.js", (c) => {
  return new Response(WIDGET_JS, {
    headers: { "Content-Type": "application/javascript; charset=utf-8" },
  })
})

export default app
