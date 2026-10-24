import { describe, it, expect, vi, afterEach } from "vitest"
import { fireWebhook } from "../src/webhook"

afterEach(() => vi.restoreAllMocks())

describe("fireWebhook", () => {
  it("POSTs JSON payload to webhook URL", async () => {
    const calls: RequestInit[] = []
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      calls.push(init)
      return { ok: true }
    })
    await fireWebhook("https://example.com/hook", {
      intent_id: "abc",
      status: "completed",
      tx_hash: "0xTX",
      merchant_address: "0xM",
      amount_musd: "10.00",
    })
    expect(calls).toHaveLength(1)
    const body = JSON.parse(calls[0].body as string)
    expect(body.intent_id).toBe("abc")
    expect(body.status).toBe("completed")
  })

  it("does not throw if fetch fails", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("network error") })
    await expect(fireWebhook("https://bad.example.com", {
      intent_id: "x", status: "completed", tx_hash: "0x", merchant_address: "0x", amount_musd: "1",
    })).resolves.not.toThrow()
  })
})
