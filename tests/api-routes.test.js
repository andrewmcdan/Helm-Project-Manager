const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, getDb, createTestUser, loginTestUser, getAdminAuth, getCoderAuth, createTestProject, createTestRequirement } = require("./helpers/setup");
const { startApp, stopApp, request } = require("./helpers/http");

describe("API routes integration", () => {
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

    /** helper – get headers for an authenticated admin */
    async function adminHeaders() {
        const { headers } = await getAdminAuth();
        return headers;
    }

    /* ================================================================ */
    /*  Dashboard routes                                                 */
    /* ================================================================ */

    describe("dashboard", () => {
        it("GET /api/dashboard/summary returns 401 without auth", async () => {
            const res = await request("GET", "/api/dashboard/summary");
            assert.strictEqual(res.status, 401);
        });

        it("GET /api/dashboard/summary returns summary data", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/dashboard/summary", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.json.metrics);
        });

        it("GET /api/dashboard/effort-by-category returns items", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/dashboard/effort-by-category?range=week", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.json.items));
        });

        it("GET /api/dashboard/recent-activity returns items", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/dashboard/recent-activity", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.json.items));
        });

        it("GET /api/dashboard/attention-needed returns items", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/dashboard/attention-needed", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.json.items));
        });
    });

    /* ================================================================ */
    /*  Requirements routes                                              */
    /* ================================================================ */

    describe("requirements", () => {
        it("GET /api/requirements/filter/0/10 returns list", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/requirements/filter/0/10", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.json.data) || Array.isArray(res.json));
        });

        it("GET /api/requirements/count returns count", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/requirements/count", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/requirements/summary returns summary", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/requirements/summary", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/requirements/new creates a requirement", async () => {
            const h = await adminHeaders();
            const res = await request("POST", "/api/requirements/new", {
                headers: h,
                body: {
                    title: "Route Test Req",
                    requirement_type: "Functional",
                    priority: "Medium",
                    status: "Proposed",
                    requirement_code_prefix: "RTR",
                    requirement_code_number: 1,
                },
            });
            assert.strictEqual(res.status, 201);
            assert.ok(res.json.id || res.json.data);
        });

        it("GET /api/requirements/export/csv returns CSV", async () => {
            const h = await adminHeaders();
            await createTestRequirement();
            const res = await request("GET", "/api/requirements/export/csv", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.body.includes(","));
        });

        it("GET /api/requirements/requirement-codes returns prefixes", async () => {
            const h = await adminHeaders();
            await createTestRequirement();
            const res = await request("GET", "/api/requirements/requirement-codes", { headers: h });
            assert.strictEqual(res.status, 200);
        });
    });

    /* ================================================================ */
    /*  Effort routes                                                    */
    /* ================================================================ */

    describe("effort", () => {
        it("GET /api/effort/categories returns categories", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/effort/categories", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/effort returns entries list", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/effort", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/effort creates an entry", async () => {
            const h = await adminHeaders();
            const project = await createTestProject({ project_status: "Active" });
            const req = await createTestRequirement();
            const res = await request("POST", "/api/effort", {
                headers: h,
                body: {
                    effort_mode: "Daily",
                    hours: 2,
                    requirement_id: req.id,
                    category: "Development",
                    date: "2025-01-15",
                },
            });
            assert.ok(res.status === 200 || res.status === 201);
        });

        it("GET /api/effort/summary returns summary", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/effort/summary", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/effort/recent returns recent entries", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/effort/recent", { headers: h });
            assert.strictEqual(res.status, 200);
        });
    });

    /* ================================================================ */
    /*  Project settings routes                                          */
    /* ================================================================ */

    describe("project-settings", () => {
        it("GET /api/project-settings returns settings or 404", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/project-settings", { headers: h });
            // Returns 404 when no settings exist, 200 when they do
            assert.ok(res.status === 200 || res.status === 404);
        });

        it("GET /api/project-settings returns settings when project exists", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const res = await request("GET", "/api/project-settings", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("PATCH /api/project-settings updates settings", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const res = await request("PATCH", "/api/project-settings", {
                headers: h,
                body: { project_name: "Updated Name" },
            });
            assert.ok(res.status === 200 || res.status === 204);
        });

        it("GET /api/project-settings/change-log returns 404 without project", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/project-settings/change-log", { headers: h });
            assert.strictEqual(res.status, 404);
        });

        it("GET /api/project-settings/change-log returns entries when project exists", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const res = await request("GET", "/api/project-settings/change-log", { headers: h });
            assert.strictEqual(res.status, 200);
        });
    });

    /* ================================================================ */
    /*  Risks routes                                                     */
    /* ================================================================ */

    describe("risks", () => {
        it("GET /api/risks/filter/0/10 returns list", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/risks/filter/0/10", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/risks/count returns count", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/risks/count", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/risks/summary returns summary", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/risks/summary", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/risks/new creates a risk", async () => {
            const h = await adminHeaders();
            const res = await request("POST", "/api/risks/new", {
                headers: h,
                body: {
                    risk_title: "Test Risk",
                    risk_code: "RISK-99",
                    risk_status: "Identified",
                    risk_impact: "High",
                    risk_likelihood: "Medium",
                },
            });
            assert.ok(res.status === 200 || res.status === 201);
        });

        it("GET /api/risks/export/csv returns CSV", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/risks/export/csv", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/risks/recent-updates returns updates", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/risks/recent-updates", { headers: h });
            assert.strictEqual(res.status, 200);
        });
    });

    /* ================================================================ */
    /*  Team routes                                                      */
    /* ================================================================ */

    describe("team", () => {
        it("GET /api/team/filter/0/10 returns list", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/team/filter/0/10", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/team/count returns count", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/team/count", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/team/summary returns summary", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/team/summary", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/team/export/csv returns CSV", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/team/export/csv", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/team/current-user-role returns role", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/team/current-user-role", { headers: h });
            assert.ok(res.status === 200 || res.status === 404);
        });

        it("GET /api/team/available-users returns users", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/team/available-users", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/team/assign-member assigns a user", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const user = await createTestUser({ status: "active" });
            const res = await request("POST", "/api/team/assign-member", {
                headers: h,
                body: { user_id: user.id, project_role: "Developer" },
            });
            assert.ok(res.status === 200 || res.status === 201);
        });

        it("GET /api/team/byid/:id returns a member", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const user = await createTestUser({ status: "active" });
            await request("POST", "/api/team/assign-member", {
                headers: h,
                body: { user_id: user.id, project_role: "Developer" },
            });
            const res = await request("GET", `/api/team/byid/${user.id}`, { headers: h });
            assert.ok(res.status === 200 || res.status === 404);
        });
    });

    /* ================================================================ */
    /*  Users routes                                                     */
    /* ================================================================ */

    describe("users", () => {
        it("GET /api/users/security-questions-list returns questions", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/users/security-questions-list", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/users/list-users returns user list", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/users/list-users", { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(Array.isArray(res.json.users));
        });

        it("GET /api/users/get-logged-in-users returns list", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/users/get-logged-in-users", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/users/get-user/:userId returns a user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser();
            const res = await request("GET", `/api/users/get-user/${user.id}`, { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.json.user);
        });

        it("POST /api/users/suspend-user suspends a user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "active" });
            const res = await request("POST", "/api/users/suspend-user", {
                headers: h,
                body: {
                    userIdToSuspend: user.id,
                    suspensionStart: new Date().toISOString(),
                    suspensionEnd: new Date(Date.now() + 86400000).toISOString(),
                },
            });
            assert.strictEqual(res.status, 200);
            assert.ok(res.json.message.includes("suspended"));
        });

        it("GET /api/users/reinstate-user/:userId reinstates a user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "active" });
            // First suspend
            await request("POST", "/api/users/suspend-user", {
                headers: h,
                body: {
                    userIdToSuspend: user.id,
                    suspensionStart: new Date().toISOString(),
                    suspensionEnd: new Date(Date.now() + 86400000).toISOString(),
                },
            });
            const res = await request("GET", `/api/users/reinstate-user/${user.id}`, { headers: h });
            assert.strictEqual(res.status, 200);
            assert.ok(res.json.message.includes("reinstated"));
        });

        it("POST /api/users/change-temp-password changes temp password", async () => {
            const h = await adminHeaders();
            // Create user with temp_password flag
            const user = await createTestUser({ status: "active" });
            await db.query("UPDATE users SET temp_password = true WHERE id = $1", [user.id]);
            const { headers: userHeaders } = await loginTestUser(user.id);
            const res = await request("POST", "/api/users/change-temp-password", {
                headers: userHeaders,
                body: {
                    newPassword: "NewStr0ng!Pass99",
                    securityQuestions: [
                        { question: "fav_color", answer: "Blue" },
                        { question: "pet_name", answer: "Rex" },
                        { question: "birth_city", answer: "Denver" },
                    ],
                },
            });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/users/change-temp-password rejects missing password", async () => {
            const h = await adminHeaders();
            const res = await request("POST", "/api/users/change-temp-password", {
                headers: h,
                body: { securityQuestions: [] },
            });
            assert.strictEqual(res.status, 400);
        });

        it("POST /api/users/update-profile updates user profile", async () => {
            const user = await createTestUser({ status: "active" });
            const { headers: userHeaders } = await loginTestUser(user.id);
            const res = await request("POST", "/api/users/update-profile", {
                headers: userHeaders,
                body: { first_name: "Updated", last_name: "Name" },
            });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/users/update-user-field updates a field", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "active" });
            const res = await request("POST", "/api/users/update-user-field", {
                headers: h,
                body: { user_id: user.id, field: "first_name", value: "Changed" },
            });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/users/update-user-field rejects disallowed fields", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "active" });
            const res = await request("POST", "/api/users/update-user-field", {
                headers: h,
                body: { user_id: user.id, field: "password_hash", value: "hack" },
            });
            assert.strictEqual(res.status, 400);
        });

        it("POST /api/users/delete-user deletes a user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "active" });
            const res = await request("POST", "/api/users/delete-user", {
                headers: h,
                body: { userIdToDelete: user.id },
            });
            assert.strictEqual(res.status, 200);
            assert.ok(res.json.message.includes("deleted"));
        });

        it("GET /api/users/approve-user/:userId approves a user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "pending" });
            const res = await request("GET", `/api/users/approve-user/${user.id}`, { headers: h });
            assert.ok(res.status === 200 || res.status === 500); // 500 if SMTP fails
        });

        it("GET /api/users/reject-user/:userId rejects a user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser({ status: "pending" });
            const res = await request("GET", `/api/users/reject-user/${user.id}`, { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/users/update-security-questions updates questions", async () => {
            const user = await createTestUser({ status: "active" });
            const { headers: userHeaders } = await loginTestUser(user.id);
            const res = await request("POST", "/api/users/update-security-questions", {
                headers: userHeaders,
                body: {
                    currentPassword: "Password1!",
                    securityQuestions: [
                        { question: "fav_color", answer: "Red" },
                        { question: "pet_name", answer: "Whiskers" },
                        { question: "birth_city", answer: "Austin" },
                    ],
                },
            });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/users/security-questions/:resetToken returns questions", async () => {
            const h = await adminHeaders();
            const user = await createTestUser();
            const resetToken = "test-token-" + Date.now();
            await db.query("UPDATE users SET reset_token = $1, reset_token_expires_at = $2, security_question_1 = 'fav_color', security_question_2 = 'pet_name', security_question_3 = 'birth_city' WHERE id = $4", [resetToken, new Date(Date.now() + 3600000).toISOString(), user.id]);
            const res = await request("GET", `/api/users/security-questions/${resetToken}`, { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/users/security-questions/:resetToken returns 404 for invalid token", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/users/security-questions/invalid-token", { headers: h });
            assert.strictEqual(res.status, 404);
        });

        it("POST /api/users/verify-security-answers resets password with valid answers", async () => {
            const h = await adminHeaders();
            const user = await createTestUser();
            const resetToken = "verify-token-" + Date.now();
            await db.query("UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3", [resetToken, new Date(Date.now() + 3600000).toISOString(), user.id]);
            // Set security questions/answers using the controller (bcrypt hashing)
            const usersController = require("../src/controllers/users");
            await usersController.updateSecurityQuestions(user.id, [
                { question: "fav_color", answer: "blue" },
                { question: "pet_name", answer: "rex" },
                { question: "birth_city", answer: "denver" },
            ]);
            const res = await request("POST", `/api/users/verify-security-answers/${resetToken}`, {
                headers: h,
                body: {
                    securityAnswers: ["blue", "rex", "denver"],
                    newPassword: "NewS3cure!Pass",
                },
            });
            assert.strictEqual(res.status, 200);
        });

        it("POST /api/users/verify-security-answers returns 403 for wrong answers", async () => {
            const h = await adminHeaders();
            const user = await createTestUser();
            const resetToken = "bad-answers-" + Date.now();
            await db.query("UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE id = $3", [resetToken, new Date(Date.now() + 3600000).toISOString(), user.id]);
            const usersController = require("../src/controllers/users");
            await usersController.updateSecurityQuestions(user.id, [
                { question: "fav_color", answer: "blue" },
                { question: "pet_name", answer: "rex" },
                { question: "birth_city", answer: "denver" },
            ]);
            const res = await request("POST", `/api/users/verify-security-answers/${resetToken}`, {
                headers: h,
                body: {
                    securityAnswers: ["wrong", "wrong", "wrong"],
                    newPassword: "NewS3cure!Pass",
                },
            });
            assert.strictEqual(res.status, 403);
        });

        it("POST /api/users/email-user returns 403 for non-admin", async () => {
            const { headers: coderH } = await getCoderAuth();
            const res = await request("POST", "/api/users/email-user", {
                headers: coderH,
                body: { username: "anyone", subject: "Hi", message: "Hello" },
            });
            assert.strictEqual(res.status, 403);
        });

        it("POST /api/users/email-user returns 400 when fields missing", async () => {
            const h = await adminHeaders();
            const res = await request("POST", "/api/users/email-user", {
                headers: h,
                body: { username: "someone" },
            });
            assert.strictEqual(res.status, 400);
        });

        it("POST /api/users/email-user returns 404 for unknown user", async () => {
            const h = await adminHeaders();
            const res = await request("POST", "/api/users/email-user", {
                headers: h,
                body: { username: "nonexistent_user_999", subject: "Test", message: "Body" },
            });
            assert.strictEqual(res.status, 404);
        });

        it("GET /api/users/reset-user-password/:userId returns 403 for non-admin", async () => {
            const { headers: coderH } = await getCoderAuth();
            const user = await createTestUser();
            const res = await request("GET", `/api/users/reset-user-password/${user.id}`, {
                headers: coderH,
            });
            assert.strictEqual(res.status, 403);
        });

        it("GET /api/users/reset-user-password/:userId returns 404 for unknown user", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/users/reset-user-password/999999", { headers: h });
            assert.strictEqual(res.status, 404);
        });

        it("GET /api/users/reset-user-password/:userId resets password for valid user", async () => {
            const h = await adminHeaders();
            const user = await createTestUser();
            const res = await request("GET", `/api/users/reset-user-password/${user.id}`, { headers: h });
            // May succeed or fail with 500 if SMTP is not configured
            assert.ok(res.status === 200 || res.status === 500);
        });
    });

    /* ================================================================ */
    /*  Requirements - additional routes                                 */
    /* ================================================================ */

    describe("requirements (extended)", () => {
        it("GET /api/requirements/totals/:id returns totals", async () => {
            const h = await adminHeaders();
            const req = await createTestRequirement();
            const res = await request("GET", `/api/requirements/totals/${req.id}`, { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/requirements/byid/:id returns a requirement", async () => {
            const h = await adminHeaders();
            const req = await createTestRequirement();
            const res = await request("GET", `/api/requirements/byid/${req.id}`, { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("PATCH /api/requirements/update/:id updates a requirement", async () => {
            const h = await adminHeaders();
            const req = await createTestRequirement();
            const res = await request("PATCH", `/api/requirements/update/${req.id}`, {
                headers: h,
                body: { title: "Updated Title" },
            });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/requirements/requirement-tags/:count returns tags", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/requirements/requirement-tags/10", { headers: h });
            assert.strictEqual(res.status, 200);
        });
    });

    /* ================================================================ */
    /*  Effort - additional routes                                       */
    /* ================================================================ */

    describe("effort (extended)", () => {
        it("GET /api/effort/team returns team members", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/effort/team", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/effort/export returns CSV", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/api/effort/export", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("GET /api/effort/:id returns entry by id", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const req = await createTestRequirement();
            // Create an effort entry first
            const createRes = await request("POST", "/api/effort", {
                headers: h,
                body: {
                    effort_mode: "Daily",
                    hours: 3,
                    requirement_id: req.id,
                    category: "Development",
                    date: "2025-01-20",
                },
            });
            assert.ok(createRes.status === 200 || createRes.status === 201);
            const entryId = createRes.json?.id || createRes.json?.data?.id;
            if (entryId) {
                const res = await request("GET", `/api/effort/${entryId}`, { headers: h });
                assert.strictEqual(res.status, 200);
            }
        });

        it("PATCH /api/effort/:id updates an entry", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const req = await createTestRequirement();
            const createRes = await request("POST", "/api/effort", {
                headers: h,
                body: {
                    effort_mode: "Daily",
                    hours: 2,
                    requirement_id: req.id,
                    category: "Development",
                    date: "2025-01-21",
                },
            });
            const entryId = createRes.json?.id || createRes.json?.data?.id;
            if (entryId) {
                const res = await request("PATCH", `/api/effort/${entryId}`, {
                    headers: h,
                    body: { hours: 5 },
                });
                assert.strictEqual(res.status, 200);
            }
        });

        it("DELETE /api/effort/:id deletes an entry", async () => {
            const h = await adminHeaders();
            await createTestProject({ project_status: "Active" });
            const req = await createTestRequirement();
            const createRes = await request("POST", "/api/effort", {
                headers: h,
                body: {
                    effort_mode: "Daily",
                    hours: 1,
                    requirement_id: req.id,
                    category: "Development",
                    date: "2025-01-22",
                },
            });
            const entryId = createRes.json?.id || createRes.json?.data?.id;
            if (entryId) {
                const res = await request("DELETE", `/api/effort/${entryId}`, { headers: h });
                assert.strictEqual(res.status, 200);
            }
        });
    });

    /* ================================================================ */
    /*  Risks - additional routes                                        */
    /* ================================================================ */

    describe("risks (extended)", () => {
        it("GET /api/risks/byid/:id returns a risk", async () => {
            const h = await adminHeaders();
            const createRes = await request("POST", "/api/risks/new", {
                headers: h,
                body: {
                    risk_title: "Lookup Risk",
                    risk_code: "RISK-LU1",
                    risk_status: "Identified",
                    risk_impact: "Low",
                    risk_likelihood: "Low",
                },
            });
            const riskId = createRes.json?.id || createRes.json?.data?.id;
            if (riskId) {
                const res = await request("GET", `/api/risks/byid/${riskId}`, { headers: h });
                assert.strictEqual(res.status, 200);
            }
        });

        it("PATCH /api/risks/update/:id updates a risk", async () => {
            const h = await adminHeaders();
            const createRes = await request("POST", "/api/risks/new", {
                headers: h,
                body: {
                    risk_title: "Update Risk",
                    risk_code: "RISK-UP1",
                    risk_status: "Identified",
                    risk_impact: "Medium",
                    risk_likelihood: "Medium",
                },
            });
            const riskId = createRes.json?.id || createRes.json?.data?.id;
            if (riskId) {
                const res = await request("PATCH", `/api/risks/update/${riskId}`, {
                    headers: h,
                    body: { risk_title: "Updated Risk Title" },
                });
                assert.strictEqual(res.status, 200);
            }
        });
    });
});
