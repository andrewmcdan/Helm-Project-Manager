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

    describe("logAudit", () => {
        it("inserts an audit log entry", async () => {
            const user = await createTestUser();
            await logger.logAudit("user_login", user.id, "user", user.id, { field: "status" }, { ip: "127.0.0.1" });
            const result = await db.query("SELECT * FROM audit_logs WHERE event_type = 'user_login'");
            assert.strictEqual(result.rows.length, 1);
            assert.strictEqual(result.rows[0].entity_type, "user");
            assert.deepStrictEqual(result.rows[0].change_details, { field: "status" });
            assert.deepStrictEqual(result.rows[0].metadata, { ip: "127.0.0.1" });
        });

        it("handles null user_id without throwing", async () => {
            await logger.logAudit("system_event", null, "system", 1, {}, {});
            const result = await db.query("SELECT * FROM audit_logs WHERE event_type = 'system_event'");
            assert.strictEqual(result.rows.length, 1);
        });
    });

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

    describe("queryAuditLogs", () => {
        it("returns empty array when no audit logs exist", async () => {
            const result = await logger.queryAuditLogs();
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });

        it("filters by event_type", async () => {
            const u1 = await createTestUser();
            const u2 = await createTestUser();
            await db.query("INSERT INTO audit_logs (event_type, user_id, entity_type, entity_id, change_details, metadata) VALUES ($1, $2, $3, $4, $5, $6)", ["password_change", u1.id, "user", u1.id, JSON.stringify({}), JSON.stringify({})]);
            await db.query("INSERT INTO audit_logs (event_type, user_id, entity_type, entity_id, change_details, metadata) VALUES ($1, $2, $3, $4, $5, $6)", ["user_login", u2.id, "user", u2.id, JSON.stringify({}), JSON.stringify({})]);
            const result = await logger.queryAuditLogs({ event_type: "password_change" });
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].event_type, "password_change");
        });

        it("filters by user_id", async () => {
            const u1 = await createTestUser();
            const u2 = await createTestUser();
            await db.query("INSERT INTO audit_logs (event_type, user_id, entity_type, entity_id, change_details, metadata) VALUES ($1, $2, $3, $4, $5, $6)", ["action_a", u1.id, "user", u1.id, JSON.stringify({}), JSON.stringify({})]);
            await db.query("INSERT INTO audit_logs (event_type, user_id, entity_type, entity_id, change_details, metadata) VALUES ($1, $2, $3, $4, $5, $6)", ["action_b", u2.id, "user", u2.id, JSON.stringify({}), JSON.stringify({})]);
            const result = await logger.queryAuditLogs({ user_id: u1.id });
            assert.strictEqual(result.length, 1);
            assert.strictEqual(result[0].event_type, "action_a");
        });
    });
});
