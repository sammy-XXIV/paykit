export type IntentStatus = "pending" | "completed" | "expired"

export interface Intent {
  id: string
  merchant_address: string
  amount_musd: string
  webhook_url?: string
  expires_at: number
  status: IntentStatus
  tx_hash?: string
  last_block: number
  created_at: number
}

export interface Env {
  INTENTS_KV: KVNamespace
  MUSD_ADDRESS: string
  MEZO_RPC: string
}
