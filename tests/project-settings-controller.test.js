const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, createTestUser, createTestProject, getDb } = require("./helpers/setup");

const settings = require("../src/controllers/project_settings");

describe("project_settings controller", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => await teardown());

    /* ------------------------------------------------------------------ */
    /*  getSettings                                                        */
    /* ------------------------------------------------------------------ */

    describe("getSettings", () => {
        it("returns null when no project exists", async () => {
            const result = await settings.getSettings();
            assert.strictEqual(result, null);
        });

        it("returns settings for an active project", async () => {
            const user = await createTestUser();
            await createTestProject({ project_name: "My Project", project_status: "Active", updated_by: user.id });
            const result = await settings.getSettings();
            assert.ok(result);
            assert.strictEqual(result.project_name, "My Project");
            assert.strictEqual(result.project_status, "Active");
            assert.strictEqual(typeof result.effort_rounding, "number");
            assert.strictEqual(typeof result.team_size, "number");
        });

        it("ignores archived projects", async () => {
            await db.query(
                `INSERT INTO project_settings (project_name, project_status, effort_default_mode, week_start_day, effort_rounding, archived)
                 VALUES ($1, $2, $3, $4, $5, TRUE)`,
                ["Archived Proj", "Archived", "Hourly", "Monday", 0.25],
            );
            const result = await settings.getSettings();
            assert.strictEqual(result, null);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateSettings                                                     */
    /* ------------------------------------------------------------------ */

    describe("updateSettings", () => {
        it("updates project name", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject({ project_name: "Old Name" });
            const { settings: updated, changesApplied } = await settings.updateSettings(user.id, { project_name: "New Name" });
            assert.strictEqual(changesApplied, true);
            assert.strictEqual(updated.project_name, "New Name");
        });

        it("returns changesApplied=false when nothing changed", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject({ project_name: "Same" });
            const { changesApplied } = await settings.updateSettings(user.id, { project_name: "Same" });
            assert.strictEqual(changesApplied, false);
        });

        it("throws when no project settings exist", async () => {
            await assert.rejects(
                () => settings.updateSettings(1, { project_name: "X" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid project status", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject();
            await assert.rejects(
                () => settings.updateSettings(user.id, { project_status: "BadStatus" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid effort mode", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject();
            await assert.rejects(
                () => settings.updateSettings(user.id, { effort_default_mode: "Quarterly" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid week start day", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject();
            await assert.rejects(
                () => settings.updateSettings(user.id, { week_start_day: "Funday" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid effort rounding", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject();
            await assert.rejects(
                () => settings.updateSettings(user.id, { effort_rounding: -1 }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects empty project name", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject();
            await assert.rejects(
                () => settings.updateSettings(user.id, { project_name: "  " }),
                (err) => err.statusCode === 400,
            );
        });

        it("writes to change log on update", async () => {
            const user = await createTestUser({ role: "administrator" });
            const proj = await createTestProject({ project_name: "LogTest" });
            await settings.updateSettings(user.id, { project_name: "LogTest2" });
            const log = await settings.getChangeLog(proj.id);
            assert.ok(log.length >= 1);
            assert.ok(log[0].change_description.includes("project name"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getChangeLog                                                       */
    /* ------------------------------------------------------------------ */

    describe("getChangeLog", () => {
        it("returns empty array when no changes", async () => {
            const proj = await createTestProject();
            const log = await settings.getChangeLog(proj.id);
            assert.ok(Array.isArray(log));
            assert.strictEqual(log.length, 0);
        });

        it("returns change entries with pagination", async () => {
            const user = await createTestUser({ role: "administrator" });
            const proj = await createTestProject({ project_name: "PagTest" });
            // make 3 changes
            await settings.updateSettings(user.id, { project_name: "PagTest1" });
            await settings.updateSettings(user.id, { project_name: "PagTest2" });
            await settings.updateSettings(user.id, { project_name: "PagTest3" });
            const page1 = await settings.getChangeLog(proj.id, 2, 0);
            assert.strictEqual(page1.length, 2);
            const page2 = await settings.getChangeLog(proj.id, 2, 2);
            assert.strictEqual(page2.length, 1);
        });

        it("each entry has expected fields", async () => {
            const user = await createTestUser({ role: "administrator" });
            const proj = await createTestProject({ project_name: "FieldTest" });
            await settings.updateSettings(user.id, { project_name: "FieldTest2" });
            const log = await settings.getChangeLog(proj.id);
            const entry = log[0];
            assert.ok(entry.id);
            assert.ok(entry.changed_at);
            assert.ok(entry.change_description);
            assert.ok(typeof entry.changed_by_name === "string");
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateSettings – additional field branches                         */
    /* ------------------------------------------------------------------ */

    describe("updateSettings (fields)", () => {
        it("updates project_owner_email", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject({ project_name: "EmailTest" });
            const result = await settings.updateSettings(user.id, { project_owner_email: "new@email.com" });
            assert.strictEqual(result.settings.project_owner_email, "new@email.com");
        });

        it("updates project_description", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject({ project_name: "DescTest" });
            const result = await settings.updateSettings(user.id, { project_description: "A new description" });
            assert.strictEqual(result.settings.project_description, "A new description");
        });

        it("updates project_owner_name", async () => {
            const user = await createTestUser({ role: "administrator" });
            await createTestProject({ project_name: "OwnerTest" });
            const result = await settings.updateSettings(user.id, { project_owner_name: "New Owner" });
            assert.strictEqual(result.settings.project_owner_name, "New Owner");
        });

        it("updates multiple fields and logs all changes", async () => {
            const user = await createTestUser({ role: "administrator" });
            const proj = await createTestProject({ project_name: "MultiTest", project_status: "Active" });
            const result = await settings.updateSettings(user.id, {
                project_name: "MultiUpdated",
                effort_default_mode: "Weekly",
            });
            assert.strictEqual(result.settings.project_name, "MultiUpdated");
            assert.strictEqual(result.settings.effort_default_mode, "Weekly");
            const log = await settings.getChangeLog(proj.id);
            assert.ok(log.length >= 1, "Should have logged changes");
        });
    });
});
