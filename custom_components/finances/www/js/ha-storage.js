"use strict";

const pending = new Map();
let requestId = 1;

window.addEventListener("message", event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const message = event.data || {};
    if (!pending.has(message.requestId)) return;
    const { resolve, reject } = pending.get(message.requestId);
    pending.delete(message.requestId);
    if (message.type === "finance-result") resolve(message.result);
    if (message.type === "finance-error") reject(new Error(message.error || "Home Assistant request failed"));
});

const call = message => new Promise((resolve, reject) => {
    const id = requestId++;
    pending.set(id, { resolve, reject });
    window.parent.postMessage({ type: "finance-call", requestId: id, message }, window.location.origin);
    window.setTimeout(() => {
        if (pending.delete(id)) reject(new Error("Home Assistant did not respond"));
    }, 15000);
});

window.financeStorage = {
    load: () => call({ type: "finances/load" }),
    save: state => call({ type: "finances/save", state })
};
