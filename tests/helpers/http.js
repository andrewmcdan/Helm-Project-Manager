/**
 * Helper to start the Express app on an ephemeral port and make HTTP requests.
 */
const http = require("http");

let server = null;
let baseUrl = null;

async function startApp() {
    if (server) return baseUrl;
    const app = require("../../src/server");
    return new Promise((resolve, reject) => {
        server = app.listen(0, "127.0.0.1", () => {
            const { port } = server.address();
            baseUrl = `http://127.0.0.1:${port}`;
            resolve(baseUrl);
        });
        server.on("error", reject);
    });
}

async function stopApp() {
    if (!server) return;
    return new Promise((resolve) => {
        server.close(() => {
            server = null;
            baseUrl = null;
            resolve();
        });
    });
}

/**
 * Make an HTTP request.  Returns { status, headers, body, json }.
 */
function request(method, path, { headers = {}, body = null } = {}) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const options = {
            method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            headers: { ...headers },
        };
        if (body !== null) {
            const payload = typeof body === "string" ? body : JSON.stringify(body);
            options.headers["Content-Type"] = options.headers["Content-Type"] || "application/json";
            options.headers["Content-Length"] = Buffer.byteLength(payload);
        }
        const req = http.request(options, (res) => {
            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => {
                const raw = Buffer.concat(chunks).toString();
                let json = null;
                try {
                    json = JSON.parse(raw);
                } catch {}
                resolve({ status: res.statusCode, headers: res.headers, body: raw, json });
            });
        });
        req.on("error", reject);
        if (body !== null) {
            req.write(typeof body === "string" ? body : JSON.stringify(body));
        }
        req.end();
    });
}

function getBaseUrl() {
    return baseUrl;
}

module.exports = { startApp, stopApp, request, getBaseUrl };
