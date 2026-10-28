class FinancesShell extends HTMLElement {
  set hass(hass) {
    this._hass = hass;
    if (!this.frame) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `<style>:host{display:block;height:100%;min-height:calc(100vh - 48px)}iframe{display:block;width:100%;height:100%;min-height:calc(100vh - 48px);border:0;background:#f4f6f3}</style><iframe title="Finances" src="/finances_static/index.html"></iframe>`;
      this.frame = this.shadowRoot.querySelector("iframe");
      this.frame.addEventListener("load", () => this.ready = true);
      window.addEventListener("message", (event) => this.handleMessage(event));
    }
  }

  async handleMessage(event) {
    if (event.source !== this.frame?.contentWindow || event.origin !== location.origin) return;
    const { type, requestId, message } = event.data || {};
    if (type !== "finance-call" || !Number.isInteger(requestId) || !message) return;
    try {
      const result = await this._hass.callWS(message);
      this.frame.contentWindow.postMessage({ type: "finance-result", requestId, result }, location.origin);
    } catch (error) {
      this.frame.contentWindow.postMessage({ type: "finance-error", requestId, error: error.message }, location.origin);
    }
  }
}

customElements.define("finances-shell", FinancesShell);
