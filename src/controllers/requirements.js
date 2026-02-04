const db = require("../db/db");
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");

function isNumericId(value) {
    if (typeof value === "number") {
        return Number.isInteger(value);
    }
    if (typeof value === "string") {
        return /^\d+$/.test(value.trim());
    }
    return false;
}

const FILTER_FIELD_MAP = {
    requirement_id: { column: "id", type: "numeric" },
    requirement_code: { column: "requirement_code", type: "text" },
    project_id: { column: "project_id", type: "numeric" },
    title: { column: "title", type: "text" },
    desc: { column: "description", type: "text" },
    type: { column: "requirement_type", type: "text" },
    priority: { column: "priority", type: "text" },
    status: { column: "status", type: "text" },
    created_at: { column: "created_at", type: "date" },
    updated_at: { column: "updated_at", type: "date" },
    created_by: { column: "created_by", type: "numeric" },
    updated_by: { column: "updated_by", type: "numeric" },
};

const SORT_FIELD_MAP = {
    requirement_code: { column: "requirement_code" },
    type: { column: "requirement_type" },
    priority: { column: "priority" },
    status: { column: "status" },
    created_at: { column: "created_at" },
    updated_at: { column: "updated_at" },
    created_by: { column: "created_by" },
    updated_by: { column: "updated_by" },
};

const normalizeQueryValue = (value) => (Array.isArray(value) ? value[0] : value).toString().trim();

const buildFilterClause = (filterField, filterValue, filterMin, filterMax, queryParams) => {
    if (!filterField || !(filterField in FILTER_FIELD_MAP)) {
        return { clause: "", queryParams };
    }
    const { column, type } = FILTER_FIELD_MAP[filterField];
    let clause = "";
    if (type === "numeric") {
        if (isNumericId(filterValue)) {
            queryParams.push(Number(filterValue));
            clause = ` AND ${column} = $${queryParams.length} `;
        }
    } else if (type === "text") {
        if (filterValue && filterValue.length > 0) {
            queryParams.push(`%${filterValue}%`);
            clause = ` AND ${column} ILIKE $${queryParams.length} `;
        }
    } else if (type === "date") {
        if (filterMin) {
            const dateMin = new Date(filterMin);
            if (!isNaN(dateMin.getTime())) {
                queryParams.push(dateMin.toISOString());
                clause += ` AND ${column} >= $${queryParams.length} `;
            }
        }
        if (filterMax) {
            const dateMax = new Date(filterMax);
            if (!isNaN(dateMax.getTime())) {
                queryParams.push(dateMax.toISOString());
                clause += ` AND ${column} <= $${queryParams.length} `;
            }
        }
    }
    return { clause, queryParams };
};

const buildSortClause = (sortField, sortOrder) => {
    if (!sortField || !(sortField in SORT_FIELD_MAP)) {
        return "";
    }
    const { column } = SORT_FIELD_MAP[sortField];
    const order = sortOrder && sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";
    return ` ORDER BY ${column} ${order} `;
};

async function listRequirements(userId, token, offset = 0, count = 10, options = {}) {
    let queryParams = [];
    let filterClause = "";
    ({ clause: filterClause, queryParams } = buildFilterClause(options.filterField, options.filterValue, options.filterMin, options.filterMax, queryParams));
    const sortClause = buildSortClause(options.sortField, options.sortOrder);
    queryParams.push(count);
    queryParams.push(offset);
    const query = `
        SELECT id, requirement_code, project_id, title, description, requirement_type, priority, status, created_at, updated_at, created_by, updated_by
        FROM requirements
        WHERE 1=1
        ${filterClause}
        ${sortClause}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    log("debug", "Listing requirements", { userId, offset, count, query, queryParams }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    return result.rows;
}

async function countRequirements(userId, token, options = {}) {
    let queryParams = [];
    let filterClause = "";
    ({ clause: filterClause, queryParams } = buildFilterClause(options.filterField, options.filterValue, options.filterMin, options.filterMax, queryParams));
    const query = `
        SELECT COUNT(*) AS total
        FROM requirements
        WHERE 1=1
        ${filterClause}
    `;
    log("debug", "Counting requirements", { userId, query, queryParams }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0].total, 10);
}

async function getRequirementsSummary(userId, token) {
    // TODO: Implement the logic to get requirements summary
}

async function createRequirement(userId, token, requirementData) {
    // TODO: Implement the logic to create a new requirement
}

async function getRequirementById(userId, token, requirementId) {
    // TODO: Implement the logic to get a requirement by ID
}

async function updateRequirement(userId, token, requirementId, updateData) {
    // TODO: Implement the logic to update a requirement
}

async function getRequirementTotals(userId, token, requirementId) {
    // TODO: Implement the logic to get requirement totals
}

async function exportRequirementsToCSV(userId, token, options = {}) {
    // TODO: Implement the logic to export requirements to CSV
}

module.exports = {
    listRequirements,
    countRequirements,
    getRequirementsSummary,
    createRequirement,
    getRequirementById,
    updateRequirement,
    getRequirementTotals,
    exportRequirementsToCSV,
};