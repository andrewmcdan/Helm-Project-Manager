const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, getDb, createTestUser, loginTestUser } = require("./helpers/setup");
const { startApp, stopApp, request } = require("./helpers/http");

describe("auth routes", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
        await startApp();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => {
        await stopApp();
        await teardown();
    });

    describe("GET /api/auth/status", () => {
        it("returns loggedIn false without auth headers", async () => {
            const res = await request("GET", "/api/auth/status");
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.loggedIn, false);
        });

        it("returns loggedIn true for valid session", async () => {
            const user = await createTestUser();
            const auth = await loginTestUser(user.id);
            const res = await request("GET", "/api/auth/status", {
                headers: { ...auth.headers },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.loggedIn, true);
        });

        it("returns loggedIn false for invalid token", async () => {
            const res = await request("GET", "/api/auth/status", {
                headers: { Authorization: "Bearer bad_token", "X-User-Id": "999" },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.loggedIn, false);
        });
    });

    describe("POST /api/auth/login", () => {
        it("returns token on successful login", async () => {
            const user = await createTestUser({ password: "Test1!Pass" });
            const res = await request("POST", "/api/auth/login", {
                body: { username: user.username, password: "Test1!Pass" },
            });
            assert.strictEqual(res.status, 200);
            assert.ok(res.json.token);
            assert.ok(res.json.user_id);
        });

        it("returns 401 for wrong password", async () => {
            const user = await createTestUser({ password: "Test1!Pass" });
            const res = await request("POST", "/api/auth/login", {
                body: { username: user.username, password: "WrongPass1!" },
            });
            assert.strictEqual(res.status, 401);
            assert.ok(res.json.error);
        });

        it("returns 401 for non-existent user", async () => {
            const res = await request("POST", "/api/auth/login", {
                body: { username: "nobody_ever_999", password: "Test1!Pass" },
            });
            assert.strictEqual(res.status, 401);
        });

        it("suspends account after 3 failed attempts", async () => {
            const user = await createTestUser({ password: "Test1!Pass" });
            for (let i = 0; i < 3; i++) {
                await request("POST", "/api/auth/login", {
                    body: { username: user.username, password: "Wrong1!Pass" },
                });
            }
            const res = await request("POST", "/api/auth/login", {
                body: { username: user.username, password: "Test1!Pass" },
            });
            // Once suspended due to failed attempts, the 4th attempt should be blocked
            assert.ok(res.status === 401 || res.status === 403);
        });

        it("returns must_change_password for temp password users", async () => {
            const user = await createTestUser({ password: "Test1!Pass", temp_password: true });
            const res = await request("POST", "/api/auth/login", {
                body: { username: user.username, password: "Test1!Pass" },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.must_change_password, true);
        });
    });

    describe("POST /api/auth/logout", () => {
        it("logs out successfully with valid session", async () => {
            const user = await createTestUser();
            const auth = await loginTestUser(user.id);
            const res = await request("POST", "/api/auth/logout", {
                headers: { ...auth.headers },
            });
            assert.strictEqual(res.status, 200);
            assert.strictEqual(res.json.ok, true);
        });

        it("returns 401 without auth headers", async () => {
            const res = await request("POST", "/api/auth/logout");
            assert.strictEqual(res.status, 401);
        });

        it("returns 401 with missing X-User-Id", async () => {
            const res = await request("POST", "/api/auth/logout", {
                headers: { Authorization: "Bearer some_token" },
            });
            assert.strictEqual(res.status, 401);
        });
    });
});
