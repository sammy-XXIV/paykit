import { describe, it, expect, vi, afterEach } from "vitest"
import { checkPayment } from "../src/monitor"

afterEach(() => vi.restoreAllMocks())

const baseIntent = {
  id: "test01",
  merchant_address: "0xMERCHANT",
  amount_musd: "10.00",
  expires_at: Math.floor(Date.now() / 1000) + 900,
  status: "pending" as const,
  last_block: 100,
  created_at: Math.floor(Date.now() / 1000),
}
const env = { MUSD_ADDRESS: "0xMUSD", MEZO_RPC: "https://rpc", INTENTS_KV: {} as any }

describe("checkPayment", () => {
  it("returns found=true when transfer >= amount exists", async () => {
    vi.stubGlobal("fetch", async () => ({
      json: async () => ({
        result: [{
          transactionHash: "0xTXHASH",
          data: "0x" + BigInt("10000000000000000000").toString(16).padStart(64, "0"),
          blockNumber: "0x65",
        }],
      }),
    }))
    const res = await checkPayment(baseIntent, env)
    expect(res.found).toBe(true)
    expect(res.tx_hash).toBe("0xTXHASH")
  })

  it("returns found=false when transfer < amount", async () => {
    vi.stubGlobal("fetch", async () => ({
      json: async () => ({
        result: [{
          transactionHash: "0xTXHASH",
          data: "0x" + BigInt("9000000000000000000").toString(16).padStart(64, "0"),
          blockNumber: "0x65",
        }],
      }),
    }))
    const res = await checkPayment(baseIntent, env)
    expect(res.found).toBe(false)
  })

  it("returns found=false when no logs", async () => {
    vi.stubGlobal("fetch", async () => ({
      json: async () => ({ result: [] }),
    }))
    const res = await checkPayment(baseIntent, env)
    expect(res.found).toBe(false)
  })

  it("returns last known block on RPC error", async () => {
    vi.stubGlobal("fetch", async () => { throw new Error("network error") })
    const res = await checkPayment(baseIntent, env)
    expect(res.found).toBe(false)
    expect(res.block).toBe(100)
  })
})
