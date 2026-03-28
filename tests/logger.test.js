const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, getDb, createTestUser } = require("./helpers/setup");

const logger = require("../src/utils/logger");

describe("logger", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => await teardown());

    describe("queryAppLogs", () => {
        it("returns empty array when no logs exist", async () => {
            const result = await logger.queryAppLogs();
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });

        it("returns logs filtered by level", async () => {
            await db.query("INSERT INTO app_logs (level, message, context, source) VALUES ($1, $2, $3, $4)", ["error", "Test error", null, ""]);
            await db.query("INSERT INTO app_logs (level, message, context, source) VALUES ($1, $2, $3, $4)", ["info", "Test info", null, ""]);
            const result = await logger.queryAppLogs({ level: "error" });
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].message, "Test error");
        });

        it("filters by date range", async () => {
            await db.query("INSERT INTO app_logs (level, message, context, source) VALUES ($1, $2, $3, $4)", ["info", "Recent log", null, ""]);
            const result = await logger.queryAppLogs({
                startDate: new Date(Date.now() - 60000),
                endDate: new Date(Date.now() + 60000),
            });
            assert.ok(result.length >= 1);
        });
    });
});
