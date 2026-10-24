import type { Intent, Env } from "./types"

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

function padAddress(addr: string): string {
  return "0x" + addr.replace(/^0x/i, "").padStart(64, "0")
}

export async function checkPayment(
  intent: Intent,
  env: Env
): Promise<{ found: boolean; tx_hash?: string; block: number }> {
  try {
    const amountWei = BigInt(Math.round(parseFloat(intent.amount_musd) * 1e18))
    const fromBlock = "0x" + (intent.last_block + 1).toString(16)

    const body = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getLogs",
      params: [{
        address: env.MUSD_ADDRESS,
        fromBlock,
        toBlock: "latest",
        topics: [TRANSFER_TOPIC, null, padAddress(intent.merchant_address)],
      }],
    })

    const resp = await fetch(env.MEZO_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    })
    const json = await resp.json() as { result: Array<{ transactionHash: string; data: string; blockNumber: string }> }
    const logs = json.result ?? []

    for (const log of logs) {
      const value = BigInt("0x" + log.data.replace(/^0x/, ""))
      if (value >= amountWei) {
        return { found: true, tx_hash: log.transactionHash, block: parseInt(log.blockNumber, 16) }
      }
    }

    // Return latest block from last log, or last_block if no logs
    const lastBlock = logs.length > 0
      ? parseInt(logs[logs.length - 1].blockNumber, 16)
      : intent.last_block

    return { found: false, block: lastBlock }
  } catch {
    return { found: false, block: intent.last_block }
  }
}
