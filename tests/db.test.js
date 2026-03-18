const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, getDb } = require("./helpers/setup");

describe("db module", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });
    after(async () => await teardown());

    describe("query", () => {
        it("executes a simple SELECT", async () => {
            const result = await db.query("SELECT 1 AS val");
            assert.strictEqual(result.rows[0].val, 1);
        });

        it("supports parameterized queries", async () => {
            const result = await db.query("SELECT $1::text AS name", ["hello"]);
            assert.strictEqual(result.rows[0].name, "hello");
        });

        it("throws on invalid SQL", async () => {
            await assert.rejects(
                () => db.query("INVALID SQL STATEMENT"),
                (err) => {
                    assert.ok(err instanceof Error);
                    return true;
                },
            );
        });
    });

    describe("transaction", () => {
        it("commits on success", async () => {
            const result = await db.transaction(async (client) => {
                const res = await client.query("SELECT 42 AS answer");
                return res.rows[0].answer;
            });
            assert.strictEqual(result, 42);
        });

        it("rolls back on error", async () => {
            // Create a temp table inside a transaction that will fail
            await db.query("CREATE TABLE IF NOT EXISTS _db_test_tx (id SERIAL PRIMARY KEY, val TEXT)");
            try {
                await db.transaction(async (client) => {
                    await client.query("INSERT INTO _db_test_tx (val) VALUES ('should_rollback')");
                    throw new Error("Forced rollback");
                });
            } catch (err) {
                assert.strictEqual(err.message, "Forced rollback");
            }
            // The insert should have been rolled back
            const result = await db.query("SELECT * FROM _db_test_tx WHERE val = 'should_rollback'");
            assert.strictEqual(result.rows.length, 0);
            await db.query("DROP TABLE IF EXISTS _db_test_tx");
        });
    });

    describe("getClient", () => {
        it("returns a client that can execute queries", async () => {
            const client = await db.getClient();
            try {
                const result = await client.query("SELECT 1 AS val");
                assert.strictEqual(result.rows[0].val, 1);
            } finally {
                client.release();
            }
        });
    });
});
