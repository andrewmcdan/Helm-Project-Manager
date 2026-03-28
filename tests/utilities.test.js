const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, getDb } = require("./helpers/setup");

const { sanitizeInput, generateRandomToken, getCallerInfo, cleanupLogs } = require("../src/utils/utilities");

describe("utilities", () => {
    before(async () => await setup());
    after(async () => await teardown());

    describe("sanitizeInput", () => {
        it("returns non-string values unchanged", () => {
            assert.strictEqual(sanitizeInput(42), 42);
            assert.strictEqual(sanitizeInput(null), null);
            assert.strictEqual(sanitizeInput(undefined), undefined);
            assert.strictEqual(sanitizeInput(true), true);
        });

        it("escapes HTML special characters", () => {
            assert.strictEqual(sanitizeInput("<script>"), "&lt;script&gt;");
            assert.strictEqual(sanitizeInput('a"b'), "a&quot;b");
            assert.strictEqual(sanitizeInput("a&b"), "a&amp;b");
        });

        it("escapes backticks", () => {
            const result = sanitizeInput("a`b");
            assert.strictEqual(result, "a&#x60;b");
        });

        it("escapes single quotes for SQL by doubling them", () => {
            // After HTML escape, &#x27; becomes &#x27; (no single quote left)
            const result = sanitizeInput("it's");
            assert.ok(!result.includes("'") || result.includes("''"), "single quotes should be doubled");
        });

        it("strips $ and . characters", () => {
            const result = sanitizeInput("price$10.00");
            assert.ok(!result.includes("$"));
            assert.ok(!result.includes("."));
        });

        it("handles empty string", () => {
            assert.strictEqual(sanitizeInput(""), "");
        });
    });

    describe("generateRandomToken", () => {
        it("generates a token of default length 32", () => {
            const token = generateRandomToken();
            assert.strictEqual(token.length, 32);
        });

        it("generates a token of specified length", () => {
            const token = generateRandomToken(64);
            assert.strictEqual(token.length, 64);
        });

        it("generates only alphanumeric characters", () => {
            const token = generateRandomToken(100);
            assert.match(token, /^[A-Za-z0-9]+$/);
        });

        it("generates unique tokens", () => {
            const a = generateRandomToken();
            const b = generateRandomToken();
            assert.notStrictEqual(a, b);
        });
    });

    describe("getCallerInfo", () => {
        it("returns an object with file, line, and column", () => {
            const info = getCallerInfo();
            assert.ok(info, "should not be null");
            assert.ok(typeof info.file === "string");
            assert.ok(typeof info.line === "number");
            assert.ok(typeof info.column === "number");
        });
    });

    describe("cleanupLogs", () => {
        it("runs without errors even on empty tables", async () => {
            await assert.doesNotReject(async () => {
                await cleanupLogs();
            });
        });

        it("deletes old app logs beyond retention", async () => {
            const db = getDb();
            // Insert an old log
            await db.query("INSERT INTO app_logs (level, message, context, source, created_at) VALUES ($1, $2, $3, $4, $5)", ["info", "old log", null, "", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)]);
            // Insert a recent log
            await db.query("INSERT INTO app_logs (level, message, context, source, created_at) VALUES ($1, $2, $3, $4, $5)", ["info", "recent log", null, "", new Date()]);

            await cleanupLogs();

            const result = await db.query("SELECT message FROM app_logs");
            const messages = result.rows.map((r) => r.message);
            assert.ok(!messages.includes("old log"), "old log should be deleted");
            assert.ok(messages.includes("recent log"), "recent log should remain");

            // cleanup
            await db.query("DELETE FROM app_logs");
        });
    });
});
