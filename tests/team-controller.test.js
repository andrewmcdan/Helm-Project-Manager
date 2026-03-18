const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, createTestUser, createTestProject, getDb } = require("./helpers/setup");

const team = require("../src/controllers/team");

describe("team controller", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => await teardown());

    async function addProjectMember(user, project, role = user.role, addedBy = null) {
        await db.query(
            `
            INSERT INTO project_team_members (project_settings_id, user_id, role, added_by)
            VALUES ($1, $2, $3, $4)
            `,
            [project.id, user.id, role, addedBy],
        );
    }

    /* ------------------------------------------------------------------ */
    /*  listMembers                                                        */
    /* ------------------------------------------------------------------ */

    describe("listMembers", () => {
        it("returns only active-project members with pagination", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const projectUsers = [];
            for (let i = 0; i < 5; i++) {
                const user = await createTestUser();
                projectUsers.push(user);
                await addProjectMember(user, project);
            }
            await createTestUser({ first_name: "Outside", last_name: "Project" });

            const page = await team.listMembers(0, 3);
            assert.strictEqual(page.length, 3);
            assert.ok(page.every((member) => projectUsers.some((user) => user.id === member.id)));
        });

        it("filters by role within the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const admin = await createTestUser({ role: "administrator" });
            const coder = await createTestUser({ role: "coder" });
            await addProjectMember(admin, project, "administrator");
            await addProjectMember(coder, project, "coder");

            const admins = await team.listMembers(0, 100, { role: "administrator" });
            assert.deepStrictEqual(admins.map((member) => member.id), [admin.id]);
        });

        it("filters by status within the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const active = await createTestUser({ status: "active" });
            const pending = await createTestUser({ status: "pending" });
            await addProjectMember(active, project);
            await addProjectMember(pending, project);

            const pendingMembers = await team.listMembers(0, 100, { status: "pending" });
            assert.deepStrictEqual(pendingMembers.map((member) => member.id), [pending.id]);
        });

        it("filters by search term within the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const matching = await createTestUser({ first_name: "UniqueAbc" });
            const other = await createTestUser({ first_name: "OtherXyz" });
            await addProjectMember(matching, project);
            await addProjectMember(other, project);

            const results = await team.listMembers(0, 100, { search: "UniqueAbc" });
            assert.deepStrictEqual(results.map((member) => member.id), [matching.id]);
        });

        it("sorts by name ASC within the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const zara = await createTestUser({ first_name: "Zara" });
            const alice = await createTestUser({ first_name: "Alice" });
            await addProjectMember(zara, project);
            await addProjectMember(alice, project);

            const sorted = await team.listMembers(0, 100, { sortField: "name", sortOrder: "asc" });
            assert.strictEqual(sorted[0].first_name, "Alice");
            assert.strictEqual(sorted[1].first_name, "Zara");
        });
    });

    /* ------------------------------------------------------------------ */
    /*  countMembers                                                       */
    /* ------------------------------------------------------------------ */

    describe("countMembers", () => {
        it("returns only active-project member count", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const memberOne = await createTestUser();
            const memberTwo = await createTestUser();
            await addProjectMember(memberOne, project);
            await addProjectMember(memberTwo, project);
            await createTestUser({ first_name: "Not", last_name: "Assigned" });

            const count = await team.countMembers();
            assert.strictEqual(count, 2);
        });

        it("filters count by role within the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const viewer = await createTestUser({ role: "viewer" });
            const coder = await createTestUser({ role: "coder" });
            await addProjectMember(viewer, project, "viewer");
            await addProjectMember(coder, project, "coder");

            const viewerCount = await team.countMembers({ role: "viewer" });
            assert.strictEqual(viewerCount, 1);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getTeamSummary                                                     */
    /* ------------------------------------------------------------------ */

    describe("getTeamSummary", () => {
        it("returns aggregated summary for active-project members only", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const admin = await createTestUser({ role: "administrator", status: "active" });
            const coder = await createTestUser({ role: "coder", status: "active" });
            const pending = await createTestUser({ role: "viewer", status: "pending" });
            await addProjectMember(admin, project, "administrator");
            await addProjectMember(coder, project, "coder");
            await addProjectMember(pending, project, "viewer");
            await createTestUser({ role: "manager", status: "active" });

            const summary = await team.getTeamSummary();
            assert.strictEqual(summary.total_members, 3);
            assert.strictEqual(summary.active_members, 2);
            assert.strictEqual(summary.admin_count, 1);
            assert.strictEqual(summary.pending_count, 1);
            assert.strictEqual(summary.by_role.administrator, 1);
            assert.strictEqual(summary.by_role.coder, 1);
            assert.strictEqual(summary.by_role.viewer, 1);
            assert.strictEqual(summary.by_status.active, 2);
            assert.strictEqual(summary.by_status.pending, 1);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getMemberById                                                      */
    /* ------------------------------------------------------------------ */

    describe("getMemberById", () => {
        it("returns member data only when the user belongs to the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const user = await createTestUser({ first_name: "Detail", last_name: "User" });
            await addProjectMember(user, project);

            const found = await team.getMemberById(user.id);
            assert.ok(found);
            assert.strictEqual(found.first_name, "Detail");
            assert.strictEqual(found.last_name, "User");
        });

        it("returns null for a user who is not assigned to the active project", async () => {
            await createTestProject({ project_status: "Active" });
            const user = await createTestUser();
            const found = await team.getMemberById(user.id);
            assert.strictEqual(found, null);
        });

        it("rejects non-numeric ID", async () => {
            await assert.rejects(
                () => team.getMemberById("abc"),
                (err) => err.statusCode === 400,
            );
        });
    });

    /* ------------------------------------------------------------------ */
    /*  exportRosterToCSV                                                  */
    /* ------------------------------------------------------------------ */

    describe("exportRosterToCSV", () => {
        it("returns CSV with only active-project members", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const exportUser = await createTestUser({ first_name: "Export", last_name: "User" });
            await addProjectMember(exportUser, project);
            await createTestUser({ first_name: "Outside", last_name: "User" });

            const csv = await team.exportRosterToCSV();
            assert.ok(typeof csv === "string");
            assert.ok(csv.startsWith("Name,Username,Email,Role,Status,Last Login,Created"));
            assert.ok(csv.includes("Export User"));
            assert.ok(!csv.includes("Outside User"));
        });

        it("applies filters to project-roster export", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const admin = await createTestUser({ role: "administrator", first_name: "Admin", last_name: "Ex" });
            const coder = await createTestUser({ role: "coder", first_name: "Coder", last_name: "Ex" });
            await addProjectMember(admin, project, "administrator");
            await addProjectMember(coder, project, "coder");

            const csv = await team.exportRosterToCSV({ role: "administrator" });
            assert.ok(csv.includes("Admin Ex"));
            assert.ok(!csv.includes("Coder Ex"));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  listAvailableUsers                                                 */
    /* ------------------------------------------------------------------ */

    describe("listAvailableUsers", () => {
        it("returns only users not already assigned to the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const assigned = await createTestUser({ first_name: "Assigned", last_name: "User" });
            const available = await createTestUser({ first_name: "Available", last_name: "User" });
            await addProjectMember(assigned, project);

            const users = await team.listAvailableUsers();
            assert.ok(users.some((user) => user.id === available.id));
            assert.ok(!users.some((user) => user.id === assigned.id));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  assignUserToActiveProject                                          */
    /* ------------------------------------------------------------------ */

    describe("assignUserToActiveProject", () => {
        it("creates a membership row for the active project", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const admin = await createTestUser({ role: "administrator" });
            const member = await createTestUser({ role: "coder" });

            const assignment = await team.assignUserToActiveProject(member.id, admin.id, "coder");
            assert.strictEqual(assignment.project_settings_id, project.id);
            assert.strictEqual(assignment.user_id, member.id);

            const result = await db.query("SELECT COUNT(*)::int AS total FROM project_team_members WHERE project_settings_id = $1 AND user_id = $2", [project.id, member.id]);
            assert.strictEqual(result.rows[0].total, 1);
        });

        it("returns already_member when assignment already exists", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const member = await createTestUser({ role: "coder" });
            await addProjectMember(member, project, "coder");

            const assignment = await team.assignUserToActiveProject(member.id, null, "coder");
            assert.strictEqual(assignment.already_member, true);
        });

        it("uses the user's existing role when no project role is supplied", async () => {
            const project = await createTestProject({ project_status: "Active" });
            const admin = await createTestUser({ role: "administrator" });
            const member = await createTestUser({ role: "administrator" });

            const assignment = await team.assignUserToActiveProject(member.id, admin.id);
            assert.strictEqual(assignment.project_settings_id, project.id);
            assert.strictEqual(assignment.user_id, member.id);
            assert.strictEqual(assignment.role, "administrator");

            const result = await db.query(
                "SELECT role FROM project_team_members WHERE project_settings_id = $1 AND user_id = $2 LIMIT 1",
                [project.id, member.id],
            );
            assert.strictEqual(result.rows[0].role, "administrator");
        });
    });
});
