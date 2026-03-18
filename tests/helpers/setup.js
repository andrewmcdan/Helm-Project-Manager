/**
 * Test helper – shared setup / teardown / factories for the Helm test suite.
 *
 * Usage:
 *   const { setup, teardown, getDb, createTestUser, loginTestUser, getAdminAuth } = require("./setup");
 *
 * Call `await setup()` once in a top-level `before()` and `await teardown()` in `after()`.
 */

const db = require("../../src/db/db");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_here";

/* ------------------------------------------------------------------ */
/*  DB bootstrap / cleanup                                             */
/* ------------------------------------------------------------------ */

/** Wipe all rows from every app table so each suite starts clean. */
async function cleanAllTables() {
    await db.query("DELETE FROM risk_updates");
    await db.query("DELETE FROM risks");
    await db.query("DELETE FROM effort_entries");
    await db.query("DELETE FROM effort_categories");
    await db.query("DELETE FROM requirements_tags_project_settings_junction");
    await db.query("DELETE FROM requirements_tags_junction");
    await db.query("DELETE FROM requirements_acceptance_criteria");
    await db.query("DELETE FROM requirements_tags");
    await db.query("DELETE FROM requirements");
    await db.query("DELETE FROM project_team_members");
    await db.query("DELETE FROM project_settings_change_log");
    await db.query("DELETE FROM project_settings");
    await db.query("DELETE FROM password_history");
    await db.query("DELETE FROM logged_in_users");
    await db.query("DELETE FROM audit_logs");
    await db.query("DELETE FROM app_logs");
    await db.query("DELETE FROM users");
}

async function setup() {
    await cleanAllTables();
}

async function teardown() {
    await cleanAllTables();
    await db.closePool();
}

/* ------------------------------------------------------------------ */
/*  Factory helpers                                                    */
/* ------------------------------------------------------------------ */

let userSeq = 0;

/**
 * Insert a user row directly via SQL and return its id + generated username.
 * Password defaults to "Test1!Pass" hashed with bcrypt via crypt().
 */
async function createTestUser(overrides = {}) {
    userSeq++;
    const first = overrides.first_name || `Test${userSeq}`;
    const last = overrides.last_name || `User${userSeq}`;
    const email = overrides.email || `test${userSeq}@helm.local`;
    const role = overrides.role || "coder";
    const status = overrides.status || "active";
    const password = overrides.password || "Test1!Pass";
    const tempPassword = overrides.temp_password ?? false;
    const mm = String(new Date().getMonth() + 1).padStart(2, "0");
    const yy = String(new Date().getFullYear()).slice(-2);
    const username = overrides.username || `${first.charAt(0)}${last}${userSeq}${mm}${yy}`;

    const result = await db.query(
        `INSERT INTO users
            (username, email, password_hash, first_name, last_name, role, status, temp_password,
             created_at, password_changed_at, password_expires_at, user_icon_path)
         VALUES
            ($1, $2, crypt($3, gen_salt('bf')), $4, $5, $6, $7, $8,
             now(), now(), now() + interval '90 days', gen_random_uuid())
         RETURNING id, username, email, role, status, user_icon_path`,
        [username, email, password, first, last, role, status, tempPassword],
    );

    // Also save to password_history
    const userRow = result.rows[0];
    const hashResult = await db.query("SELECT password_hash FROM users WHERE id = $1", [userRow.id]);
    await db.query("INSERT INTO password_history (user_id, password_hash, changed_at) VALUES ($1, $2, now())", [userRow.id, hashResult.rows[0].password_hash]);

    return { ...userRow, password };
}

/**
 * Create a logged-in session for a user and return auth headers.
 */
async function loginTestUser(userId) {
    const token = jwt.sign({ userId: String(userId) }, JWT_SECRET, { expiresIn: "1h" });
    await db.query("INSERT INTO logged_in_users (user_id, token) VALUES ($1, $2)", [userId, token]);
    return {
        token,
        headers: {
            Authorization: `Bearer ${token}`,
            "X-User-Id": String(userId),
            "Content-Type": "application/json",
        },
    };
}

/**
 * Convenience: create an admin user and return headers ready to use.
 */
async function getAdminAuth() {
    const admin = await createTestUser({ role: "administrator", first_name: "Admin", last_name: "Tester", email: "admin_test@helm.local" });
    const auth = await loginTestUser(admin.id);
    return { user: admin, ...auth };
}

/**
 * Convenience: create a regular (coder) user and return headers ready to use.
 */
async function getCoderAuth() {
    const coder = await createTestUser({ role: "coder", first_name: "Coder", last_name: "Tester", email: "coder_test@helm.local" });
    const auth = await loginTestUser(coder.id);
    return { user: coder, ...auth };
}

function getDb() {
    return db;
}

/**
 * Insert a project_settings row with defaults for required columns.
 */
async function createTestProject(overrides = {}) {
    const name = overrides.project_name || `Test Project ${Date.now()}`;
    const owner = overrides.project_owner_name || "Test Owner";
    const desc = overrides.project_description || "Test description";
    const status = overrides.project_status || "Active";
    const mode = overrides.effort_default_mode || "Hourly";
    const day = overrides.week_start_day || "Monday";
    const rounding = overrides.effort_rounding ?? 0.25;
    const updatedBy = overrides.updated_by || null;

    const result = await db.query(
        `INSERT INTO project_settings
            (project_name, project_owner_name, project_description, project_status,
             effort_default_mode, week_start_day, effort_rounding, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [name, owner, desc, status, mode, day, rounding, updatedBy],
    );
    return result.rows[0];
}

let reqSeq = 0;

/**
 * Insert a requirements row directly via SQL and return it.
 */
async function createTestRequirement(overrides = {}) {
    reqSeq++;
    const title = overrides.title || `Test Requirement ${reqSeq}`;
    const requirement_type = overrides.requirement_type || "Functional";
    const priority = overrides.priority || "Medium";
    const status = overrides.status || "Proposed";
    const prefix = overrides.requirement_code_prefix || "REQ";
    const number = overrides.requirement_code_number || reqSeq;
    const createdBy = overrides.created_by || null;

    const result = await db.query(
        `INSERT INTO requirements
            (title, requirement_type, priority, status, requirement_code_prefix, requirement_code_number, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [title, requirement_type, priority, status, prefix, number, createdBy],
    );
    return result.rows[0];
}

module.exports = { setup, teardown, cleanAllTables, getDb, createTestUser, loginTestUser, getAdminAuth, getCoderAuth, createTestProject, createTestRequirement, JWT_SECRET };
