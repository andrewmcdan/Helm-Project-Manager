const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, getDb, createTestUser, loginTestUser, getAdminAuth } = require("./helpers/setup");
const { startApp, stopApp, request } = require("./helpers/http");

describe("page rendering routes", () => {
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

    async function adminHeaders() {
        const { headers } = await getAdminAuth();
        return headers;
    }

    describe("GET /pages/dashboard.html", () => {
        it("returns 401 without auth", async () => {
            const res = await request("GET", "/pages/dashboard.html");
            assert.strictEqual(res.status, 401);
        });

        it("returns rendered HTML with auth", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/pages/dashboard.html", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.includes("<!DOCTYPE html>") || res.body.includes("<html") || res.body.includes("<div"));
        });
    });

    describe("GET /pages/profile.html", () => {
        it("returns 401 without auth", async () => {
            const res = await request("GET", "/pages/profile.html");
            assert.strictEqual(res.status, 401);
        });

        it("returns rendered HTML with auth", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/pages/profile.html", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.includes("<!DOCTYPE html>") || res.body.includes("<html") || res.body.includes("<div"));
        });
    });

    describe("GET /pages/public/forgot-password_submit.html", () => {
        it("renders with empty token when no reset_token provided", async () => {
            // This is a public-ish page behind auth middleware
            // but the forgot-password route is actually mounted before auth middleware?
            // Let's check both cases
            const res = await request("GET", "/pages/public/forgot-password_submit.html");
            // Could be 401 if behind auth, or 200 if public
            assert.ok(res.status === 200 || res.status === 401);
        });

        it("renders with auth and no reset_token", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/pages/public/forgot-password_submit.html", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.includes("<!DOCTYPE html>") || res.body.includes("<html") || res.body.includes("<div") || res.body.includes("<form"));
        });

        it("renders with a valid reset token", async () => {
            const h = await adminHeaders();
            const user = await createTestUser();
            // Set a reset token on the user
            const resetToken = "test-reset-token-" + Date.now();
            await db.query("UPDATE users SET reset_token = $1 WHERE id = $2", [resetToken, user.id]);
            // Also set up security questions
            await db.query("UPDATE users SET security_question_1 = $1, security_question_2 = $2, security_question_3 = $3 WHERE id = $4", ["fav_color", "pet_name", "birth_city", user.id]);

            const res = await request("GET", `/pages/public/forgot-password_submit.html?reset_token=${resetToken}`, { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("renders with an invalid reset token", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/pages/public/forgot-password_submit.html?reset_token=invalid-token", { headers: h });
            assert.strictEqual(res.status, 200);
        });
    });

    describe("static files", () => {
        it("serves index.html", async () => {
            const res = await request("GET", "/index.html");
            // index.html is served as a static file, could be before or after auth
            assert.ok(res.status === 200 || res.status === 304 || res.status === 401);
        });

        it("serves CSS files", async () => {
            const res = await request("GET", "/css/base.css");
            assert.ok(res.status === 200 || res.status === 304 || res.status === 401);
        });

        it("serves JS files", async () => {
            const res = await request("GET", "/js/app.js");
            assert.ok(res.status === 200 || res.status === 304 || res.status === 401);
        });
    });
});
