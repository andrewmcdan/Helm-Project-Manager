const db = require("../db/db");
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");

function isNumericId(value) {
    if (typeof value === "number") return Number.isInteger(value);
    if (typeof value === "string") return /^\d+$/.test(value.trim());
    return false;
}

const FILTER_FIELD_MAP = {
    risk_id: { column: "r.id", type: "numeric" },
    risk_code: { column: "r.risk_code", type: "text" },
    title: { column: "r.risk_title", type: "text" },
    description: { column: "r.risk_description", type: "text" },
    likelihood: { column: "r.risk_likelihood", type: "text" },
    impact: { column: "r.risk_impact", type: "text" },
    status: { column: "r.risk_status", type: "text" },
    owner_id: { column: "r.owner_id", type: "numeric" },
    created_at: { column: "r.created_at", type: "date" },
    updated_at: { column: "r.updated_at", type: "date" },
};

const SORT_FIELD_MAP = {
    risk_code: { column: "r.risk_code" },
    title: { column: "r.risk_title" },
    likelihood: { column: "r.risk_likelihood" },
    impact: { column: "r.risk_impact" },
    status: { column: "r.risk_status" },
    owner: { column: "owner_name" },
    created_at: { column: "r.created_at" },
    updated_at: { column: "r.updated_at" },
};

const VALID_LIKELIHOODS = ["Low", "Medium", "High", "Critical"];
const VALID_IMPACTS = ["Low", "Medium", "High", "Critical"];
const VALID_STATUSES = ["Identified", "Analyzed", "Mitigated", "Closed"];
const VALID_UPDATE_TYPES = ["Status Change", "Mitigation Update", "Owner Change", "General Update"];

function createBadRequestError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeLikelihood(value) {
    if (!value) return null;
    const n = value.toString().trim().toLowerCase();
    if (n === "low") return "Low";
    if (n === "medium") return "Medium";
    if (n === "high") return "High";
    if (n === "critical") return "Critical";
    return value.toString().trim();
}

function normalizeImpact(value) {
    if (!value) return null;
    const n = value.toString().trim().toLowerCase();
    if (n === "low") return "Low";
    if (n === "medium") return "Medium";
    if (n === "high") return "High";
    if (n === "critical") return "Critical";
    return value.toString().trim();
}

function normalizeStatus(value) {
    if (!value) return "Identified";
    const n = value.toString().trim().toLowerCase();
    if (n === "identified") return "Identified";
    if (n === "analyzed") return "Analyzed";
    if (n === "mitigated") return "Mitigated";
    if (n === "closed") return "Closed";
    return value.toString().trim();
}

function mapCountRows(rows, keyField = "count_key", valueField = "count_value") {
    return rows.reduce((acc, row) => {
        acc[row[keyField]] = Number(row[valueField]);
        return acc;
    }, {});
}

function buildMultiFilterClause(filters, queryParams) {
    let clause = "";
    if (!filters) return { clause, queryParams };

    const searchValue = filters.search ? String(filters.search).trim() : "";
    if (searchValue) {
        queryParams.push(`%${searchValue}%`);
        const idx = queryParams.length;
        clause += ` AND (r.risk_title ILIKE $${idx} OR r.risk_code ILIKE $${idx} OR r.risk_description ILIKE $${idx}) `;
    }
    if (filters.status) {
        queryParams.push(String(filters.status).trim());
        clause += ` AND r.risk_status ILIKE $${queryParams.length} `;
    }
    if (filters.likelihood) {
        queryParams.push(String(filters.likelihood).trim());
        clause += ` AND r.risk_likelihood ILIKE $${queryParams.length} `;
    }
    if (filters.impact) {
        queryParams.push(String(filters.impact).trim());
        clause += ` AND r.risk_impact ILIKE $${queryParams.length} `;
    }
    return { clause, queryParams };
}

function buildSortClause(sortField, sortOrder) {
    if (!sortField || !(sortField in SORT_FIELD_MAP)) return "";
    const { column } = SORT_FIELD_MAP[sortField];
    const order = sortOrder && sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
    return ` ORDER BY ${column} ${order} `;
}

const BASE_SELECT = `
    SELECT
        r.id, r.risk_code, r.risk_title, r.risk_description,
        r.risk_likelihood, r.risk_impact, r.risk_status,
        r.owner_id, r.mitigation_plan,
        r.created_at, r.updated_at, r.created_by, r.updated_by,
        COALESCE(u.first_name || ' ' || u.last_name, '') AS owner_name
    FROM risks r
    LEFT JOIN users u ON u.id = r.owner_id
`;

async function listRisks(userId, token, offset = 0, count = 10, options = {}) {
    let queryParams = [];
    let filterClause = "";
    const multiFilter = buildMultiFilterClause(options, queryParams);
    filterClause += multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const sortClause = buildSortClause(options.sortField, options.sortOrder) || " ORDER BY r.updated_at DESC ";
    queryParams.push(count);
    queryParams.push(offset);
    const query = `
        ${BASE_SELECT}
        WHERE r.archived = FALSE
        ${filterClause}
        ${sortClause}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    const result = await db.query(query, queryParams);
    return result.rows;
}

async function countRisks(userId, token, options = {}) {
    let queryParams = [];
    let filterClause = "";
    const multiFilter = buildMultiFilterClause(options, queryParams);
    filterClause += multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const query = `
        SELECT COUNT(*) AS total
        FROM risks r
        WHERE r.archived = FALSE
        ${filterClause}
    `;
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0].total, 10);
}

async function getRisksSummary() {
    const [totalResult, statusResult, likelihoodResult, impactResult] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total FROM risks WHERE archived = FALSE`),
        db.query(`
            SELECT risk_status AS count_key, COUNT(*)::int AS count_value
            FROM risks WHERE archived = FALSE
            GROUP BY risk_status ORDER BY risk_status ASC
        `),
        db.query(`
            SELECT risk_likelihood AS count_key, COUNT(*)::int AS count_value
            FROM risks WHERE archived = FALSE
            GROUP BY risk_likelihood ORDER BY risk_likelihood ASC
        `),
        db.query(`
            SELECT risk_impact AS count_key, COUNT(*)::int AS count_value
            FROM risks WHERE archived = FALSE
            GROUP BY risk_impact ORDER BY risk_impact ASC
        `),
    ]);
    return {
        total_risks: Number(totalResult.rows[0]?.total || 0),
        risks_by_status: mapCountRows(statusResult.rows),
        risks_by_likelihood: mapCountRows(likelihoodResult.rows),
        risks_by_impact: mapCountRows(impactResult.rows),
    };
}

async function createRisk(userId, riskData) {
    const riskTitle = String(riskData.risk_title || "").trim();
    if (!riskTitle) throw createBadRequestError("Risk title is required.");

    const riskCode = String(riskData.risk_code || "")
        .trim()
        .toUpperCase();
    if (!riskCode) throw createBadRequestError("Risk code is required.");

    const likelihood = normalizeLikelihood(riskData.risk_likelihood);
    if (!VALID_LIKELIHOODS.includes(likelihood)) {
        throw createBadRequestError(`Invalid likelihood. Allowed: ${VALID_LIKELIHOODS.join(", ")}`);
    }
    const impact = normalizeImpact(riskData.risk_impact);
    if (!VALID_IMPACTS.includes(impact)) {
        throw createBadRequestError(`Invalid impact. Allowed: ${VALID_IMPACTS.join(", ")}`);
    }
    const status = normalizeStatus(riskData.risk_status);
    if (!VALID_STATUSES.includes(status)) {
        throw createBadRequestError(`Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`);
    }

    const ownerId = riskData.owner_id && isNumericId(riskData.owner_id) ? Number(riskData.owner_id) : null;
    const description = riskData.risk_description ? String(riskData.risk_description).trim() : null;
    const mitigationPlan = riskData.mitigation_plan ? String(riskData.mitigation_plan).trim() : null;

    const query = `
        INSERT INTO risks (risk_code, risk_title, risk_description, risk_likelihood, risk_impact, risk_status, owner_id, mitigation_plan, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
        RETURNING id
    `;
    const result = await db.query(query, [riskCode, riskTitle, description, likelihood, impact, status, ownerId, mitigationPlan, userId]);
    return getRiskById(result.rows[0].id);
}

async function getRiskById(riskId) {
    if (!isNumericId(riskId)) throw createBadRequestError("Invalid risk ID");
    const query = `
        ${BASE_SELECT}
        WHERE r.id = $1 AND r.archived = FALSE
        LIMIT 1
    `;
    const result = await db.query(query, [Number(riskId)]);
    return result.rows.length > 0 ? result.rows[0] : null;
}

async function updateRisk(userId, riskId, updateData) {
    if (!isNumericId(riskId)) throw createBadRequestError("Invalid risk ID");
    const riskIdNum = Number(riskId);
    const payload = updateData && typeof updateData === "object" ? updateData : {};

    const existing = await db.query(`SELECT id FROM risks WHERE id = $1 AND archived = FALSE LIMIT 1`, [riskIdNum]);
    if (existing.rows.length === 0) return null;

    const updateClauses = [];
    const updateParams = [];

    if (hasOwn(payload, "risk_title")) {
        const title = String(payload.risk_title || "").trim();
        if (!title) throw createBadRequestError("Risk title cannot be empty.");
        updateParams.push(title);
        updateClauses.push(`risk_title = $${updateParams.length}`);
    }
    if (hasOwn(payload, "risk_code")) {
        const code = String(payload.risk_code || "")
            .trim()
            .toUpperCase();
        if (!code) throw createBadRequestError("Risk code cannot be empty.");
        updateParams.push(code);
        updateClauses.push(`risk_code = $${updateParams.length}`);
    }
    if (hasOwn(payload, "risk_description")) {
        updateParams.push(payload.risk_description ? String(payload.risk_description).trim() : null);
        updateClauses.push(`risk_description = $${updateParams.length}`);
    }
    if (hasOwn(payload, "risk_likelihood")) {
        const likelihood = normalizeLikelihood(payload.risk_likelihood);
        if (!VALID_LIKELIHOODS.includes(likelihood)) {
            throw createBadRequestError(`Invalid likelihood. Allowed: ${VALID_LIKELIHOODS.join(", ")}`);
        }
        updateParams.push(likelihood);
        updateClauses.push(`risk_likelihood = $${updateParams.length}`);
    }
    if (hasOwn(payload, "risk_impact")) {
        const impact = normalizeImpact(payload.risk_impact);
        if (!VALID_IMPACTS.includes(impact)) {
            throw createBadRequestError(`Invalid impact. Allowed: ${VALID_IMPACTS.join(", ")}`);
        }
        updateParams.push(impact);
        updateClauses.push(`risk_impact = $${updateParams.length}`);
    }

    const wantsArchiveByStatus = hasOwn(payload, "risk_status") && String(payload.risk_status).trim().toLowerCase() === "archived";
    const wantsArchiveByFlag = hasOwn(payload, "archived") && (payload.archived === true || payload.archived === "true");
    let isArchiving = wantsArchiveByStatus || wantsArchiveByFlag;

    if (wantsArchiveByStatus) {
        updateParams.push(userId);
        updateClauses.push("archived = TRUE");
        updateClauses.push("archived_at = now()");
        updateClauses.push(`archived_by = $${updateParams.length}`);
    } else if (hasOwn(payload, "risk_status")) {
        const status = normalizeStatus(payload.risk_status);
        if (!VALID_STATUSES.includes(status)) {
            throw createBadRequestError(`Invalid status. Allowed: ${VALID_STATUSES.join(", ")}`);
        }
        updateParams.push(status);
        updateClauses.push(`risk_status = $${updateParams.length}`);
    }

    if (hasOwn(payload, "archived") && !wantsArchiveByStatus) {
        if (wantsArchiveByFlag) {
            updateParams.push(userId);
            updateClauses.push("archived = TRUE");
            updateClauses.push("archived_at = now()");
            updateClauses.push(`archived_by = $${updateParams.length}`);
        } else {
            updateClauses.push("archived = FALSE");
            updateClauses.push("archived_at = NULL");
            updateClauses.push("archived_by = NULL");
        }
        isArchiving = wantsArchiveByFlag;
    }

    if (hasOwn(payload, "owner_id")) {
        if (payload.owner_id && isNumericId(payload.owner_id)) {
            updateParams.push(Number(payload.owner_id));
            updateClauses.push(`owner_id = $${updateParams.length}`);
        } else {
            updateClauses.push("owner_id = NULL");
        }
    }
    if (hasOwn(payload, "mitigation_plan")) {
        updateParams.push(payload.mitigation_plan ? String(payload.mitigation_plan).trim() : null);
        updateClauses.push(`mitigation_plan = $${updateParams.length}`);
    }

    if (updateClauses.length > 0) {
        updateParams.push(userId);
        updateClauses.push(`updated_by = $${updateParams.length}`);
        updateParams.push(riskIdNum);
        await db.query(`UPDATE risks SET ${updateClauses.join(", ")} WHERE id = $${updateParams.length}`, updateParams);
    }

    if (isArchiving) return { id: riskIdNum, archived: true };
    return getRiskById(riskIdNum);
}

async function getRiskUpdates(riskId, limit = 20, offset = 0) {
    if (!isNumericId(riskId)) throw createBadRequestError("Invalid risk ID");
    const query = `
        SELECT
            ru.id, ru.update_type, ru.status, ru.note, ru.update_date,
            COALESCE(u.first_name || ' ' || u.last_name, '') AS updated_by_name
        FROM risk_updates ru
        LEFT JOIN users u ON u.id = ru.updated_by
        WHERE ru.risk_id = $1
        ORDER BY ru.update_date DESC
        LIMIT $2 OFFSET $3
    `;
    const result = await db.query(query, [Number(riskId), limit, offset]);
    return result.rows;
}

async function createRiskUpdate(userId, riskId, updateData) {
    if (!isNumericId(riskId)) throw createBadRequestError("Invalid risk ID");
    const riskIdNum = Number(riskId);

    const existing = await db.query(`SELECT id FROM risks WHERE id = $1 AND archived = FALSE LIMIT 1`, [riskIdNum]);
    if (existing.rows.length === 0) return null;

    const updateType = String(updateData.update_type || "General Update").trim();
    if (!VALID_UPDATE_TYPES.includes(updateType)) {
        throw createBadRequestError(`Invalid update type. Allowed: ${VALID_UPDATE_TYPES.join(", ")}`);
    }

    const note = updateData.note ? String(updateData.note).trim() : null;
    const status = updateData.status ? normalizeStatus(updateData.status) : null;

    const query = `
        INSERT INTO risk_updates (risk_id, update_type, status, note, updated_by)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, update_type, status, note, update_date
    `;
    const result = await db.query(query, [riskIdNum, updateType, status, note, userId]);
    return result.rows[0];
}

async function getRecentUpdates(limit = 10) {
    const query = `
        SELECT
            ru.id, ru.update_type, ru.status, ru.note, ru.update_date,
            r.risk_code, r.risk_title,
            COALESCE(u.first_name || ' ' || u.last_name, '') AS updated_by_name
        FROM risk_updates ru
        JOIN risks r ON r.id = ru.risk_id
        LEFT JOIN users u ON u.id = ru.updated_by
        WHERE r.archived = FALSE
        ORDER BY ru.update_date DESC
        LIMIT $1
    `;
    const result = await db.query(query, [limit]);
    return result.rows;
}

async function getTeamMembers() {
    const query = `
        SELECT id, first_name, last_name
        FROM users
        WHERE role != 'none'
        ORDER BY first_name ASC, last_name ASC
    `;
    const result = await db.query(query);
    return result.rows;
}

async function exportRisksToCSV(userId, options = {}) {
    let queryParams = [];
    let filterClause = "";
    const multiFilter = buildMultiFilterClause(options, queryParams);
    filterClause += multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const sortClause = buildSortClause(options.sortField, options.sortOrder) || " ORDER BY r.updated_at DESC ";
    const query = `
        ${BASE_SELECT}
        WHERE r.archived = FALSE
        ${filterClause}
        ${sortClause}
    `;
    const result = await db.query(query, queryParams);
    const risks = result.rows;
    const csvHeader = "Risk Code,Title,Description,Likelihood,Impact,Status,Owner,Mitigation Plan,Created,Last Updated\n";
    const csvRows = risks.map((r) => {
        const esc = (v) => (v ? `"${String(v).replace(/"/g, '""')}"` : "");
        return [esc(r.risk_code), esc(r.risk_title), esc(r.risk_description), r.risk_likelihood, r.risk_impact, r.risk_status, esc(r.owner_name), esc(r.mitigation_plan), r.created_at ? new Date(r.created_at).toISOString() : "", r.updated_at ? new Date(r.updated_at).toISOString() : ""].join(",");
    });
    return csvHeader + csvRows.join("\n");
}

module.exports = {
    listRisks,
    countRisks,
    getRisksSummary,
    createRisk,
    getRiskById,
    updateRisk,
    getRiskUpdates,
    createRiskUpdate,
    getRecentUpdates,
    getTeamMembers,
    exportRisksToCSV,
};
