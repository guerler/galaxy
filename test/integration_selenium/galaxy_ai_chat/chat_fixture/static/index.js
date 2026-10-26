// A chat plugin for Galaxy AI's tests: it speaks the host contract and records what it is told.
const app = document.getElementById("app");
const incoming = JSON.parse(app.dataset.incoming);
const origin = new URL(incoming.root).origin;
const record = (window.__fixture = { config: incoming.visualization_config, commands: [] });

function show(line) {
    const item = document.createElement("p");
    item.className = "fixture-line";
    item.textContent = line;
    app.appendChild(item);
}

function report(exchangeId, saved) {
    const message = { visualization_config: { exchange_id: exchangeId }, visualization_saved: saved };
    window.postMessage({ from: "galaxy-visualization", ...message }, origin);
}

window.addEventListener("message", (event) => {
    const data = event.data;
    if (data?.from === "galaxy" && event.source === window.parent && event.origin === origin) {
        record.commands.push(data);
        show(`${data.type}: ${data.exchange_id ?? data.question}`);
        if (data.type === "open") {
            report(data.exchange_id, true);
        } else if (data.type === "ask") {
            report(null, false);
        }
    }
});

show(`mounted: ${JSON.stringify(incoming.visualization_config)}`);
report(record.config.exchange_id ?? null, !record.config.question);
