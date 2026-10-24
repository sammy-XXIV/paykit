import { describe, it, expect } from "vitest"
import { createIntent, getIntent, updateIntent } from "../src/intents"

const mockKV = (() => {
  const store = new Map<string, string>()
  return {
    get: async (k: string) => store.get(k) ?? null,
    put: async (k: string, v: string) => { store.set(k, v) },
  }
})()
const env = { INTENTS_KV: mockKV, MUSD_ADDRESS: "0xMUSD", MEZO_RPC: "https://rpc" } as any

describe("createIntent", () => {
  it("stores intent with pending status", async () => {
    const intent = await createIntent(env, {
      merchant_address: "0xABC",
      amount_musd: "10.00",
      webhook_url: "https://example.com/hook",
    })
    expect(intent.status).toBe("pending")
    expect(intent.merchant_address).toBe("0xABC")
    expect(intent.amount_musd).toBe("10.00")
    expect(intent.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(intent.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it("stores intent retrievable by id", async () => {
    const intent = await createIntent(env, { merchant_address: "0xDEF", amount_musd: "5.00" })
    const fetched = await getIntent(env, intent.id)
    expect(fetched?.id).toBe(intent.id)
  })
})

describe("updateIntent", () => {
  it("patches status and tx_hash", async () => {
    const intent = await createIntent(env, { merchant_address: "0xGHI", amount_musd: "1.00" })
    await updateIntent(env, intent.id, { status: "completed", tx_hash: "0xTX" })
    const updated = await getIntent(env, intent.id)
    expect(updated?.status).toBe("completed")
    expect(updated?.tx_hash).toBe("0xTX")
  })
})
