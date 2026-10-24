export interface WebhookPayload {
  intent_id: string
  status: "completed"
  tx_hash: string
  merchant_address: string
  amount_musd: string
}

export async function fireWebhook(url: string, payload: WebhookPayload): Promise<void> {
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  } catch {
    // fire-and-forget: swallow errors silently
  }
}
