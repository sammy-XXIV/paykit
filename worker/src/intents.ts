import type { Intent, IntentStatus, Env } from "./types"

const KEY = (id: string) => `intent:${id}`

export async function createIntent(
  env: Env,
  params: { merchant_address: string; amount_musd: string; webhook_url?: string }
): Promise<Intent> {
  const intent: Intent = {
    id: crypto.randomUUID(),
    merchant_address: params.merchant_address,
    amount_musd: params.amount_musd,
    webhook_url: params.webhook_url,
    expires_at: Math.floor(Date.now() / 1000) + 900,
    status: "pending",
    last_block: 0,
    created_at: Math.floor(Date.now() / 1000),
  }
  await env.INTENTS_KV.put(KEY(intent.id), JSON.stringify(intent))
  return intent
}

export async function getIntent(env: Env, id: string): Promise<Intent | null> {
  const raw = await env.INTENTS_KV.get(KEY(id))
  if (!raw) return null
  return JSON.parse(raw) as Intent
}

export async function updateIntent(
  env: Env,
  id: string,
  patch: Partial<Pick<Intent, "status" | "tx_hash" | "last_block">>
): Promise<void> {
  const intent = await getIntent(env, id)
  if (!intent) return
  const updated: Intent = { ...intent, ...patch }
  await env.INTENTS_KV.put(KEY(id), JSON.stringify(updated))
}
