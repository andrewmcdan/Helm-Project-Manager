const db = require("../db/db");
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");

const VALID_STATUSES = ["Planning", "Active", "Stabilizing", "Complete", "Archived"];
const VALID_EFFORT_MODES = ["Hourly", "Daily", "Weekly"];
const VALID_WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function createBadRequestError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

async function getSettings() {
    const result = await db.query(`
        SELECT
            ps.id, ps.project_name, ps.project_owner_name, ps.project_description,
            ps.project_owner_email, ps.project_status,
            ps.effort_default_mode, ps.week_start_day, ps.effort_rounding,
            ps.created_at, ps.updated_at,
            u.first_name || ' ' || u.last_name AS updated_by_name
        FROM project_settings ps
        LEFT JOIN users u ON u.id = ps.updated_by
        WHERE ps.archived = FALSE
        ORDER BY ps.updated_at DESC
        LIMIT 1
    `);
    if (result.rows.length === 0) return null;

    const row = result.rows[0];

    const teamResult = await db.query(`SELECT COUNT(*)::int AS team_size FROM project_team_members WHERE project_settings_id = $1`, [row.id]);

    return {
        id: row.id,
        project_name: row.project_name,
        project_owner_name: row.project_owner_name || "",
        project_description: row.project_description || "",
        project_owner_email: row.project_owner_email || "",
        project_status: row.project_status,
        effort_default_mode: row.effort_default_mode,
        week_start_day: row.week_start_day,
        effort_rounding: Number(row.effort_rounding),
        created_at: row.created_at,
        updated_at: row.updated_at,
        updated_by_name: row.updated_by_name || null,
        team_size: teamResult.rows[0]?.team_size || 0,
    };
}

async function updateSettings(userId, data) {
    const current = await getSettings();
    if (!current) {
        throw createBadRequestError("No project settings found to update");
    }

    const setClauses = [];
    const params = [];
    const changes = {};

    if (data.project_name !== undefined) {
        const val = String(data.project_name).trim();
        if (!val) throw createBadRequestError("Project name cannot be empty");
        if (val !== current.project_name) {
            changes.project_name = { from: current.project_name, to: val };
            params.push(val);
            setClauses.push(`project_name = $${params.length}`);
        }
    }

    if (data.project_owner_name !== undefined) {
        const val = String(data.project_owner_name).trim();
        if (val !== current.project_owner_name) {
            changes.project_owner_name = { from: current.project_owner_name, to: val };
            params.push(val);
            setClauses.push(`project_owner_name = $${params.length}`);
        }
    }

    if (data.project_description !== undefined) {
        const val = String(data.project_description).trim();
        if (val !== current.project_description) {
            changes.project_description = { from: current.project_description, to: val };
            params.push(val);
            setClauses.push(`project_description = $${params.length}`);
        }
    }

    if (data.project_owner_email !== undefined) {
        const val = String(data.project_owner_email).trim();
        if (val !== current.project_owner_email) {
            changes.project_owner_email = { from: current.project_owner_email, to: val };
            params.push(val);
            setClauses.push(`project_owner_email = $${params.length}`);
        }
    }

    if (data.project_status !== undefined) {
        const val = String(data.project_status).trim();
        if (!VALID_STATUSES.includes(val)) {
            throw createBadRequestError(`Invalid project status. Allowed: ${VALID_STATUSES.join(", ")}`);
        }
        if (val !== current.project_status) {
            changes.project_status = { from: current.project_status, to: val };
            params.push(val);
            setClauses.push(`project_status = $${params.length}`);
        }
    }

    if (data.effort_default_mode !== undefined) {
        const val = String(data.effort_default_mode).trim();
        if (!VALID_EFFORT_MODES.includes(val)) {
            throw createBadRequestError(`Invalid effort mode. Allowed: ${VALID_EFFORT_MODES.join(", ")}`);
        }
        if (val !== current.effort_default_mode) {
            changes.effort_default_mode = { from: current.effort_default_mode, to: val };
            params.push(val);
            setClauses.push(`effort_default_mode = $${params.length}`);
        }
    }

    if (data.week_start_day !== undefined) {
        const val = String(data.week_start_day).trim();
        if (!VALID_WEEK_DAYS.includes(val)) {
            throw createBadRequestError(`Invalid week start day. Allowed: ${VALID_WEEK_DAYS.join(", ")}`);
        }
        if (val !== current.week_start_day) {
            changes.week_start_day = { from: current.week_start_day, to: val };
            params.push(val);
            setClauses.push(`week_start_day = $${params.length}`);
        }
    }

    if (data.effort_rounding !== undefined) {
        const val = parseFloat(data.effort_rounding);
        if (isNaN(val) || val <= 0) {
            throw createBadRequestError("Effort rounding must be a positive number");
        }
        if (val !== current.effort_rounding) {
            changes.effort_rounding = { from: current.effort_rounding, to: val };
            params.push(val);
            setClauses.push(`effort_rounding = $${params.length}`);
        }
    }

    if (setClauses.length === 0) {
        return { settings: current, changesApplied: false };
    }

    params.push(userId);
    setClauses.push(`updated_by = $${params.length}`);
    params.push(current.id);

    await db.query(`UPDATE project_settings SET ${setClauses.join(", ")} WHERE id = $${params.length}`, params);

    // Build human-readable description
    const changeKeys = Object.keys(changes);
    const description = changeKeys
        .map((key) => {
            const label = key.replace(/_/g, " ");
            return `Changed ${label} from "${changes[key].from}" to "${changes[key].to}"`;
        })
        .join("; ");

    await db.query(
        `INSERT INTO project_settings_change_log (project_settings_id, changed_by, change_description, changes)
         VALUES ($1, $2, $3, $4)`,
        [current.id, userId, description, JSON.stringify(changes)],
    );

    log("info", `Project settings updated by user ${userId}: ${description}`, { userId, changes }, getCallerInfo(), userId);

    const updated = await getSettings();
    return { settings: updated, changesApplied: true };
}

async function getChangeLog(projectId, limit = 20, offset = 0) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safeOffset = Math.max(parseInt(offset, 10) || 0, 0);

    const result = await db.query(
        `SELECT
            cl.id, cl.changed_at, cl.change_description, cl.changes,
            u.first_name || ' ' || u.last_name AS changed_by_name
        FROM project_settings_change_log cl
        LEFT JOIN users u ON u.id = cl.changed_by
        WHERE cl.project_settings_id = $1
        ORDER BY cl.changed_at DESC
        LIMIT $2 OFFSET $3`,
        [projectId, safeLimit, safeOffset],
    );

    return result.rows.map((row) => ({
        id: row.id,
        changed_at: row.changed_at,
        change_description: row.change_description,
        changes: row.changes,
        changed_by_name: row.changed_by_name || "Unknown",
    }));
}

module.exports = {
    getSettings,
    updateSettings,
    getChangeLog,
};
