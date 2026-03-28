const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, createTestUser, loginTestUser, createTestProject, getDb } = require("./helpers/setup");

const req = require("../src/controllers/requirements");

describe("requirements controller", () => {
    let db, adminUser, adminAuth, project;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => {
        await cleanAllTables();
        adminUser = await createTestUser({ role: "administrator" });
        adminAuth = await loginTestUser(adminUser.id);
        project = await createTestProject();
    });

    after(async () => await teardown());

    /* ------------------------------------------------------------------ */
    /*  createRequirement                                                  */
    /* ------------------------------------------------------------------ */

    describe("createRequirement", () => {
        it("creates a requirement with valid data", async () => {
            const result = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Implement login",
                description: "Users should be able to log in",
                requirement_type: "Functional",
                priority: "High",
                status: "Proposed",
                requirement_code_prefix: "REQ",
                requirement_code_number: 1,
            });
            assert.ok(result);
            assert.ok(result.id);
            assert.strictEqual(result.title, "Implement login");
            assert.strictEqual(result.requirement_type, "Functional");
            assert.strictEqual(result.priority, "High");
            assert.strictEqual(result.requirement_code_prefix, "REQ");
        });

        it("creates via full requirement_code (PREFIX-NUMBER)", async () => {
            const result = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Another requirement",
                requirement_type: "Non-functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "PERF-42",
            });
            assert.ok(result);
            assert.strictEqual(result.requirement_code_prefix, "PERF");
            assert.strictEqual(result.requirement_code_number, 42);
        });

        it("rejects invalid requirement type", async () => {
            await assert.rejects(
                () =>
                    req.createRequirement(adminUser.id, adminAuth.token, {
                        title: "Bad type",
                        requirement_type: "Invalid",
                        priority: "Low",
                        status: "Proposed",
                        requirement_code: "REQ-1",
                    }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid priority", async () => {
            await assert.rejects(
                () =>
                    req.createRequirement(adminUser.id, adminAuth.token, {
                        title: "Bad priority",
                        requirement_type: "Functional",
                        priority: "Urgent",
                        status: "Proposed",
                        requirement_code: "REQ-2",
                    }),
                (err) => err.statusCode === 400,
            );
        });

        it("rejects invalid status", async () => {
            await assert.rejects(
                () =>
                    req.createRequirement(adminUser.id, adminAuth.token, {
                        title: "Bad status",
                        requirement_type: "Functional",
                        priority: "Low",
                        status: "InvalidStatus",
                        requirement_code: "REQ-3",
                    }),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getRequirementById                                                 */
    /* ------------------------------------------------------------------ */

    describe("getRequirementById", () => {
        it("returns a requirement with acceptance_criteria", async () => {
            const created = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Find me",
                requirement_type: "Functional",
                priority: "Medium",
                status: "Proposed",
                requirement_code: "GET-1",
            });
            const found = await req.getRequirementById(adminUser.id, adminAuth.token, created.id);
            assert.ok(found);
            assert.strictEqual(found.title, "Find me");
            assert.ok(Array.isArray(found.acceptance_criteria));
        });

        it("returns null for non-existent requirement", async () => {
            const found = await req.getRequirementById(adminUser.id, adminAuth.token, 999999);
            assert.strictEqual(found, null);
        });

        it("rejects non-numeric ID", async () => {
            await assert.rejects(
                () => req.getRequirementById(adminUser.id, adminAuth.token, "abc"),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  listRequirements + countRequirements                               */
    /* ------------------------------------------------------------------ */

    describe("listRequirements & countRequirements", () => {
        it("lists requirements with pagination", async () => {
            for (let i = 1; i <= 5; i++) {
                await req.createRequirement(adminUser.id, adminAuth.token, {
                    title: `Req ${i}`,
                    requirement_type: "Functional",
                    priority: "Low",
                    status: "Proposed",
                    requirement_code: `LIST-${i}`,
                });
            }
            const page = await req.listRequirements(adminUser.id, adminAuth.token, 0, 3);
            assert.ok(Array.isArray(page));
            assert.strictEqual(page.length, 3);

            const count = await req.countRequirements(adminUser.id, adminAuth.token);
            assert.strictEqual(count, 5);
        });

        it("filters by search term", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Login Feature",
                requirement_type: "Functional",
                priority: "High",
                status: "Proposed",
                requirement_code: "SRCH-1",
            });
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Dashboard Widget",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "SRCH-2",
            });
            const results = await req.listRequirements(adminUser.id, adminAuth.token, 0, 10, { search: "Login" });
            assert.ok(results.length >= 1);
            assert.ok(results.some((r) => r.title === "Login Feature"));
        });

        it("filters by status", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Approved Req",
                requirement_type: "Functional",
                priority: "Low",
                status: "Approved",
                requirement_code: "FILT-1",
            });
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Proposed Req",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "FILT-2",
            });
            const results = await req.listRequirements(adminUser.id, adminAuth.token, 0, 10, { status: "Approved" });
            assert.ok(results.every((r) => r.status === "Approved"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateRequirement                                                  */
    /* ------------------------------------------------------------------ */

    describe("updateRequirement", () => {
        it("updates a requirement's title and priority", async () => {
            const created = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Original",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "UPD-1",
            });
            const updated = await req.updateRequirement(adminUser.id, adminAuth.token, created.id, {
                title: "Updated Title",
                priority: "Critical",
            });
            assert.ok(updated);
            assert.strictEqual(updated.title, "Updated Title");
            assert.strictEqual(updated.priority, "Critical");
        });

        it("archives a requirement", async () => {
            const created = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "To archive",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "ARC-1",
            });
            const archived = await req.updateRequirement(adminUser.id, adminAuth.token, created.id, {
                archived: true,
            });
            assert.ok(archived);
            assert.strictEqual(archived.archived, true);
        });

        it("returns null for non-existent requirement", async () => {
            const result = await req.updateRequirement(adminUser.id, adminAuth.token, 999999, { title: "Ghost" });
            assert.strictEqual(result, null);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getRequirementsSummary                                             */
    /* ------------------------------------------------------------------ */

    describe("getRequirementsSummary", () => {
        it("returns summary with counts", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Summary Req 1",
                requirement_type: "Functional",
                priority: "High",
                status: "Proposed",
                requirement_code: "SUM-1",
            });
            const summary = await req.getRequirementsSummary(adminUser.id, adminAuth.token);
            assert.ok(typeof summary.total_requirements === "number");
            assert.ok(summary.total_requirements >= 1);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  exportRequirementsToCSV                                            */
    /* ------------------------------------------------------------------ */

    describe("exportRequirementsToCSV", () => {
        it("returns a CSV string with header", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "CSV Req",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "CSV-1",
            });
            const csv = await req.exportRequirementsToCSV(adminUser.id, adminAuth.token);
            assert.ok(typeof csv === "string");
            assert.ok(csv.includes("CSV Req"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  Tags                                                               */
    /* ------------------------------------------------------------------ */

    describe("tag functions", () => {
        it("getAllTags returns tags after creating requirement with tags", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Tagged Req",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "TAG-1",
                tags: ["alpha", "beta"],
            });
            const tags = await req.getAllTags();
            assert.ok(Array.isArray(tags));
            assert.ok(tags.length >= 2);
        });

        it("getTagsForRequirementById returns tags for a specific requirement", async () => {
            const created = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Tag Lookup",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "TAG-2",
                tags: ["gamma"],
            });
            const tags = await req.getTagsForRequirementById(created.id);
            assert.ok(Array.isArray(tags));
            assert.ok(tags.includes("gamma"));
        });

        it("getTagsForProjectById returns tags linked to a project", async () => {
            const created = await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Project Tag Test",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "PTAG-1",
                tags: ["delta"],
            });
            // Link the tag to the project via the junction table
            const tagResult = await db.query("SELECT id FROM requirements_tags WHERE tag = 'delta'");
            await db.query("INSERT INTO requirements_tags_project_settings_junction (tag_id, project_settings_id) VALUES ($1, $2) ON CONFLICT DO NOTHING", [tagResult.rows[0].id, project.id]);
            const tags = await req.getTagsForProjectById(project.id);
            assert.ok(Array.isArray(tags));
            assert.ok(tags.includes("delta"));
        });

        it("getTagsForProjectById returns empty array for unknown project", async () => {
            const tags = await req.getTagsForProjectById(999999);
            assert.ok(Array.isArray(tags));
            assert.strictEqual(tags.length, 0);
        });

        it("getTagsFiltered returns tags matching a prefix", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Filter Tag Test",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "FTAG-1",
                tags: ["frontend", "backend"],
            });
            const tags = await req.getTagsFiltered("front");
            assert.ok(Array.isArray(tags));
            assert.ok(tags.includes("frontend"));
            assert.ok(!tags.includes("backend"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getReqCodePrefixes                                                 */
    /* ------------------------------------------------------------------ */

    describe("getReqCodePrefixes", () => {
        it("returns distinct code prefixes", async () => {
            await req.createRequirement(adminUser.id, adminAuth.token, {
                title: "Prefix Test",
                requirement_type: "Functional",
                priority: "Low",
                status: "Proposed",
                requirement_code: "UNIQ-1",
            });
            const prefixes = await req.getReqCodePrefixes();
            assert.ok(Array.isArray(prefixes));
            assert.ok(prefixes.includes("UNIQ"));
        });
    });
});
