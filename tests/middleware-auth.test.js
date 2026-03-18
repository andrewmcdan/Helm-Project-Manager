const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, createTestUser, loginTestUser, getDb } = require("./helpers/setup");
const authMiddleware = require("../src/middleware/auth");

/* Tiny mock helpers for req/res/next */
function mockReq(overrides = {}) {
    const headers = overrides.headers || {};
    return {
        path: overrides.path || "/api/some-protected-route",
        get(name) {
            const lower = name.toLowerCase();
            if (lower === "authorization") return headers["Authorization"] || headers["authorization"];
            if (lower === "x-user-id") return headers["X-User-Id"] || headers["x-user-id"];
            return headers[name];
        },
        user: overrides.user || undefined,
    };
}

function mockRes() {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            res.statusCode = code;
            return res;
        },
        json(obj) {
            res.body = obj;
            return res;
        },
    };
    return res;
}

describe("auth middleware", () => {
    let db;
    let testUser;
    let testAuth;

    before(async () => {
        await setup();
        db = getDb();
        testUser = await createTestUser({ role: "coder" });
        testAuth = await loginTestUser(testUser.id);
    });

    after(async () => await teardown());

    it("skips auth for public paths (non_auth_paths_begin)", async () => {
        const publicPaths = ["/api/auth/status", "/api/auth/logout", "/public_images/foo.png", "/css/base.css", "/pages/public/login.html"];
        for (const p of publicPaths) {
            const req = mockReq({ path: p });
            const res = mockRes();
            let nextCalled = false;
            await authMiddleware(req, res, () => {
                nextCalled = true;
            });
            assert.ok(nextCalled, `next() should be called for public path: ${p}`);
        }
    });

    it("skips auth for exact public paths (non_auth_paths_full)", async () => {
        const exactPaths = ["/", "/not_found.html", "/not_logged_in.html", "/api/users/register_new_user"];
        for (const p of exactPaths) {
            const req = mockReq({ path: p });
            const res = mockRes();
            let nextCalled = false;
            await authMiddleware(req, res, () => {
                nextCalled = true;
            });
            assert.ok(nextCalled, `next() should be called for exact public path: ${p}`);
        }
    });

    it("rejects requests without Authorization header", async () => {
        const req = mockReq({ headers: {} });
        const res = mockRes();
        let nextCalled = false;
        await authMiddleware(req, res, () => {
            nextCalled = true;
        });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.error, "Missing Authorization header");
    });

    it("rejects requests with invalid Authorization scheme", async () => {
        const req = mockReq({ headers: { Authorization: "Basic abc123", "X-User-Id": "1" } });
        const res = mockRes();
        let nextCalled = false;
        await authMiddleware(req, res, () => {
            nextCalled = true;
        });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.error, "Invalid Authorization header");
    });

    it("rejects requests without X-User-Id header", async () => {
        const req = mockReq({ headers: { Authorization: "Bearer sometoken" } });
        const res = mockRes();
        let nextCalled = false;
        await authMiddleware(req, res, () => {
            nextCalled = true;
        });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
        assert.strictEqual(res.body.error, "Missing X-User-Id header");
    });

    it("rejects requests with invalid/expired token", async () => {
        const req = mockReq({
            headers: { Authorization: "Bearer invalid_token_xyz", "X-User-Id": String(testUser.id) },
        });
        const res = mockRes();
        let nextCalled = false;
        await authMiddleware(req, res, () => {
            nextCalled = true;
        });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 401);
    });

    it("passes authenticated requests through and sets req.user.loggedIn", async () => {
        const req = mockReq({ headers: testAuth.headers });
        const res = mockRes();
        let nextCalled = false;
        await authMiddleware(req, res, () => {
            nextCalled = true;
        });
        assert.ok(nextCalled, "next() should be called for authenticated request");
        assert.strictEqual(req.user.loggedIn, true);
    });

    it("blocks non-whitelisted paths for temp_password users", async () => {
        const tempUser = await createTestUser({ temp_password: true, email: "temp@helm.local" });
        const tempAuth = await loginTestUser(tempUser.id);
        const req = mockReq({ path: "/api/dashboard/summary", headers: tempAuth.headers });
        const res = mockRes();
        let nextCalled = false;
        await authMiddleware(req, res, () => {
            nextCalled = true;
        });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.body.error, "TEMP_PASSWORD_CHANGE_REQUIRED");
    });

    it("allows whitelisted paths for temp_password users", async () => {
        const tempUser = await createTestUser({ temp_password: true, email: "temp2@helm.local" });
        const tempAuth = await loginTestUser(tempUser.id);
        const allowedPaths = ["/api/users/change-temp-password", "/api/auth/logout", "/api/auth/status", "/pages/force_password_change.html", "/js/pages/force_password_change.js", "/api/users/security-questions-list"];
        for (const p of allowedPaths) {
            const req = mockReq({ path: p, headers: tempAuth.headers });
            const res = mockRes();
            let nextCalled = false;
            await authMiddleware(req, res, () => {
                nextCalled = true;
            });
            assert.ok(nextCalled, `next() should be called for temp-password allowed path: ${p}`);
        }
    });
});
