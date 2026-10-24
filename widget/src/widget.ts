;(function () {
  const script = document.currentScript as HTMLScriptElement | null
  if (!script) return

  const amount = script.dataset.amount || "0"
  const merchant = script.dataset.merchant || ""
  const endpoint = (script.dataset.endpoint || "").replace(/\/$/, "")

  if (!merchant || !endpoint) return

  // ---- Button ----
  const btn = document.createElement("button")
  btn.textContent = `Pay ${amount} MUSD`
  btn.style.cssText = [
    "background:#f7931a;color:#fff;border:none;border-radius:8px",
    "padding:12px 24px;font-size:16px;font-weight:600;cursor:pointer",
  ].join(";")
  script.parentNode?.insertBefore(btn, script)

  // ---- Modal ----
  function createModal(intentId: string) {
    const overlay = document.createElement("div")
    overlay.style.cssText = [
      "position:fixed;inset:0;background:rgba(0,0,0,.7)",
      "display:flex;align-items:center;justify-content:center;z-index:99999",
    ].join(";")

    const box = document.createElement("div")
    box.style.cssText = [
      "background:#1a1a2e;color:#eee;border-radius:16px;padding:32px",
      "max-width:420px;width:90%;font-family:system-ui,sans-serif",
      "border:1px solid #333",
    ].join(";")

    box.innerHTML = `
      <h2 style="margin:0 0 8px;font-size:20px;">Pay with MUSD</h2>
      <p style="margin:0 0 20px;color:#aaa;font-size:14px;">Send exactly <strong style="color:#f7931a">${amount} MUSD</strong> to complete your payment.</p>
      <div id="pk-status" style="margin-bottom:20px;padding:12px;background:#111;border-radius:8px;font-size:13px;word-break:break-all;">
        <div style="color:#aaa;margin-bottom:6px;">Merchant address:</div>
        <div style="color:#fff">${merchant}</div>
      </div>
      <div id="pk-wallet-section">
        <button id="pk-pay-wallet" style="width:100%;padding:12px;background:#f7931a;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;margin-bottom:10px;">
          Pay with Wallet
        </button>
        <div style="text-align:center;color:#666;font-size:12px;margin-bottom:10px;">— or —</div>
        <button id="pk-pay-manual" style="width:100%;padding:10px;background:transparent;color:#aaa;border:1px solid #333;border-radius:8px;font-size:13px;cursor:pointer;">
          I'll send it manually
        </button>
      </div>
      <div id="pk-polling" style="display:none;text-align:center;color:#aaa;font-size:13px;padding:8px 0;">
        ⏳ Waiting for payment confirmation…
      </div>
      <div style="margin-top:20px;text-align:right;">
        <button id="pk-close" style="background:transparent;border:none;color:#666;font-size:12px;cursor:pointer;">Cancel</button>
      </div>
    `

    overlay.appendChild(box)
    document.body.appendChild(overlay)

    const statusEl = box.querySelector("#pk-status") as HTMLDivElement
    const walletSection = box.querySelector("#pk-wallet-section") as HTMLDivElement
    const pollingEl = box.querySelector("#pk-polling") as HTMLDivElement

    function startPolling() {
      walletSection.style.display = "none"
      pollingEl.style.display = "block"
      const interval = setInterval(async () => {
        try {
          const r = await fetch(`${endpoint}/intents/${intentId}`)
          const data = await r.json() as { status: string; tx_hash?: string }
          if (data.status === "completed") {
            clearInterval(interval)
            statusEl.innerHTML = `<div style="color:#4caf50;font-size:22px;text-align:center">✓ Payment confirmed!</div><div style="color:#aaa;font-size:12px;text-align:center;margin-top:8px">TX: ${data.tx_hash?.slice(0, 20)}…</div>`
            pollingEl.style.display = "none"
            window.dispatchEvent(new CustomEvent("paykit:success", { detail: { tx_hash: data.tx_hash } }))
            setTimeout(() => overlay.remove(), 3000)
          } else if (data.status === "expired") {
            clearInterval(interval)
            statusEl.innerHTML = `<div style="color:#f44336;text-align:center">⚠ Payment window expired. Please try again.</div>`
            pollingEl.style.display = "none"
            walletSection.style.display = "block"
          }
        } catch { /* retry next tick */ }
      }, 3000)
    }

    // Wallet pay
    box.querySelector("#pk-pay-wallet")?.addEventListener("click", async () => {
      const eth = (window as any).ethereum
      if (!eth) {
        alert("No wallet detected. Please install MetaMask or use manual payment.")
        return
      }
      try {
        const [from] = await eth.request({ method: "eth_requestAccounts" })
        // MUSD transfer(address,uint256) = 0xa9059cbb
        const amountWei = BigInt(Math.round(parseFloat(amount) * 1e18))
        const padded = (hex: string) => hex.replace(/^0x/, "").padStart(64, "0")
        const data = "0xa9059cbb" + padded(merchant) + padded(amountWei.toString(16))
        await eth.request({
          method: "eth_sendTransaction",
          params: [{ from, to: merchant, data, chainId: "0x7B8B" }], // 31627 testnet -- Ruling: chainId from docs
        })
        startPolling()
      } catch (e: any) {
        if (e.code !== 4001) alert("Transaction failed: " + (e.message || e))
      }
    })

    // Manual pay
    box.querySelector("#pk-pay-manual")?.addEventListener("click", startPolling)

    // Close
    box.querySelector("#pk-close")?.addEventListener("click", () => overlay.remove())
    overlay.addEventListener("click", (e) => { if (e.target === overlay) overlay.remove() })
  }

  // ---- Button click: create intent then open modal ----
  btn.addEventListener("click", async () => {
    btn.disabled = true
    btn.textContent = "Opening…"
    try {
      const r = await fetch(`${endpoint}/intents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_address: merchant, amount_musd: amount }),
      })
      const intent = await r.json() as { id: string }
      createModal(intent.id)
    } catch {
      alert("Failed to create payment intent. Please try again.")
    } finally {
      btn.disabled = false
      btn.textContent = `Pay ${amount} MUSD`
    }
  })
})()
