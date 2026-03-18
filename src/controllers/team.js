const db = require("../db/db");
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");

function isNumericId(value) {
    if (typeof value === "number") return Number.isInteger(value);
    if (typeof value === "string") return /^\d+$/.test(value.trim());
    return false;
}

const VALID_ROLES = ["administrator", "manager", "coder", "viewer"];

function normalizeRole(role) {
    if (!role) return null;
    const normalizedRole = String(role).trim().toLowerCase();
    return VALID_ROLES.includes(normalizedRole) ? normalizedRole : null;
}

function createBadRequestError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

async function getCurrentProjectId() {
    const query = `
        SELECT id
        FROM project_settings
        WHERE project_status = 'Active' AND archived = FALSE
        ORDER BY updated_at DESC
        LIMIT 1
    `;
    const result = await db.query(query);
    return result.rows[0]?.id || null;
}

function buildFilterClause(filters, queryParams) {
    let clause = "";
    if (!filters) return { clause, queryParams };

    const searchValue = filters.search ? String(filters.search).trim() : "";
    if (searchValue) {
        queryParams.push(`%${searchValue}%`);
        const idx = queryParams.length;
        clause += ` AND (u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx} OR u.email ILIKE $${idx} OR u.username ILIKE $${idx}) `;
    }
    if (filters.role) {
        queryParams.push(String(filters.role).trim().toLowerCase());
        clause += ` AND COALESCE(ptm.role, u.role) = $${queryParams.length} `;
    }
    if (filters.status) {
        queryParams.push(String(filters.status).trim().toLowerCase());
        clause += ` AND u.status = $${queryParams.length} `;
    }
    return { clause, queryParams };
}

const SORT_FIELD_MAP = {
    name: { column: "u.first_name" },
    email: { column: "u.email" },
    role: { column: "COALESCE(ptm.role, u.role)" },
    status: { column: "u.status" },
    last_login_at: { column: "u.last_login_at" },
    created_at: { column: "u.created_at" },
    added_at: { column: "ptm.added_at" },
};

function buildSortClause(sortField, sortOrder) {
    if (!sortField || !(sortField in SORT_FIELD_MAP)) return "";
    const { column } = SORT_FIELD_MAP[sortField];
    const order = sortOrder && sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
    return ` ORDER BY ${column} ${order} `;
}

function normalizeMember(row) {
    if (!row) return null;
    return {
        id: row.id,
        username: row.username,
        email: row.email,
        first_name: row.first_name,
        last_name: row.last_name,
        role: row.role,
        status: row.status,
        last_login_at: row.last_login_at,
        created_at: row.created_at,
        user_icon_path: row.user_icon_path,
        address: row.address,
        date_of_birth: row.date_of_birth,
        suspension_start_at: row.suspension_start_at,
        suspension_end_at: row.suspension_end_at,
        added_at: row.added_at,
        added_by: row.added_by,
        project_settings_id: row.project_settings_id,
    };
}

async function listMembers(offset = 0, count = 20, options = {}) {
    const projectId = await getCurrentProjectId();
    if (!projectId) {
        return [];
    }

    let queryParams = [projectId];
    const multiFilter = buildFilterClause(options, queryParams);
    let filterClause = multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const sortClause = buildSortClause(options.sortField, options.sortOrder) || " ORDER BY ptm.added_at ASC, u.first_name ASC, u.last_name ASC ";
    queryParams.push(count);
    queryParams.push(offset);
    const query = `
        SELECT
            u.id, u.username, u.email, u.first_name, u.last_name,
            COALESCE(ptm.role, u.role) AS role,
            u.status, u.last_login_at, u.created_at,
            u.user_icon_path
        FROM project_team_members ptm
        JOIN users u ON u.id = ptm.user_id
        WHERE ptm.project_settings_id = $1
        ${filterClause}
        ${sortClause}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    const result = await db.query(query, queryParams);
    return result.rows.map(normalizeMember);
}

async function countMembers(options = {}) {
    const projectId = await getCurrentProjectId();
    if (!projectId) {
        return 0;
    }

    let queryParams = [projectId];
    const multiFilter = buildFilterClause(options, queryParams);
    let filterClause = multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const query = `
        SELECT COUNT(DISTINCT ptm.user_id)::int AS total
        FROM project_team_members ptm
        JOIN users u ON u.id = ptm.user_id
        WHERE ptm.project_settings_id = $1
        ${filterClause}
    `;
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0]?.total || 0, 10);
}

async function getTeamSummary() {
    const projectId = await getCurrentProjectId();
    if (!projectId) {
        return {
            total_members: 0,
            active_members: 0,
            admin_count: 0,
            pending_count: 0,
            by_role: {},
            by_status: {},
        };
    }

    const [totalResult, activeResult, adminResult, pendingResult, byRoleResult, byStatusResult] = await Promise.all([
        db.query(`SELECT COUNT(DISTINCT user_id)::int AS total FROM project_team_members WHERE project_settings_id = $1`, [projectId]),
        db.query(`
            SELECT COUNT(DISTINCT ptm.user_id)::int AS total
            FROM project_team_members ptm
            JOIN users u ON u.id = ptm.user_id
            WHERE ptm.project_settings_id = $1
              AND u.status = 'active'
        `, [projectId]),
        db.query(`
            SELECT COUNT(DISTINCT ptm.user_id)::int AS total
            FROM project_team_members ptm
            JOIN users u ON u.id = ptm.user_id
            WHERE ptm.project_settings_id = $1
              AND COALESCE(ptm.role, u.role) = 'administrator'
              AND u.status = 'active'
        `, [projectId]),
        db.query(`
            SELECT COUNT(DISTINCT ptm.user_id)::int AS total
            FROM project_team_members ptm
            JOIN users u ON u.id = ptm.user_id
            WHERE ptm.project_settings_id = $1
              AND u.status = 'pending'
        `, [projectId]),
        db.query(`
            SELECT COALESCE(ptm.role, u.role) AS count_key, COUNT(DISTINCT ptm.user_id)::int AS count_value
            FROM project_team_members ptm
            JOIN users u ON u.id = ptm.user_id
            WHERE ptm.project_settings_id = $1
            GROUP BY COALESCE(ptm.role, u.role)
            ORDER BY count_key ASC
        `, [projectId]),
        db.query(`
            SELECT u.status AS count_key, COUNT(DISTINCT ptm.user_id)::int AS count_value
            FROM project_team_members ptm
            JOIN users u ON u.id = ptm.user_id
            WHERE ptm.project_settings_id = $1
            GROUP BY u.status
            ORDER BY count_key ASC
        `, [projectId]),
    ]);
    const mapRows = (rows) =>
        rows.reduce((acc, row) => {
            acc[row.count_key] = Number(row.count_value);
            return acc;
        }, {});
    return {
        total_members: Number(totalResult.rows[0]?.total || 0),
        active_members: Number(activeResult.rows[0]?.total || 0),
        admin_count: Number(adminResult.rows[0]?.total || 0),
        pending_count: Number(pendingResult.rows[0]?.total || 0),
        by_role: mapRows(byRoleResult.rows),
        by_status: mapRows(byStatusResult.rows),
    };
}

async function getMemberById(memberId) {
    if (!isNumericId(memberId)) throw createBadRequestError("Invalid member ID");
    const projectId = await getCurrentProjectId();
    if (!projectId) {
        return null;
    }

    const query = `
        SELECT
            u.id, u.username, u.email, u.first_name, u.last_name,
            COALESCE(ptm.role, u.role) AS role,
            u.status, u.last_login_at, u.created_at, u.user_icon_path,
            u.address, u.date_of_birth,
            u.suspension_start_at, u.suspension_end_at,
            ptm.added_at, ptm.added_by, ptm.project_settings_id
        FROM project_team_members ptm
        JOIN users u ON u.id = ptm.user_id
        WHERE ptm.project_settings_id = $1
          AND u.id = $2
        LIMIT 1
    `;
    const result = await db.query(query, [projectId, Number(memberId)]);
    return result.rows.length > 0 ? normalizeMember(result.rows[0]) : null;
}

async function exportRosterToCSV(options = {}) {
    const projectId = await getCurrentProjectId();
    const csvHeader = "Name,Username,Email,Role,Status,Last Login,Created\n";
    if (!projectId) {
        return csvHeader;
    }

    let queryParams = [projectId];
    const multiFilter = buildFilterClause(options, queryParams);
    let filterClause = multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const sortClause = buildSortClause(options.sortField, options.sortOrder) || " ORDER BY ptm.added_at ASC, u.first_name ASC, u.last_name ASC ";
    const query = `
        SELECT
            u.id, u.username, u.email, u.first_name, u.last_name,
            COALESCE(ptm.role, u.role) AS role,
            u.status, u.last_login_at, u.created_at
        FROM project_team_members ptm
        JOIN users u ON u.id = ptm.user_id
        WHERE ptm.project_settings_id = $1
        ${filterClause}
        ${sortClause}
    `;
    const result = await db.query(query, queryParams);
    const members = result.rows.map(normalizeMember);
    const csvRows = members.map((member) => {
        const esc = (value) => (value ? `"${String(value).replace(/"/g, '""')}"` : "");
        return [
            esc(`${member.first_name} ${member.last_name}`.trim()),
            esc(member.username),
            esc(member.email),
            member.role,
            member.status,
            member.last_login_at ? new Date(member.last_login_at).toISOString() : "",
            member.created_at ? new Date(member.created_at).toISOString() : "",
        ].join(",");
    });
    return csvHeader + csvRows.join("\n");
}

async function listAvailableUsers() {
    const projectId = await getCurrentProjectId();
    if (!projectId) {
        return [];
    }

    const result = await db.query(
        `
        SELECT
            u.id, u.username, u.email, u.first_name, u.last_name,
            u.role, u.status, u.last_login_at, u.created_at,
            u.user_icon_path
        FROM users u
        WHERE NOT EXISTS (
            SELECT 1
            FROM project_team_members ptm
            WHERE ptm.project_settings_id = $1
              AND ptm.user_id = u.id
        )
        ORDER BY u.first_name ASC, u.last_name ASC, u.username ASC
        `,
        [projectId],
    );
    return result.rows.map(normalizeMember);
}

async function assignUserToActiveProject(userId, addedBy, role = null) {
    if (!isNumericId(userId)) {
        throw createBadRequestError("Invalid member ID");
    }

    const projectId = await getCurrentProjectId();
    if (!projectId) {
        throw createBadRequestError("No active project found");
    }

    const existing = await db.query(
        `
        SELECT id
        FROM project_team_members
        WHERE project_settings_id = $1 AND user_id = $2
        LIMIT 1
        `,
        [projectId, Number(userId)],
    );
    if (existing.rows.length > 0) {
        return { already_member: true, project_settings_id: projectId, user_id: Number(userId) };
    }

    let normalizedRole = normalizeRole(role);
    if (!normalizedRole) {
        const userResult = await db.query(
            `
            SELECT role
            FROM users
            WHERE id = $1
            LIMIT 1
            `,
            [Number(userId)],
        );
        if (userResult.rows.length === 0) {
            throw createBadRequestError("Member not found");
        }
        normalizedRole = normalizeRole(userResult.rows[0].role);
        if (!normalizedRole) {
            throw createBadRequestError("Member does not have a valid role");
        }
    }

    const result = await db.query(
        `
        INSERT INTO project_team_members (project_settings_id, user_id, role, added_by)
        VALUES ($1, $2, $3, $4)
        RETURNING id, project_settings_id, user_id, role, added_at, added_by
        `,
        [projectId, Number(userId), normalizedRole, addedBy || null],
    );
    return { already_member: false, ...result.rows[0] };
}

async function getCurrentUserRole(userId) {
    if (!isNumericId(userId)) {
        throw createBadRequestError("Invalid user ID");
    }
    const result = await db.query(`SELECT role FROM users WHERE id = $1 LIMIT 1`, [Number(userId)]);
    return result.rows[0]?.role || null;
}

module.exports = {
    listMembers,
    countMembers,
    getTeamSummary,
    getMemberById,
    exportRosterToCSV,
    listAvailableUsers,
    assignUserToActiveProject,
    getCurrentUserRole,
};
