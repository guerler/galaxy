// A chat agent for Galaxy AI's tests: it speaks the host contract and records what it is told.
const app = document.getElementById("app");
const incoming = JSON.parse(app.dataset.incoming);
const origin = new URL(incoming.root).origin;
const record = (window.__fixture = { config: incoming.visualization_config, commands: [], connected: false });

function show(line) {
    const item = document.createElement("p");
    item.className = "fixture-line";
    item.textContent = line;
    app.appendChild(item);
}

let port;
function report(message) {
    port.postMessage({ channel: "galaxy-ai", ...message });
}

window.addEventListener("message", (event) => {
    const message = event.data;
    const connect = message?.channel === "galaxy-ai" && message.type === "connect";
    if (!port && connect && event.source === window.parent && event.origin === origin && event.ports[0]) {
        port = event.ports[0];
        record.connected = true;
        port.onmessage = ({ data }) => {
            record.commands.push(data);
            show(`${data.type}: ${data.exchange_id ?? data.question}`);
            if (data.type === "open") {
                report({ type: "active", exchange_id: data.exchange_id });
                report({ type: "unsaved", value: false });
            } else if (data.type === "ask") {
                report({ type: "active", exchange_id: null });
                report({ type: "unsaved", value: true });
            }
        };
        report({ type: "active", exchange_id: record.config.exchange_id ?? null });
        report({ type: "unsaved", value: Boolean(record.config.question) });
    }
});

show(`mounted: ${JSON.stringify(incoming.visualization_config)}`);
window.parent.postMessage({ channel: "galaxy-ai", type: "ready" }, origin);
