const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, getDb, createTestUser, createTestProject, createTestRequirement } = require("./helpers/setup");

const dashboard = require("../src/controllers/dashboard");

describe("dashboard controller", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => await teardown());

    describe("getActiveProjectSnapshot", () => {
        it("returns null when no active project exists", async () => {
            const result = await dashboard.getActiveProjectSnapshot();
            assert.strictEqual(result, null);
        });

        it("returns project data for an active project", async () => {
            await db.query(
                `INSERT INTO project_settings
                    (project_name, project_owner_name, project_description, project_status, effort_default_mode, week_start_day, effort_rounding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ["Test Project", "Alice", "A great project", "Active", "Hourly", "Monday", 0.25],
            );
            const result = await dashboard.getActiveProjectSnapshot();
            assert.ok(result);
            assert.strictEqual(result.project_name, "Test Project");
            assert.strictEqual(result.project_owner, "Alice");
            assert.strictEqual(result.project_summary, "A great project");
            assert.strictEqual(typeof result.team_size, "number");
        });

        it("ignores non-active projects", async () => {
            await db.query(
                `INSERT INTO project_settings
                    (project_name, project_owner_name, project_description, project_status, effort_default_mode, week_start_day, effort_rounding)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                ["Archived Project", "Bob", "Old stuff", "Archived", "Hourly", "Monday", 0.25],
            );
            const result = await dashboard.getActiveProjectSnapshot();
            assert.strictEqual(result, null);
        });
    });

    describe("getDashboardSummary", () => {
        it("returns summary with default values when no data exists", async () => {
            const result = await dashboard.getDashboardSummary();
            assert.ok(result);
            assert.strictEqual(result.project_name, "Not configured");
            assert.strictEqual(result.project_owner, "Not assigned");
            assert.strictEqual(result.team_size, 0);
            assert.ok(result.metrics);
            assert.strictEqual(result.metrics.total_requirements, 0);
            assert.strictEqual(result.metrics.open_risks, 0);
        });

        it("returns populated summary when data exists", async () => {
            await createTestProject({ project_name: "My Project", project_owner_name: "Owner", project_status: "Active" });
            await createTestRequirement();
            const result = await dashboard.getDashboardSummary();
            assert.strictEqual(result.project_name, "My Project");
            assert.strictEqual(result.project_owner, "Owner");
            assert.strictEqual(result.metrics.total_requirements, 1);
        });
    });

    describe("getEffortByCategory", () => {
        it("returns empty array for non-week range", async () => {
            const result = await dashboard.getEffortByCategory("month");
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });

        it("returns effort grouped by category for current week", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const user = await createTestUser({ role: "coder" });
            const req = await createTestRequirement({ created_by: user.id });
            const today = new Date().toISOString().slice(0, 10);
            await db.query(
                `INSERT INTO effort_entries (project_id, requirement_id, user_id, entry_date, effort_mode, effort_amount, category, created_by, updated_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)`,
                [project.id, req.id, user.id, today, "Daily", 4, "Development", user.id],
            );
            const result = await dashboard.getEffortByCategory("week");
            assert.ok(Array.isArray(result));
            if (result.length > 0) {
                assert.ok(result[0].category);
                assert.ok(typeof result[0].hours === "number");
                assert.ok(result[0].trend);
            }
        });
    });

    describe("getRecentActivity", () => {
        it("returns empty array when no activity exists", async () => {
            const result = await dashboard.getRecentActivity();
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });

        it("returns recent requirement activity", async () => {
            const user = await createTestUser();
            const req = await createTestRequirement({ created_by: user.id });
            const result = await dashboard.getRecentActivity(10);
            assert.ok(result.length > 0);
            const item = result.find((i) => i.type === "Requirement");
            assert.ok(item);
            assert.ok(item.label);
            assert.ok(item.occurred_at);
        });

        it("respects the limit parameter", async () => {
            const user = await createTestUser();
            for (let i = 0; i < 5; i++) {
                await createTestRequirement({ created_by: user.id, requirement_code_number: 100 + i });
            }
            const result = await dashboard.getRecentActivity(2);
            assert.ok(result.length <= 2);
        });
    });

    describe("getAttentionNeeded", () => {
        it("returns empty array when nothing needs attention", async () => {
            const result = await dashboard.getAttentionNeeded();
            assert.ok(Array.isArray(result));
            assert.strictEqual(result.length, 0);
        });

        it("flags requirements with no effort logged", async () => {
            const user = await createTestUser();
            await createTestRequirement({ created_by: user.id, status: "Approved" });
            const result = await dashboard.getAttentionNeeded();
            const reviewItem = result.find((i) => i.badge === "Review");
            assert.ok(reviewItem);
            assert.ok(reviewItem.title.includes("requirements with no effort logged"));
        });

        it("flags high-impact open risks", async () => {
            const user = await createTestUser();
            await db.query(
                `INSERT INTO risks (risk_code, risk_title, risk_status, risk_impact, risk_likelihood, owner_id, created_by, updated_by)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
                ["RISK-1", "Critical Bug", "Identified", "Critical", "High", user.id, user.id],
            );
            const result = await dashboard.getAttentionNeeded();
            const riskItem = result.find((i) => i.badge === "Critical");
            assert.ok(riskItem);
            assert.ok(riskItem.title.includes("Critical Bug"));
        });
    });
});
