const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, createTestUser, loginTestUser, getDb } = require("./helpers/setup");

const risks = require("../src/controllers/risks");

describe("risks controller", () => {
    let db, user, auth;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => {
        await cleanAllTables();
        user = await createTestUser({ role: "administrator" });
        auth = await loginTestUser(user.id);
    });

    after(async () => await teardown());

    const validRisk = {
        risk_code: "RSK-1",
        risk_title: "Server might crash",
        risk_description: "The server could crash under load",
        risk_likelihood: "Medium",
        risk_impact: "High",
        risk_status: "Identified",
        mitigation_plan: "Add load balancer",
    };

    /* ------------------------------------------------------------------ */
    /*  createRisk                                                         */
    /* ------------------------------------------------------------------ */

    describe("createRisk", () => {
        it("creates a risk with valid data", async () => {
            const result = await risks.createRisk(user.id, validRisk);
            assert.ok(result);
            assert.ok(result.id);
            assert.strictEqual(result.risk_title, "Server might crash");
            assert.strictEqual(result.risk_likelihood, "Medium");
            assert.strictEqual(result.risk_code, "RSK-1");
        });

        it("normalizes likelihood/impact/status casing", async () => {
            const result = await risks.createRisk(user.id, {
                ...validRisk,
                risk_code: "RSK-2",
                risk_likelihood: "low",
                risk_impact: "critical",
                risk_status: "analyzed",
            });
            assert.strictEqual(result.risk_likelihood, "Low");
            assert.strictEqual(result.risk_impact, "Critical");
            assert.strictEqual(result.risk_status, "Analyzed");
        });

        it("uppercases risk code", async () => {
            const result = await risks.createRisk(user.id, { ...validRisk, risk_code: "abc-5" });
            assert.strictEqual(result.risk_code, "ABC-5");
        });

        it("rejects missing title", async () => {
            await assert.rejects(
                () => risks.createRisk(user.id, { ...validRisk, risk_title: "" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid likelihood", async () => {
            await assert.rejects(
                () => risks.createRisk(user.id, { ...validRisk, risk_likelihood: "Extreme" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid impact", async () => {
            await assert.rejects(
                () => risks.createRisk(user.id, { ...validRisk, risk_impact: "Extreme" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid status", async () => {
            await assert.rejects(
                () => risks.createRisk(user.id, { ...validRisk, risk_status: "Unknown" }),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getRiskById                                                        */
    /* ------------------------------------------------------------------ */

    describe("getRiskById", () => {
        it("returns the risk for a valid ID", async () => {
            const created = await risks.createRisk(user.id, validRisk);
            const found = await risks.getRiskById(created.id);
            assert.ok(found);
            assert.strictEqual(found.id, created.id);
            assert.strictEqual(found.risk_title, "Server might crash");
        });

        it("returns null for non-existent risk", async () => {
            const found = await risks.getRiskById(999999);
            assert.strictEqual(found, null);
        });

        it("rejects non-numeric ID", async () => {
            await assert.rejects(
                () => risks.getRiskById("abc"),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  listRisks + countRisks                                             */
    /* ------------------------------------------------------------------ */

    describe("listRisks & countRisks", () => {
        it("lists risks with pagination", async () => {
            for (let i = 1; i <= 5; i++) {
                await risks.createRisk(user.id, { ...validRisk, risk_code: `PG-${i}`, risk_title: `Risk ${i}` });
            }
            const page = await risks.listRisks(user.id, auth.token, 0, 3);
            assert.strictEqual(page.length, 3);

            const total = await risks.countRisks(user.id, auth.token);
            assert.strictEqual(total, 5);
        });

        it("filters by status", async () => {
            await risks.createRisk(user.id, { ...validRisk, risk_code: "FS-1", risk_status: "Identified" });
            await risks.createRisk(user.id, { ...validRisk, risk_code: "FS-2", risk_status: "Mitigated" });
            const filtered = await risks.listRisks(user.id, auth.token, 0, 10, { status: "Mitigated" });
            assert.ok(filtered.every((r) => r.risk_status === "Mitigated"));
        });

        it("filters by search term", async () => {
            await risks.createRisk(user.id, { ...validRisk, risk_code: "SS-1", risk_title: "Database corruption" });
            await risks.createRisk(user.id, { ...validRisk, risk_code: "SS-2", risk_title: "Network outage" });
            const results = await risks.listRisks(user.id, auth.token, 0, 10, { search: "Database" });
            assert.ok(results.length >= 1);
            assert.ok(results.some((r) => r.risk_title === "Database corruption"));
        });

        it("sorts by title ASC", async () => {
            await risks.createRisk(user.id, { ...validRisk, risk_code: "SO-1", risk_title: "Bravo" });
            await risks.createRisk(user.id, { ...validRisk, risk_code: "SO-2", risk_title: "Alpha" });
            const sorted = await risks.listRisks(user.id, auth.token, 0, 10, { sortField: "title", sortOrder: "asc" });
            assert.ok(sorted[0].risk_title <= sorted[1].risk_title);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateRisk                                                         */
    /* ------------------------------------------------------------------ */

    describe("updateRisk", () => {
        it("updates title and status", async () => {
            const created = await risks.createRisk(user.id, validRisk);
            const updated = await risks.updateRisk(user.id, created.id, {
                risk_title: "Updated risk",
                risk_status: "Closed",
            });
            assert.ok(updated);
            assert.strictEqual(updated.risk_title, "Updated risk");
            assert.strictEqual(updated.risk_status, "Closed");
        });

        it("archives a risk via status='archived'", async () => {
            const created = await risks.createRisk(user.id, validRisk);
            const archived = await risks.updateRisk(user.id, created.id, { risk_status: "archived" });
            assert.ok(archived);
            assert.strictEqual(archived.archived, true);
        });

        it("archives a risk via archived=true", async () => {
            const created = await risks.createRisk(user.id, { ...validRisk, risk_code: "ARC-1" });
            const archived = await risks.updateRisk(user.id, created.id, { archived: true });
            assert.ok(archived);
            assert.strictEqual(archived.archived, true);
        });

        it("returns null for non-existent risk", async () => {
            const result = await risks.updateRisk(user.id, 999999, { risk_title: "Ghost" });
            assert.strictEqual(result, null);
        });

        it("rejects invalid likelihood on update", async () => {
            const created = await risks.createRisk(user.id, validRisk);
            await assert.rejects(
                () => risks.updateRisk(user.id, created.id, { risk_likelihood: "Extreme" }),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getRisksSummary                                                     */
    /* ------------------------------------------------------------------ */

    describe("getRisksSummary", () => {
        it("returns summary with counts by status, likelihood, impact", async () => {
            await risks.createRisk(user.id, validRisk);
            const summary = await risks.getRisksSummary();
            assert.ok(typeof summary.total_risks === "number");
            assert.ok(summary.total_risks >= 1);
            assert.ok(typeof summary.risks_by_status === "object");
            assert.ok(typeof summary.risks_by_likelihood === "object");
            assert.ok(typeof summary.risks_by_impact === "object");
        });
    });

    /* ------------------------------------------------------------------ */
    /*  Risk updates                                                       */
    /* ------------------------------------------------------------------ */

    describe("risk updates", () => {
        it("createRiskUpdate and getRiskUpdates round-trip", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            const upd = await risks.createRiskUpdate(user.id, risk.id, {
                update_type: "General Update",
                note: "Checked status",
                status: "Identified",
            });
            assert.ok(upd);
            assert.ok(upd.id);

            const updates = await risks.getRiskUpdates(risk.id);
            assert.ok(Array.isArray(updates));
            assert.ok(updates.length >= 1);
            assert.ok(updates.some((u) => u.note === "Checked status"));
        });

        it("createRiskUpdate rejects invalid update type", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            await assert.rejects(
                () => risks.createRiskUpdate(user.id, risk.id, { update_type: "BadType" }),
                (err) => err.statusCode === 400,
            );
        });

        it("createRiskUpdate returns null for non-existent risk", async () => {
            const result = await risks.createRiskUpdate(user.id, 999999, { update_type: "General Update" });
            assert.strictEqual(result, null);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getRecentUpdates                                                   */
    /* ------------------------------------------------------------------ */

    describe("getRecentUpdates", () => {
        it("returns recent updates across risks", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            await risks.createRiskUpdate(user.id, risk.id, { update_type: "General Update", note: "Update 1" });
            const recent = await risks.getRecentUpdates(5);
            assert.ok(Array.isArray(recent));
            assert.ok(recent.length >= 1);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getTeamMembers                                                     */
    /* ------------------------------------------------------------------ */

    describe("getTeamMembers", () => {
        it("returns active team members (role != 'none')", async () => {
            await createTestUser({ role: "coder", status: "active" });
            const members = await risks.getTeamMembers();
            assert.ok(Array.isArray(members));
            assert.ok(members.length >= 1);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  exportRisksToCSV                                                   */
    /* ------------------------------------------------------------------ */

    describe("exportRisksToCSV", () => {
        it("returns CSV string including header and risk data", async () => {
            await risks.createRisk(user.id, validRisk);
            const csv = await risks.exportRisksToCSV();
            assert.ok(typeof csv === "string");
            assert.ok(csv.includes("Risk Code"));
            assert.ok(csv.includes("Server might crash"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateRisk – additional field branches                             */
    /* ------------------------------------------------------------------ */

    describe("updateRisk (fields)", () => {
        it("updates risk_code", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            const updated = await risks.updateRisk(user.id, risk.id, { risk_code: "NEWCODE" });
            assert.strictEqual(updated.risk_code, "NEWCODE");
        });

        it("rejects empty risk_code", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            await assert.rejects(() => risks.updateRisk(user.id, risk.id, { risk_code: "" }), /Risk code cannot be empty/);
        });

        it("updates risk_description", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            const updated = await risks.updateRisk(user.id, risk.id, { risk_description: "Updated desc" });
            assert.strictEqual(updated.risk_description, "Updated desc");
        });

        it("sets risk_description to null", async () => {
            const risk = await risks.createRisk(user.id, { ...validRisk, risk_description: "Some desc" });
            const updated = await risks.updateRisk(user.id, risk.id, { risk_description: null });
            assert.strictEqual(updated.risk_description, null);
        });

        it("updates owner_id", async () => {
            const other = await createTestUser({ email: "owner@test.com", role: "coder" });
            const risk = await risks.createRisk(user.id, validRisk);
            const updated = await risks.updateRisk(user.id, risk.id, { owner_id: other.id });
            assert.strictEqual(updated.owner_id, other.id);
        });

        it("sets owner_id to null", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            const updated = await risks.updateRisk(user.id, risk.id, { owner_id: null });
            assert.strictEqual(updated.owner_id, null);
        });

        it("updates mitigation_plan", async () => {
            const risk = await risks.createRisk(user.id, validRisk);
            const updated = await risks.updateRisk(user.id, risk.id, { mitigation_plan: "Add redundancy" });
            assert.strictEqual(updated.mitigation_plan, "Add redundancy");
        });
    });
});
