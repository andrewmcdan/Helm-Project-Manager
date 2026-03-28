const db = require("../db/db");
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");

function isNumericId(value) {
    if (typeof value === "number") return Number.isInteger(value);
    if (typeof value === "string") return /^\d+$/.test(value.trim());
    return false;
}

function createBadRequestError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

const VALID_EFFORT_MODES = ["Daily", "Weekly"];

const getCurrentProjectId = async () => {
    const query = `
        SELECT id FROM project_settings
        WHERE project_status = 'Active' AND archived = false
        ORDER BY updated_at DESC LIMIT 1
    `;
    try {
        const result = await db.query(query);
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        log("error", `Failed to get current project ID: ${error.message}`, {}, getCallerInfo());
        return null;
    }
};

async function getCategories() {
    const result = await db.query(`SELECT id, category_name FROM effort_categories ORDER BY sort_order ASC`);
    return result.rows.map((row) => row.category_name);
}

async function listEntries(userId, options = {}) {
    const queryParams = [];
    let filterClause = "";

    if (options.requirement_id && isNumericId(options.requirement_id)) {
        queryParams.push(Number(options.requirement_id));
        filterClause += ` AND ee.requirement_id = $${queryParams.length} `;
    }
    if (options.category) {
        queryParams.push(String(options.category).trim());
        filterClause += ` AND ee.category = $${queryParams.length} `;
    }
    if (options.user_id && isNumericId(options.user_id)) {
        queryParams.push(Number(options.user_id));
        filterClause += ` AND ee.user_id = $${queryParams.length} `;
    }
    if (options.date_from) {
        const d = new Date(options.date_from);
        if (!isNaN(d.getTime())) {
            queryParams.push(d.toISOString().slice(0, 10));
            filterClause += ` AND COALESCE(ee.entry_date, ee.week_of) >= $${queryParams.length}::date `;
        }
    }
    if (options.date_to) {
        const d = new Date(options.date_to);
        if (!isNaN(d.getTime())) {
            queryParams.push(d.toISOString().slice(0, 10));
            filterClause += ` AND COALESCE(ee.entry_date, ee.week_of) <= $${queryParams.length}::date `;
        }
    }

    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 50, 1), 500);
    const offset = Math.max(parseInt(options.offset, 10) || 0, 0);
    queryParams.push(limit);
    queryParams.push(offset);

    const query = `
        SELECT
            ee.id, ee.project_id, ee.requirement_id, ee.user_id,
            ee.entry_date, ee.effort_mode, ee.effort_amount, ee.description,
            ee.week_of, ee.category, ee.created_at, ee.updated_at,
            u.first_name || ' ' || u.last_name AS user_name,
            r.requirement_code_prefix, r.requirement_code_number, r.title AS requirement_title
        FROM effort_entries ee
        LEFT JOIN users u ON u.id = ee.user_id
        LEFT JOIN requirements r ON r.id = ee.requirement_id
        WHERE ee.archived = FALSE ${filterClause}
        ORDER BY COALESCE(ee.entry_date, ee.week_of, ee.created_at) DESC, ee.id DESC
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;

    const result = await db.query(query, queryParams);
    return result.rows.map(formatEntryRow);
}

async function getRecentEntries(userId, limit = 20) {
    const query = `
        SELECT
            ee.id, ee.project_id, ee.requirement_id, ee.user_id,
            ee.entry_date, ee.effort_mode, ee.effort_amount, ee.description,
            ee.week_of, ee.category, ee.created_at, ee.updated_at,
            u.first_name || ' ' || u.last_name AS user_name,
            r.requirement_code_prefix, r.requirement_code_number, r.title AS requirement_title
        FROM effort_entries ee
        LEFT JOIN users u ON u.id = ee.user_id
        LEFT JOIN requirements r ON r.id = ee.requirement_id
        WHERE ee.archived = FALSE
        ORDER BY COALESCE(ee.entry_date, ee.week_of, ee.created_at) DESC, ee.id DESC
        LIMIT $1
    `;
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const result = await db.query(query, [safeLimit]);
    return result.rows.map(formatEntryRow);
}

function formatEntryRow(row) {
    return {
        id: row.id,
        project_id: row.project_id,
        requirement_id: row.requirement_id,
        user_id: row.user_id,
        entry_date: row.entry_date,
        effort_mode: row.effort_mode,
        effort_amount: Number(row.effort_amount || 0),
        description: row.description,
        week_of: row.week_of,
        category: row.category,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_name: row.user_name || "Unknown",
        requirement_code: row.requirement_code_prefix && row.requirement_code_number ? `${row.requirement_code_prefix}-${row.requirement_code_number}` : null,
        requirement_title: row.requirement_title || null,
    };
}

async function getSummary(userId, options = {}) {
    const filterParams = [];
    let filterClause = "";

    if (options.requirement_id && isNumericId(options.requirement_id)) {
        filterParams.push(Number(options.requirement_id));
        filterClause += ` AND ee.requirement_id = $${filterParams.length} `;
    }
    if (options.category) {
        filterParams.push(String(options.category).trim());
        filterClause += ` AND ee.category = $${filterParams.length} `;
    }
    if (options.user_id && isNumericId(options.user_id)) {
        filterParams.push(Number(options.user_id));
        filterClause += ` AND ee.user_id = $${filterParams.length} `;
    }
    if (options.date_from) {
        const d = new Date(options.date_from);
        if (!isNaN(d.getTime())) {
            filterParams.push(d.toISOString().slice(0, 10));
            filterClause += ` AND COALESCE(ee.entry_date, ee.week_of) >= $${filterParams.length}::date `;
        }
    }
    if (options.date_to) {
        const d = new Date(options.date_to);
        if (!isNaN(d.getTime())) {
            filterParams.push(d.toISOString().slice(0, 10));
            filterClause += ` AND COALESCE(ee.entry_date, ee.week_of) <= $${filterParams.length}::date `;
        }
    }

    const [byRequirement, byCategory, totals] = await Promise.all([
        db.query(
            `
            SELECT
                ee.requirement_id,
                r.requirement_code_prefix, r.requirement_code_number, r.title AS requirement_title,
                COALESCE(SUM(ee.effort_amount), 0) AS total_hours,
                MAX(COALESCE(ee.entry_date, ee.week_of, ee.created_at)) AS last_entry
            FROM effort_entries ee
            LEFT JOIN requirements r ON r.id = ee.requirement_id
            WHERE ee.archived = FALSE ${filterClause}
            GROUP BY ee.requirement_id, r.requirement_code_prefix, r.requirement_code_number, r.title
            ORDER BY total_hours DESC
            `,
            filterParams,
        ),
        db.query(
            `
            SELECT
                ee.category,
                COALESCE(SUM(ee.effort_amount), 0) AS total_hours
            FROM effort_entries ee
            WHERE ee.archived = FALSE ${filterClause}
            GROUP BY ee.category
            ORDER BY total_hours DESC
            `,
            filterParams,
        ),
        db.query(
            `
            SELECT COALESCE(SUM(ee.effort_amount), 0) AS grand_total
            FROM effort_entries ee
            WHERE ee.archived = FALSE ${filterClause}
            `,
            filterParams,
        ),
    ]);

    const grandTotal = Number(totals.rows[0]?.grand_total || 0);

    return {
        grand_total: grandTotal,
        by_requirement: byRequirement.rows.map((row) => ({
            requirement_id: row.requirement_id,
            requirement_code: row.requirement_code_prefix && row.requirement_code_number ? `${row.requirement_code_prefix}-${row.requirement_code_number}` : "—",
            requirement_title: row.requirement_title || "Unknown",
            total_hours: Number(row.total_hours || 0),
            last_entry: row.last_entry,
        })),
        by_category: byCategory.rows.map((row) => ({
            category: row.category || "Uncategorized",
            total_hours: Number(row.total_hours || 0),
            share: grandTotal > 0 ? Math.round((Number(row.total_hours || 0) / grandTotal) * 100) : 0,
        })),
    };
}

async function getEntryById(userId, entryId) {
    if (!isNumericId(entryId)) {
        throw createBadRequestError("Invalid effort entry ID");
    }
    const result = await db.query(
        `
        SELECT
            ee.id, ee.project_id, ee.requirement_id, ee.user_id,
            ee.entry_date, ee.effort_mode, ee.effort_amount, ee.description,
            ee.week_of, ee.category, ee.created_at, ee.updated_at,
            u.first_name || ' ' || u.last_name AS user_name,
            r.requirement_code_prefix, r.requirement_code_number, r.title AS requirement_title
        FROM effort_entries ee
        LEFT JOIN users u ON u.id = ee.user_id
        LEFT JOIN requirements r ON r.id = ee.requirement_id
        WHERE ee.id = $1 AND ee.archived = FALSE
        LIMIT 1
        `,
        [Number(entryId)],
    );
    if (result.rows.length === 0) return null;
    return formatEntryRow(result.rows[0]);
}

async function createEntry(userId, entryData) {
    const mode = String(entryData.effort_mode || "Daily").trim();
    const normalizedMode = mode.charAt(0).toUpperCase() + mode.slice(1).toLowerCase();
    if (!VALID_EFFORT_MODES.includes(normalizedMode)) {
        throw createBadRequestError(`Invalid effort mode. Allowed: ${VALID_EFFORT_MODES.join(", ")}`);
    }

    const hours = parseFloat(entryData.hours);
    if (isNaN(hours) || hours <= 0) {
        throw createBadRequestError("Hours must be a positive number");
    }

    const requirementId = entryData.requirement_id;
    if (!requirementId || !isNumericId(requirementId)) {
        throw createBadRequestError("A valid requirement ID is required");
    }

    const category = entryData.category ? String(entryData.category).trim() : null;
    if (!category) {
        throw createBadRequestError("Category is required");
    }

    const projectId = await getCurrentProjectId();
    if (!projectId) {
        throw createBadRequestError("No active project found. Please set up a project first.");
    }

    let entryDate = null;
    let weekOf = null;
    if (normalizedMode === "Daily") {
        entryDate = entryData.date ? new Date(entryData.date) : new Date();
        if (isNaN(entryDate.getTime())) {
            throw createBadRequestError("Invalid entry date");
        }
        entryDate = entryDate.toISOString().slice(0, 10);
    } else {
        weekOf = entryData.week_of ? new Date(entryData.week_of) : new Date();
        if (isNaN(weekOf.getTime())) {
            throw createBadRequestError("Invalid week-of date");
        }
        weekOf = weekOf.toISOString().slice(0, 10);
    }

    const description = entryData.notes ? String(entryData.notes).trim() : null;

    const result = await db.query(
        `
        INSERT INTO effort_entries
            (project_id, requirement_id, user_id, entry_date, effort_mode, effort_amount, description, week_of, category, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $3, $3)
        RETURNING id
        `,
        [projectId, Number(requirementId), userId, entryDate, normalizedMode, hours, description, weekOf, category],
    );

    return getEntryById(userId, result.rows[0].id);
}

async function updateEntry(userId, entryId, updateData) {
    if (!isNumericId(entryId)) {
        throw createBadRequestError("Invalid effort entry ID");
    }
    const entryIdNum = Number(entryId);
    const existing = await db.query(`SELECT id FROM effort_entries WHERE id = $1 AND archived = FALSE LIMIT 1`, [entryIdNum]);
    if (existing.rows.length === 0) return null;

    const setClauses = [];
    const params = [];

    if (updateData.hours !== undefined) {
        const hours = parseFloat(updateData.hours);
        if (isNaN(hours) || hours <= 0) {
            throw createBadRequestError("Hours must be a positive number");
        }
        params.push(hours);
        setClauses.push(`effort_amount = $${params.length}`);
    }
    if (updateData.category !== undefined) {
        params.push(String(updateData.category).trim());
        setClauses.push(`category = $${params.length}`);
    }
    if (updateData.notes !== undefined) {
        params.push(updateData.notes ? String(updateData.notes).trim() : null);
        setClauses.push(`description = $${params.length}`);
    }
    if (updateData.requirement_id !== undefined) {
        if (!isNumericId(updateData.requirement_id)) {
            throw createBadRequestError("Invalid requirement ID");
        }
        params.push(Number(updateData.requirement_id));
        setClauses.push(`requirement_id = $${params.length}`);
    }
    if (updateData.date !== undefined) {
        const d = new Date(updateData.date);
        if (isNaN(d.getTime())) throw createBadRequestError("Invalid date");
        params.push(d.toISOString().slice(0, 10));
        setClauses.push(`entry_date = $${params.length}`);
    }
    if (updateData.week_of !== undefined) {
        const d = new Date(updateData.week_of);
        if (isNaN(d.getTime())) throw createBadRequestError("Invalid week-of date");
        params.push(d.toISOString().slice(0, 10));
        setClauses.push(`week_of = $${params.length}`);
    }

    if (setClauses.length === 0) {
        return getEntryById(userId, entryIdNum);
    }

    params.push(userId);
    setClauses.push(`updated_by = $${params.length}`);
    params.push(entryIdNum);

    await db.query(`UPDATE effort_entries SET ${setClauses.join(", ")} WHERE id = $${params.length}`, params);

    return getEntryById(userId, entryIdNum);
}

async function deleteEntry(userId, entryId) {
    if (!isNumericId(entryId)) {
        throw createBadRequestError("Invalid effort entry ID");
    }
    const entryIdNum = Number(entryId);
    const result = await db.query(`UPDATE effort_entries SET archived = TRUE, archived_at = now(), archived_by = $1 WHERE id = $2 AND archived = FALSE RETURNING id`, [userId, entryIdNum]);
    return result.rows.length > 0;
}

async function exportCSV(userId, options = {}) {
    const entries = await listEntries(userId, { ...options, limit: 5000, offset: 0 });
    const header = "ID,Date,Week Of,Mode,Requirement,Category,Hours,User,Notes\n";
    const rows = entries.map((e) => {
        const escapedNotes = e.description ? `"${String(e.description).replace(/"/g, '""')}"` : "";
        const date = e.entry_date ? new Date(e.entry_date).toISOString().slice(0, 10) : "";
        const weekOf = e.week_of ? new Date(e.week_of).toISOString().slice(0, 10) : "";
        return `${e.id},${date},${weekOf},${e.effort_mode},${e.requirement_code || ""},${e.category || ""},${e.effort_amount},${e.user_name},${escapedNotes}`;
    });
    return header + rows.join("\n");
}

async function getTeamMembers() {
    const result = await db.query(`SELECT id, first_name || ' ' || last_name AS name FROM users WHERE role != 'none' ORDER BY first_name ASC`);
    return result.rows;
}

module.exports = {
    getCategories,
    listEntries,
    getRecentEntries,
    getSummary,
    getEntryById,
    createEntry,
    updateEntry,
    deleteEntry,
    exportCSV,
    getTeamMembers,
};
