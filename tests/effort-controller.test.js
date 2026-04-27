const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, createTestUser, createTestProject, createTestRequirement, getDb } = require("./helpers/setup");

const effort = require("../src/controllers/effort");

describe("effort controller", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => await teardown());

    /* ------------------------------------------------------------------ */
    /*  Helpers – create a project + requirement + category context         */
    /* ------------------------------------------------------------------ */

    async function seedContext() {
        const user = await createTestUser();
        const project = await createTestProject({ project_status: "Active" });
        const req = await createTestRequirement({ created_by: user.id });
        await db.query("INSERT INTO effort_categories (category_name, sort_order) VALUES ($1, $2)", ["Development", 1]);
        return { user, project, req };
    }

    /* ------------------------------------------------------------------ */
    /*  getCategories                                                      */
    /* ------------------------------------------------------------------ */

    describe("getCategories", () => {
        it("returns category names", async () => {
            await db.query("INSERT INTO effort_categories (category_name, sort_order) VALUES ('Dev', 1), ('QA', 2)");
            const cats = await effort.getCategories();
            assert.ok(Array.isArray(cats));
            assert.ok(cats.includes("Dev"));
            assert.ok(cats.includes("QA"));
        });

        it("returns empty array when no categories", async () => {
            const cats = await effort.getCategories();
            assert.deepStrictEqual(cats, []);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  createEntry                                                        */
    /* ------------------------------------------------------------------ */

    describe("createEntry", () => {
        it("creates a daily entry", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, {
                effort_mode: "Daily",
                hours: 4,
                requirement_id: req.id,
                category: "Development",
                date: "2025-01-15",
                notes: "Working on feature",
            });
            assert.ok(entry);
            assert.strictEqual(entry.effort_mode, "Daily");
            assert.strictEqual(entry.effort_amount, 4);
            assert.strictEqual(entry.category, "Development");
            assert.ok(entry.entry_date);
        });

        it("creates a weekly entry", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, {
                effort_mode: "Weekly",
                hours: 20,
                requirement_id: req.id,
                category: "Development",
                week_of: "2025-01-13",
            });
            assert.ok(entry);
            assert.strictEqual(entry.effort_mode, "Weekly");
            assert.ok(entry.week_of);
        });

        it("normalizes mode casing", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, {
                effort_mode: "daily",
                hours: 2,
                requirement_id: req.id,
                category: "Development",
            });
            assert.strictEqual(entry.effort_mode, "Daily");
        });

        it("rejects invalid effort mode", async () => {
            const { user, req } = await seedContext();
            await assert.rejects(
                () => effort.createEntry(user.id, { effort_mode: "Monthly", hours: 1, requirement_id: req.id, category: "Dev" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects non-positive hours", async () => {
            const { user, req } = await seedContext();
            await assert.rejects(
                () => effort.createEntry(user.id, { effort_mode: "Daily", hours: 0, requirement_id: req.id, category: "Dev" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects missing requirement_id", async () => {
            const { user } = await seedContext();
            await assert.rejects(
                () => effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, category: "Dev" }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects missing category", async () => {
            const { user, req } = await seedContext();
            await assert.rejects(
                () => effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id }),
                (err) => err.statusCode === 400,
            );
        });

        it("throws when no active project", async () => {
            const user = await createTestUser();
            const req = await createTestRequirement({ created_by: user.id });
            await db.query("INSERT INTO effort_categories (category_name, sort_order) VALUES ('Dev', 1)");
            // No project_settings inserted
            await assert.rejects(
                () => effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Dev" }),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getEntryById                                                       */
    /* ------------------------------------------------------------------ */

    describe("getEntryById", () => {
        it("returns entry by ID", async () => {
            const { user, req } = await seedContext();
            const created = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 3, requirement_id: req.id, category: "Development" });
            const found = await effort.getEntryById(user.id, created.id);
            assert.ok(found);
            assert.strictEqual(found.id, created.id);
        });

        it("returns null for non-existent ID", async () => {
            const found = await effort.getEntryById(1, 999999);
            assert.strictEqual(found, null);
        });

        it("rejects non-numeric ID", async () => {
            await assert.rejects(
                () => effort.getEntryById(1, "abc"),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  listEntries                                                        */
    /* ------------------------------------------------------------------ */

    describe("listEntries", () => {
        it("returns entries with pagination", async () => {
            const { user, req } = await seedContext();
            for (let i = 0; i < 5; i++) {
                await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development", date: `2025-01-${10 + i}` });
            }
            const page = await effort.listEntries(user.id, { limit: 3 });
            assert.strictEqual(page.length, 3);
        });

        it("filters by requirement_id", async () => {
            const { user, req } = await seedContext();
            const req2 = await createTestRequirement({ created_by: user.id });
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development" });
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req2.id, category: "Development" });
            const entries = await effort.listEntries(user.id, { requirement_id: req.id });
            assert.ok(entries.every((e) => String(e.requirement_id) === String(req.id)));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getRecentEntries                                                   */
    /* ------------------------------------------------------------------ */

    describe("getRecentEntries", () => {
        it("returns limited recent entries", async () => {
            const { user, req } = await seedContext();
            for (let i = 0; i < 5; i++) {
                await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development", date: `2025-01-${10 + i}` });
            }
            const recent = await effort.getRecentEntries(user.id, 3);
            assert.strictEqual(recent.length, 3);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateEntry                                                        */
    /* ------------------------------------------------------------------ */

    describe("updateEntry", () => {
        it("updates hours and notes", async () => {
            const { user, req } = await seedContext();
            const created = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const updated = await effort.updateEntry(user.id, created.id, { hours: 5, notes: "Updated notes" });
            assert.strictEqual(updated.effort_amount, 5);
            assert.strictEqual(updated.description, "Updated notes");
        });

        it("returns null for non-existent entry", async () => {
            const result = await effort.updateEntry(1, 999999, { hours: 1 });
            assert.strictEqual(result, null);
        });

        it("rejects non-positive hours", async () => {
            const { user, req } = await seedContext();
            const created = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            await assert.rejects(
                () => effort.updateEntry(user.id, created.id, { hours: -1 }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects non-numeric ID", async () => {
            await assert.rejects(
                () => effort.updateEntry(1, "abc", { hours: 1 }),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  deleteEntry                                                        */
    /* ------------------------------------------------------------------ */

    describe("deleteEntry", () => {
        it("soft-deletes an entry", async () => {
            const { user, req } = await seedContext();
            const created = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const deleted = await effort.deleteEntry(user.id, created.id);
            assert.strictEqual(deleted, true);
            // Should no longer be found
            const found = await effort.getEntryById(user.id, created.id);
            assert.strictEqual(found, null);
        });

        it("returns false for non-existent entry", async () => {
            const deleted = await effort.deleteEntry(1, 999999);
            assert.strictEqual(deleted, false);
        });

        it("rejects non-numeric ID", async () => {
            await assert.rejects(
                () => effort.deleteEntry(1, "abc"),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getSummary                                                         */
    /* ------------------------------------------------------------------ */

    describe("getSummary", () => {
        it("returns summary with grand total and breakdowns", async () => {
            const { user, req } = await seedContext();
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 3, requirement_id: req.id, category: "Development" });
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 5, requirement_id: req.id, category: "Development" });
            const summary = await effort.getSummary(user.id);
            assert.strictEqual(summary.grand_total, 8);
            assert.ok(Array.isArray(summary.by_requirement));
            assert.ok(Array.isArray(summary.by_category));
            assert.ok(summary.by_requirement.length >= 1);
            assert.ok(summary.by_category.length >= 1);
        });

        it("returns zero total with no entries", async () => {
            const summary = await effort.getSummary(1);
            assert.strictEqual(summary.grand_total, 0);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  exportCSV                                                          */
    /* ------------------------------------------------------------------ */

    describe("exportCSV", () => {
        it("returns CSV with header and data rows", async () => {
            const { user, req } = await seedContext();
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 4, requirement_id: req.id, category: "Development", notes: "Test note" });
            const csv = await effort.exportCSV(user.id);
            assert.ok(typeof csv === "string");
            assert.ok(csv.startsWith("ID,Date,Week Of,Mode,Requirement,Category,Hours,User,Notes"));
            assert.ok(csv.includes("Development"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getTeamMembers                                                     */
    /* ------------------------------------------------------------------ */

    describe("getTeamMembers", () => {
        it("returns team members with id and name", async () => {
            await createTestUser({ first_name: "Eff", last_name: "User" });
            const members = await effort.getTeamMembers();
            assert.ok(members.length >= 1);
            assert.ok(members[0].id);
            assert.ok(members[0].name);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  listEntries – filter branches                                      */
    /* ------------------------------------------------------------------ */

    describe("listEntries (filters)", () => {
        it("filters by category", async () => {
            const { user, req } = await seedContext();
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            await db.query("INSERT INTO effort_categories (category_name, sort_order) VALUES ($1, $2)", ["Testing", 2]);
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 3, requirement_id: req.id, category: "Testing" });
            const list = await effort.listEntries(user.id, { category: "Testing" });
            assert.ok(list.length >= 1);
            assert.ok(list.every((e) => e.category === "Testing"));
        });

        it("filters by user_id", async () => {
            const { user, req } = await seedContext();
            const other = await createTestUser({ email: "other@test.com" });
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development" });
            await effort.createEntry(other.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const list = await effort.listEntries(user.id, { user_id: other.id });
            assert.ok(list.length >= 1);
            assert.ok(list.every((e) => String(e.user_id) === String(other.id)));
        });

        it("filters by date_from", async () => {
            const { user, req } = await seedContext();
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development", date: "2025-01-10" });
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development", date: "2025-06-15" });
            const list = await effort.listEntries(user.id, { date_from: "2025-06-01" });
            assert.ok(list.length >= 1);
        });

        it("filters by date_to", async () => {
            const { user, req } = await seedContext();
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development", date: "2025-01-10" });
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development", date: "2025-06-15" });
            const list = await effort.listEntries(user.id, { date_to: "2025-02-01" });
            assert.ok(list.length >= 1);
        });

        it("ignores invalid date_from", async () => {
            const { user, req } = await seedContext();
            await effort.createEntry(user.id, { effort_mode: "Daily", hours: 1, requirement_id: req.id, category: "Development" });
            const list = await effort.listEntries(user.id, { date_from: "not-a-date" });
            assert.ok(list.length >= 1);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateEntry – additional field branches                            */
    /* ------------------------------------------------------------------ */

    describe("updateEntry (fields)", () => {
        it("updates category", async () => {
            const { user, req } = await seedContext();
            await db.query("INSERT INTO effort_categories (category_name, sort_order) VALUES ($1, $2) ON CONFLICT DO NOTHING", ["Testing", 2]);
            const entry = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const updated = await effort.updateEntry(user.id, entry.id, { category: "Testing" });
            assert.strictEqual(updated.category, "Testing");
        });

        it("updates requirement_id", async () => {
            const { user, req } = await seedContext();
            const req2 = await createTestRequirement({ requirement_code_number: 42, created_by: user.id });
            const entry = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const updated = await effort.updateEntry(user.id, entry.id, { requirement_id: req2.id });
            assert.strictEqual(updated.requirement_id, req2.id);
        });

        it("rejects invalid requirement_id", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            await assert.rejects(() => effort.updateEntry(user.id, entry.id, { requirement_id: "abc" }), /Invalid requirement ID/);
        });

        it("updates date", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const updated = await effort.updateEntry(user.id, entry.id, { date: "2025-06-01" });
            assert.ok(new Date(updated.entry_date).toISOString().includes("2025-06-01"));
        });

        it("rejects invalid date", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            await assert.rejects(() => effort.updateEntry(user.id, entry.id, { date: "xyz" }), /Invalid date/);
        });

        it("updates week_of", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, { effort_mode: "Weekly", hours: 10, requirement_id: req.id, category: "Development", week_of: "2025-01-06" });
            const updated = await effort.updateEntry(user.id, entry.id, { week_of: "2025-06-02" });
            assert.ok(new Date(updated.week_of).toISOString().includes("2025-06-02"));
        });

        it("rejects invalid week_of", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, { effort_mode: "Weekly", hours: 10, requirement_id: req.id, category: "Development", week_of: "2025-01-06" });
            await assert.rejects(() => effort.updateEntry(user.id, entry.id, { week_of: "xyz" }), /Invalid week-of date/);
        });

        it("returns existing entry when body is empty", async () => {
            const { user, req } = await seedContext();
            const entry = await effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development" });
            const result = await effort.updateEntry(user.id, entry.id, {});
            assert.strictEqual(result.id, entry.id);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  createEntry – invalid date branches                                */
    /* ------------------------------------------------------------------ */

    describe("createEntry (date validation)", () => {
        it("rejects invalid explicit date in Daily mode", async () => {
            const { user, req } = await seedContext();
            await assert.rejects(() => effort.createEntry(user.id, { effort_mode: "Daily", hours: 2, requirement_id: req.id, category: "Development", date: "not-a-date" }), /Invalid entry date/);
        });

        it("rejects invalid week_of in Weekly mode", async () => {
            const { user, req } = await seedContext();
            await assert.rejects(() => effort.createEntry(user.id, { effort_mode: "Weekly", hours: 2, requirement_id: req.id, category: "Development", week_of: "garbage" }), /Invalid week-of date/);
        });
    });
});
