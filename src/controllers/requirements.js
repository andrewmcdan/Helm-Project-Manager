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
    requirement_code_prefix: { column: "requirement_code_prefix", type: "text" },
    requirement_code_number: { column: "requirement_code_number", type: "numeric" },
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
    requirement_code_prefix: { column: "requirement_code_prefix" },
    requirement_code_number: { column: "requirement_code_number" },
    project_id: { column: "project_id" },
    title: { column: "title" },
    type: { column: "requirement_type" },
    priority: { column: "priority" },
    status: { column: "status" },
    created_at: { column: "created_at" },
    updated_at: { column: "updated_at" },
    created_by: { column: "created_by" },
    updated_by: { column: "updated_by" },
};

const VALID_REQUIREMENT_TYPES = ["Functional", "Non-functional"];
const VALID_REQUIREMENT_PRIORITIES = ["Low", "Medium", "High", "Critical"];
const VALID_REQUIREMENT_STATUSES = ["Proposed", "Approved", "In Development", "Completed", "Rejected"];

function createBadRequestError(message) {
    const error = new Error(message);
    error.statusCode = 400;
    return error;
}

function hasOwn(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeRequirementType(value) {
    if (!value) return null;
    const normalized = value.toString().trim().toLowerCase();
    if (normalized === "functional") return "Functional";
    if (normalized === "non-functional" || normalized === "non functional" || normalized === "nonfunctional") {
        return "Non-functional";
    }
    return value.toString().trim();
}

function normalizePriority(value) {
    if (!value) return null;
    const normalized = value.toString().trim().toLowerCase();
    if (normalized === "low") return "Low";
    if (normalized === "medium") return "Medium";
    if (normalized === "high") return "High";
    if (normalized === "critical") return "Critical";
    return value.toString().trim();
}

function normalizeStatus(value) {
    if (!value) return "Proposed";
    const normalized = value.toString().trim().toLowerCase();
    if (normalized === "proposed") return "Proposed";
    if (normalized === "approved") return "Approved";
    if (normalized === "in development" || normalized === "in-development" || normalized === "indevelopment" || normalized === "in progress") {
        return "In Development";
    }
    if (normalized === "completed" || normalized === "done") return "Completed";
    if (normalized === "rejected" || normalized === "deferred") return "Rejected";
    return value.toString().trim();
}

function normalizeTags(tags) {
    if (!tags) return [];
    if (Array.isArray(tags)) {
        return tags.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0);
    }
    return String(tags)
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0);
}

function mapCountRows(rows, keyField = "count_key", valueField = "count_value") {
    return rows.reduce((acc, row) => {
        acc[row[keyField]] = Number(row[valueField]);
        return acc;
    }, {});
}

function parseRequirementCode(rawCode) {
    const requirementCode = String(rawCode || "").trim().toUpperCase();
    if (!requirementCode) {
        throw createBadRequestError("Requirement code cannot be empty.");
    }
    const parts = requirementCode.split("-");
    if (parts.length > 2) {
        throw createBadRequestError("Invalid requirement code format. Use PREFIX or PREFIX-NUMBER.");
    }
    const prefix = parts[0]?.trim();
    if (!prefix) {
        throw createBadRequestError("Requirement code prefix is required.");
    }
    if (parts.length === 1) {
        return { prefix, number: null };
    }
    const parsedNumber = Number(parts[1]);
    if (!Number.isInteger(parsedNumber) || parsedNumber <= 0) {
        throw createBadRequestError("Requirement code number must be a positive integer.");
    }
    return { prefix, number: parsedNumber };
}

async function getNextRequirementCodeNumber(prefix, excludeRequirementId = null) {
    const queryParams = [prefix];
    let whereExtra = "";
    if (excludeRequirementId && isNumericId(excludeRequirementId)) {
        queryParams.push(Number(excludeRequirementId));
        whereExtra = ` AND id <> $${queryParams.length} `;
    }
    const query = `SELECT COALESCE(MAX(requirement_code_number), 0) AS max_number FROM requirements WHERE requirement_code_prefix = $1 ${whereExtra}`;
    const result = await db.query(query, queryParams);
    return Number(result.rows[0]?.max_number || 0) + 1;
}

async function getRequirementTagsMap(requirementIds = []) {
    if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
        return new Map();
    }
    const query = `
        SELECT rtj.requirement_id, rt.tag
        FROM requirements_tags_junction rtj
        JOIN requirements_tags rt ON rt.id = rtj.tag_id
        WHERE rtj.requirement_id = ANY($1)
        ORDER BY rt.tag ASC
    `;
    const result = await db.query(query, [requirementIds]);
    const tagsMap = new Map();
    for (const row of result.rows) {
        if (!tagsMap.has(row.requirement_id)) {
            tagsMap.set(row.requirement_id, []);
        }
        tagsMap.get(row.requirement_id).push(row.tag);
    }
    return tagsMap;
}

async function getRequirementEffortMap(requirementIds = []) {
    if (!Array.isArray(requirementIds) || requirementIds.length === 0) {
        return new Map();
    }
    const query = `
        SELECT
            requirement_id,
            COALESCE(SUM(effort_amount), 0) AS total_effort,
            MAX(COALESCE(entry_date::timestamptz, week_of::timestamptz, created_at)) AS last_effort_date,
            COUNT(*)::int AS total_effort_entries
        FROM effort_entries
        WHERE archived = FALSE
          AND requirement_id = ANY($1)
        GROUP BY requirement_id
    `;
    const result = await db.query(query, [requirementIds]);
    const effortMap = new Map();
    for (const row of result.rows) {
        effortMap.set(row.requirement_id, {
            total_effort: Number(row.total_effort || 0),
            last_effort_date: row.last_effort_date || null,
            total_effort_entries: Number(row.total_effort_entries || 0),
        });
    }
    return effortMap;
}

async function hydrateRequirements(requirements = []) {
    if (!Array.isArray(requirements) || requirements.length === 0) {
        return [];
    }
    const requirementIds = requirements.map((item) => item.id);
    const [tagsMap, effortMap] = await Promise.all([getRequirementTagsMap(requirementIds), getRequirementEffortMap(requirementIds)]);
    return requirements.map((requirement) => {
        const effort = effortMap.get(requirement.id) || { total_effort: 0, last_effort_date: null, total_effort_entries: 0 };
        return {
            ...requirement,
            tags: tagsMap.get(requirement.id) || [],
            total_effort: effort.total_effort,
            last_effort_date: effort.last_effort_date,
            total_effort_entries: effort.total_effort_entries,
        };
    });
}

const getCurrentProjectId = async () => {
    // Look up the most recently updated active, non-archived project settings record.
    const query = `
        SELECT id
        FROM project_settings
        WHERE project_status = 'Active' AND archived = false
        ORDER BY updated_at DESC
        LIMIT 1
    `;
    try {
        const result = await db.query(query);
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        log("error", `Failed to get current project ID: ${error.message}`, {}, getCallerInfo());
        return null;
    }
};

const getAllTags = () => {
    // Look up the tags from the requirements_tags table and return them as an array of strings
    const query = `SELECT tag FROM requirements_tags`;
    return db
        .query(query)
        .then((result) => {
            return result.rows.map((row) => row.tag);
        })
        .catch((error) => {
            log("error", `Failed to get requirement tags: ${error.message}`, {}, getCallerInfo());
            return [];
        });
};

const getTagsFiltered = (filter) => {
    // Look up the tags from the requirements_tags table that start with the filter string and return them as an array of strings
    const query = `SELECT tag FROM requirements_tags WHERE tag ILIKE $1 ORDER BY tag ASC LIMIT 10`;
    return db        .query(query, [`${filter}%`])
        .then((result) => {
            return result.rows.map((row) => row.tag);
        })
        .catch((error) => {
            log("error", `Failed to get filtered requirement tags with filter "${filter}": ${error.message}`, { filter }, getCallerInfo());
            return [];
        });
};

const getTagsForProjectById = (projectId) => {
    // Look up the tags from the requirements_tags_project_settings_junction table for the given project ID and return them as an array of strings
    const query = `SELECT rt.tag FROM requirements_tags rt
        JOIN requirements_tags_project_settings_junction rtpj ON rt.id = rtpj.tag_id
        JOIN project_settings ps ON rtpj.project_settings_id = ps.id
        WHERE ps.id = $1`;
    return db
        .query(query, [projectId])
        .then((result) => {
            return result.rows.map((row) => row.tag);
        })
        .catch((error) => {
            log("error", `Failed to get requirement tags for project ${projectId}: ${error.message}`, { projectId }, getCallerInfo());
            return [];
        });
};

const addTagToRequirement = (requirementId, tag) => {
    // Add a tag to the requirements_tags table if it doesn't already exist, then link it to the requirement.
    const normalizedTag = String(tag).trim().toLowerCase();
    if (!normalizedTag) {
        return Promise.resolve();
    }
    const insertTagQuery = `INSERT INTO requirements_tags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag RETURNING id`;
    return db
        .query(insertTagQuery, [normalizedTag])
        .then((result) => {
            const tagId = result.rows[0].id;
            const insertJunctionQuery = `INSERT INTO requirements_tags_junction (requirement_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
            return db.query(insertJunctionQuery, [requirementId, tagId]);
        })
        .catch((error) => {
            log("error", `Failed to add tag "${normalizedTag}" to requirement ${requirementId}: ${error.message}`, { requirementId, tag: normalizedTag }, getCallerInfo());
        });
};

const addTagToProject = (projectId, tag) => {
    // Add a tag to the requirements_tags_project_settings_junction table for the given project ID.
    const normalizedTag = String(tag).trim().toLowerCase();
    if (!normalizedTag) {
        return Promise.resolve();
    }
    const insertTagQuery = `INSERT INTO requirements_tags (tag) VALUES ($1) ON CONFLICT (tag) DO UPDATE SET tag = EXCLUDED.tag RETURNING id`;
    return db
        .query(insertTagQuery, [normalizedTag])
        .then((result) => {
            const tagId = result.rows[0].id;
            const insertJunctionQuery = `INSERT INTO requirements_tags_project_settings_junction (project_settings_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`;
            return db.query(insertJunctionQuery, [projectId, tagId]);
        })
        .catch((error) => {
            log("error", `Failed to add tag "${normalizedTag}" to project ${projectId}: ${error.message}`, { projectId, tag: normalizedTag }, getCallerInfo()); 
        });
};

const getTagsForRequirementById = (requirementId) => {
    // Look up the tags from the requirements_tags_junction table for the given requirement ID and return them as an array of strings
    const query = `SELECT rt.tag FROM requirements_tags rt
        JOIN requirements_tags_junction rtj ON rt.id = rtj.tag_id
        WHERE rtj.requirement_id = $1`;
    return db
        .query(query, [requirementId])
        .then((result) => {
            return result.rows.map((row) => row.tag);
        })
        .catch((error) => {
            log("error", `Failed to get requirement tags for requirement ${requirementId}: ${error.message}`, { requirementId }, getCallerInfo());
            return [];
        });
};

const getReqCodePrefixes = async (filter) => {
    const query = (filter && filter.length > 0)
        ? `SELECT DISTINCT requirement_code_prefix FROM requirements WHERE requirement_code_prefix ILIKE $1 ORDER BY requirement_code_prefix ASC LIMIT 20`
        : `SELECT DISTINCT requirement_code_prefix FROM requirements ORDER BY requirement_code_prefix ASC LIMIT 20`;
    try {
        const result = await db.query(query);
        return result.rows.map((row) => row.requirement_code_prefix);
    } catch (error) {
        log("error", `Failed to get requirement code prefixes: ${error.message}`, {}, getCallerInfo());
        return [];
    }
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

const buildMultiFilterClause = (filters, queryParams) => {
    let clause = "";
    if (!filters) {
        return { clause, queryParams };
    }
    const searchValue = filters.search ? String(filters.search).trim() : "";
    if (searchValue) {
        queryParams.push(`%${searchValue}%`);
        const likeIdx = queryParams.length;
        const searchTerms = [
            `title ILIKE $${likeIdx}`,
            `requirement_code_prefix ILIKE $${likeIdx}`,
            `requirement_code_number::text ILIKE $${likeIdx}`,
            `id::text ILIKE $${likeIdx}`,
        ];
        const codeMatch = searchValue.match(/^([a-zA-Z0-9]+)[-_ ]+(\d+)$/);
        if (codeMatch) {
            queryParams.push(codeMatch[1]);
            const prefixIdx = queryParams.length;
            queryParams.push(Number(codeMatch[2]));
            const numberIdx = queryParams.length;
            searchTerms.push(`(requirement_code_prefix ILIKE $${prefixIdx} AND requirement_code_number = $${numberIdx})`);
        }
        clause += ` AND (${searchTerms.join(" OR ")}) `;
    }
    if (filters.type) {
        queryParams.push(String(filters.type).trim());
        clause += ` AND requirement_type ILIKE $${queryParams.length} `;
    }
    if (filters.status) {
        queryParams.push(String(filters.status).trim());
        clause += ` AND status ILIKE $${queryParams.length} `;
    }
    if (filters.priority) {
        queryParams.push(String(filters.priority).trim());
        clause += ` AND priority ILIKE $${queryParams.length} `;
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
    const multiFilter = buildMultiFilterClause(options, queryParams);
    filterClause += multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const sortClause = buildSortClause(options.sortField, options.sortOrder);
    queryParams.push(count);
    queryParams.push(offset);
    const query = `
        SELECT id, requirement_code_prefix, requirement_code_number, project_id, title, description, requirement_type, priority, status, created_at, updated_at, created_by, updated_by
        FROM requirements
        WHERE archived = FALSE
        ${filterClause}
        ${sortClause}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    log("debug", "Listing requirements", { userId, offset, count }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    return hydrateRequirements(result.rows);
}

async function countRequirements(userId, token, options = {}) {
    let queryParams = [];
    let filterClause = "";
    ({ clause: filterClause, queryParams } = buildFilterClause(options.filterField, options.filterValue, options.filterMin, options.filterMax, queryParams));
    const multiFilter = buildMultiFilterClause(options, queryParams);
    filterClause += multiFilter.clause;
    queryParams = multiFilter.queryParams;
    const query = `
        SELECT COUNT(*) AS total
        FROM requirements
        WHERE archived = FALSE
        ${filterClause}
    `;
    log("debug", "Counting requirements", { userId, query, queryParams }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    return parseInt(result.rows[0].total, 10);
}

async function getRequirementsSummary(userId, token) {
    const [totalResult, statusResult, priorityResult, typeResult] = await Promise.all([
        db.query(`SELECT COUNT(*)::int AS total FROM requirements WHERE archived = FALSE`),
        db.query(`
            SELECT status AS count_key, COUNT(*)::int AS count_value
            FROM requirements
            WHERE archived = FALSE
            GROUP BY status
            ORDER BY status ASC
        `),
        db.query(`
            SELECT priority AS count_key, COUNT(*)::int AS count_value
            FROM requirements
            WHERE archived = FALSE
            GROUP BY priority
            ORDER BY priority ASC
        `),
        db.query(`
            SELECT requirement_type AS count_key, COUNT(*)::int AS count_value
            FROM requirements
            WHERE archived = FALSE
            GROUP BY requirement_type
            ORDER BY requirement_type ASC
        `),
    ]);
    return {
        total_requirements: Number(totalResult.rows[0]?.total || 0),
        requirements_by_status: mapCountRows(statusResult.rows),
        requirements_by_priority: mapCountRows(priorityResult.rows),
        requirements_by_type: mapCountRows(typeResult.rows),
    };
}

async function createRequirement(userId, token, requirementData) {
    let queryParams = [];
    const requirementType = normalizeRequirementType(requirementData.requirement_type);
    const requirementPriority = normalizePriority(requirementData.priority);
    const requirementStatus = normalizeStatus(requirementData.status);
    if (!VALID_REQUIREMENT_TYPES.includes(requirementType)) {
        throw createBadRequestError(`Invalid requirement type. Allowed values: ${VALID_REQUIREMENT_TYPES.join(", ")}`);
    }
    if (!VALID_REQUIREMENT_PRIORITIES.includes(requirementPriority)) {
        throw createBadRequestError(`Invalid requirement priority. Allowed values: ${VALID_REQUIREMENT_PRIORITIES.join(", ")}`);
    }
    if (!VALID_REQUIREMENT_STATUSES.includes(requirementStatus)) {
        throw createBadRequestError(`Invalid requirement status. Allowed values: ${VALID_REQUIREMENT_STATUSES.join(", ")}`);
    }
    const requirementCode = requirementData.requirement_code ? String(requirementData.requirement_code).trim().toUpperCase() : null;
    let requirementCodePrefix = requirementData.requirement_code_prefix ? String(requirementData.requirement_code_prefix).trim().toUpperCase() : null;
    let requirementCodeNumber = requirementData.requirement_code_number ? Number(requirementData.requirement_code_number) : null;
    if(!requirementCode){
        if(!requirementCodePrefix || requirementCodePrefix.length === 0){
            throw new Error("Requirement code is required if prefix is not provided");
        }
        if(requirementCodeNumber === null || isNaN(requirementCodeNumber)){
            throw new Error("Requirement code number is required if prefix is not provided");
        }
    }else{
        // Requirement code is either in the format of PREFIX-NUMBER, so we need to split it into prefix and number, OR it is just the prefix. If it is 
        // just the prefix, then we will look up the max number for that prefix and use the next number in sequence. If it is in the format of PREFIX-NUMBER, then we will use the provided prefix and number.
        const parsedCode = parseRequirementCode(requirementCode);
        requirementCodePrefix = parsedCode.prefix;
        if (parsedCode.number !== null) {
            requirementCodeNumber = parsedCode.number;
        } else {
            // look up the max number for this prefix and use the next number in sequence
            requirementCodeNumber = await getNextRequirementCodeNumber(requirementCodePrefix);
        }
    }
    const projectId = await getCurrentProjectId();
    const query = `
        INSERT INTO requirements (title, description, requirement_type, priority, status, created_by, updated_by, requirement_code_prefix, requirement_code_number, project_id)
        VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9)
        RETURNING id, requirement_code_prefix, requirement_code_number, project_id, title, description, requirement_type, priority, status, created_at, updated_at, created_by, updated_by
    `;
    queryParams.push(requirementData.title);
    queryParams.push(requirementData.description);
    queryParams.push(requirementType);
    queryParams.push(requirementPriority);
    queryParams.push(requirementStatus);
    queryParams.push(userId);
    queryParams.push(requirementCodePrefix);
    queryParams.push(requirementCodeNumber);
    queryParams.push(projectId);
    log("debug", "Creating requirement", { userId, requirementData }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    const createdRequirement = result.rows[0];
    // update tags after requirement exists
    const tagsArray = normalizeTags(requirementData.tags);
    if (createdRequirement?.id && tagsArray.length > 0) {
        for (const tag of tagsArray) {
            await addTagToRequirement(createdRequirement.id, tag);
        }
    }
    // also add tags to project settings if not already linked
    if (projectId && tagsArray.length > 0) {
        for (const tag of tagsArray) {
            await addTagToProject(projectId, tag);
        }
    }
    return getRequirementById(userId, token, createdRequirement.id);
}

async function getRequirementById(userId, token, requirementId) {
    if (!isNumericId(requirementId)) {
        throw createBadRequestError("Invalid requirement ID");
    }
    const requirementIdNum = Number(requirementId);
    const query = `
        SELECT id, requirement_code_prefix, requirement_code_number, project_id, title, description, requirement_type, priority, status, created_at, updated_at, created_by, updated_by
        FROM requirements
        WHERE id = $1
          AND archived = FALSE
        LIMIT 1
    `;
    const result = await db.query(query, [requirementIdNum]);
    if (result.rows.length === 0) {
        return null;
    }
    const hydrated = await hydrateRequirements(result.rows);
    const acceptanceCriteriaResult = await db.query(
        `
            SELECT id, criteria_text, is_met, created_at, created_by, updated_at, updated_by
            FROM requirements_acceptance_criteria
            WHERE requirement_id = $1
            ORDER BY id ASC
        `,
        [requirementIdNum],
    );
    return {
        ...hydrated[0],
        acceptance_criteria: acceptanceCriteriaResult.rows,
    };
}

async function updateRequirement(userId, token, requirementId, updateData) {
    if (!isNumericId(requirementId)) {
        throw createBadRequestError("Invalid requirement ID");
    }
    const requirementIdNum = Number(requirementId);
    const payload = updateData && typeof updateData === "object" ? updateData : {};

    const existingRequirementResult = await db.query(
        `SELECT id, project_id FROM requirements WHERE id = $1 AND archived = FALSE LIMIT 1`,
        [requirementIdNum],
    );
    if (existingRequirementResult.rows.length === 0) {
        return null;
    }
    const existingRequirement = existingRequirementResult.rows[0];

    const updateClauses = [];
    const updateParams = [];

    if (hasOwn(payload, "title")) {
        const title = String(payload.title || "").trim();
        if (!title) {
            throw createBadRequestError("Title cannot be empty.");
        }
        updateParams.push(title);
        updateClauses.push(`title = $${updateParams.length}`);
    }

    if (hasOwn(payload, "description")) {
        updateParams.push(payload.description ? String(payload.description).trim() : null);
        updateClauses.push(`description = $${updateParams.length}`);
    }

    if (hasOwn(payload, "requirement_type")) {
        const requirementType = normalizeRequirementType(payload.requirement_type);
        if (!VALID_REQUIREMENT_TYPES.includes(requirementType)) {
            throw createBadRequestError(`Invalid requirement type. Allowed values: ${VALID_REQUIREMENT_TYPES.join(", ")}`);
        }
        updateParams.push(requirementType);
        updateClauses.push(`requirement_type = $${updateParams.length}`);
    }

    if (hasOwn(payload, "priority")) {
        const priority = normalizePriority(payload.priority);
        if (!VALID_REQUIREMENT_PRIORITIES.includes(priority)) {
            throw createBadRequestError(`Invalid requirement priority. Allowed values: ${VALID_REQUIREMENT_PRIORITIES.join(", ")}`);
        }
        updateParams.push(priority);
        updateClauses.push(`priority = $${updateParams.length}`);
    }

    const wantsArchiveByStatus =
        hasOwn(payload, "status") &&
        typeof payload.status === "string" &&
        payload.status.trim().toLowerCase() === "archived";
    const wantsArchiveByFlag = hasOwn(payload, "archived") && (payload.archived === true || payload.archived === "true");
    let isArchiving = wantsArchiveByStatus || wantsArchiveByFlag;
    if (wantsArchiveByStatus) {
        updateParams.push(userId);
        updateClauses.push("archived = TRUE");
        updateClauses.push("archived_at = now()");
        updateClauses.push(`archived_by = $${updateParams.length}`);
    } else if (hasOwn(payload, "status")) {
        const status = normalizeStatus(payload.status);
        if (!VALID_REQUIREMENT_STATUSES.includes(status)) {
            throw createBadRequestError(`Invalid requirement status. Allowed values: ${VALID_REQUIREMENT_STATUSES.join(", ")}`);
        }
        updateParams.push(status);
        updateClauses.push(`status = $${updateParams.length}`);
    }

    if (hasOwn(payload, "archived")) {
        const shouldArchive = wantsArchiveByFlag;
        if (shouldArchive) {
            updateParams.push(userId);
            updateClauses.push("archived = TRUE");
            updateClauses.push("archived_at = now()");
            updateClauses.push(`archived_by = $${updateParams.length}`);
        } else {
            updateClauses.push("archived = FALSE");
            updateClauses.push("archived_at = NULL");
            updateClauses.push("archived_by = NULL");
        }
        isArchiving = shouldArchive;
    }

    if (hasOwn(payload, "requirement_code")) {
        const parsedCode = parseRequirementCode(payload.requirement_code);
        const codePrefix = parsedCode.prefix;
        const codeNumber = parsedCode.number !== null ? parsedCode.number : await getNextRequirementCodeNumber(parsedCode.prefix, requirementIdNum);
        updateParams.push(codePrefix);
        updateClauses.push(`requirement_code_prefix = $${updateParams.length}`);
        updateParams.push(codeNumber);
        updateClauses.push(`requirement_code_number = $${updateParams.length}`);
    } else if (hasOwn(payload, "requirement_code_prefix") || hasOwn(payload, "requirement_code_number")) {
        const codePrefix = hasOwn(payload, "requirement_code_prefix")
            ? String(payload.requirement_code_prefix || "").trim().toUpperCase()
            : null;
        const codeNumberRaw = payload.requirement_code_number;
        if (!codePrefix || !Number.isInteger(Number(codeNumberRaw)) || Number(codeNumberRaw) <= 0) {
            throw createBadRequestError("Both requirement_code_prefix and a positive requirement_code_number are required.");
        }
        updateParams.push(codePrefix);
        updateClauses.push(`requirement_code_prefix = $${updateParams.length}`);
        updateParams.push(Number(codeNumberRaw));
        updateClauses.push(`requirement_code_number = $${updateParams.length}`);
    }

    if (updateClauses.length > 0) {
        updateParams.push(userId);
        updateClauses.push(`updated_by = $${updateParams.length}`);
        updateParams.push(requirementIdNum);
        await db.query(
            `
                UPDATE requirements
                SET ${updateClauses.join(", ")}
                WHERE id = $${updateParams.length}
            `,
            updateParams,
        );
    }

    if (hasOwn(payload, "tags")) {
        const tags = normalizeTags(payload.tags);
        await db.query(`DELETE FROM requirements_tags_junction WHERE requirement_id = $1`, [requirementIdNum]);
        for (const tag of tags) {
            await addTagToRequirement(requirementIdNum, tag);
            if (existingRequirement.project_id) {
                await addTagToProject(existingRequirement.project_id, tag);
            }
        }
    }

    if (hasOwn(payload, "acceptance_criteria")) {
        const acceptanceCriteria = Array.isArray(payload.acceptance_criteria) ? payload.acceptance_criteria : [];
        await db.query(`DELETE FROM requirements_acceptance_criteria WHERE requirement_id = $1`, [requirementIdNum]);
        for (const criterion of acceptanceCriteria) {
            const criterionText = typeof criterion === "string" ? criterion.trim() : String(criterion?.criteria_text || "").trim();
            if (!criterionText) {
                continue;
            }
            const criterionMet = typeof criterion === "object" && criterion ? Boolean(criterion.is_met) : false;
            await db.query(
                `
                    INSERT INTO requirements_acceptance_criteria (requirement_id, criteria_text, is_met, created_by, updated_by)
                    VALUES ($1, $2, $3, $4, $4)
                `,
                [requirementIdNum, criterionText, criterionMet, userId],
            );
        }
    }

    if (isArchiving) {
        return { id: requirementIdNum, archived: true };
    }

    return getRequirementById(userId, token, requirementIdNum);
}

async function getRequirementTotals(userId, token, requirementId) {
    if (!isNumericId(requirementId)) {
        throw createBadRequestError("Invalid requirement ID");
    }
    const requirementIdNum = Number(requirementId);
    const requirementResult = await db.query(`SELECT id FROM requirements WHERE id = $1 AND archived = FALSE LIMIT 1`, [requirementIdNum]);
    if (requirementResult.rows.length === 0) {
        return null;
    }
    const [effortResult, tagsResult, criteriaResult] = await Promise.all([
        db.query(
            `
                SELECT
                    COALESCE(SUM(effort_amount), 0) AS total_effort,
                    MAX(COALESCE(entry_date::timestamptz, week_of::timestamptz, created_at)) AS last_effort_date,
                    COUNT(*)::int AS total_effort_entries
                FROM effort_entries
                WHERE requirement_id = $1
                  AND archived = FALSE
            `,
            [requirementIdNum],
        ),
        db.query(`SELECT COUNT(*)::int AS total_tags FROM requirements_tags_junction WHERE requirement_id = $1`, [requirementIdNum]),
        db.query(
            `
                SELECT
                    COUNT(*)::int AS total_acceptance_criteria,
                    COUNT(*) FILTER (WHERE is_met = TRUE)::int AS total_met_acceptance_criteria
                FROM requirements_acceptance_criteria
                WHERE requirement_id = $1
            `,
            [requirementIdNum],
        ),
    ]);

    const totalEffort = Number(effortResult.rows[0]?.total_effort || 0);
    return {
        requirement_id: requirementIdNum,
        total_effort: totalEffort,
        total_efforts: totalEffort,
        total_effort_entries: Number(effortResult.rows[0]?.total_effort_entries || 0),
        last_effort_date: effortResult.rows[0]?.last_effort_date || null,
        total_tags: Number(tagsResult.rows[0]?.total_tags || 0),
        total_acceptance_criteria: Number(criteriaResult.rows[0]?.total_acceptance_criteria || 0),
        total_met_acceptance_criteria: Number(criteriaResult.rows[0]?.total_met_acceptance_criteria || 0),
        total_comments: 0,
        linked_risks: 0,
    };
}

async function exportRequirementsToCSV(userId, token, options = {}) {
    let queryParams = [];
    let filterClause = "";
    ({ clause: filterClause, queryParams } = buildFilterClause(options.filterField, options.filterValue, options.filterMin, options.filterMax, queryParams));
    const sortClause = buildSortClause(options.sortField, options.sortOrder);
    const query = `SELECT * FROM requirements WHERE archived = FALSE ${filterClause} ${sortClause}`;
    log("debug", "Exporting requirements to CSV with query", { userId, query, queryParams }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    const requirements = result.rows;
    // Convert user IDs to user names for created_by and updated_by fields
    const userIds = new Set();
    requirements.forEach((req) => {
        if (req.created_by) userIds.add(req.created_by);
        if (req.updated_by) userIds.add(req.updated_by);
    });
    const userIdToNameMap = {};
    if (userIds.size > 0) {
        const usersResult = await db.query(`SELECT id, first_name, last_name FROM users WHERE id = ANY($1)`, [Array.from(userIds)]);
        usersResult.rows.forEach((user) => {
            userIdToNameMap[user.id] = `${user.first_name} ${user.last_name}`;
        });
    }
    requirements.forEach((req) => {
        req.created_by = userIdToNameMap[req.created_by] || req.created_by;
        req.updated_by = userIdToNameMap[req.updated_by] || req.updated_by;
    });
    // Convert project IDs to project names
    const projectIds = new Set(requirements.map((req) => req.project_id));
    const projectIdToNameMap = {};
    if (projectIds.size > 0) {
        const projectsResult = await db.query(`SELECT id, project_name FROM project_settings WHERE id = ANY($1)`, [Array.from(projectIds)]);
        projectsResult.rows.forEach((project) => {
            projectIdToNameMap[project.id] = project.project_name;
        });
    }
    requirements.forEach((req) => {
        req.project_id = projectIdToNameMap[req.project_id] || req.project_id;
    });
    // Convert requirements to CSV format
    const csvHeader = "id,requirement_code_prefix,requirement_code_number,project_name,title,description,requirement_type,priority,status,created_at,updated_at,created_by,updated_by\n";
    const csvRows = requirements.map((req) => {
        const escapedDescription = req.description ? `"${req.description.replace(/"/g, '""')}"` : "";
        return `${req.id},${req.requirement_code_prefix},${req.requirement_code_number},${req.project_id},"${req.title.replace(/"/g, '""')}",${escapedDescription},${req.requirement_type},${req.priority},${req.status},${req.created_at.toISOString()},${req.updated_at.toISOString()},${req.created_by},${req.updated_by}`;
    });
    return csvHeader + csvRows.join("\n");
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
    getAllTags,
    getTagsFiltered,
    getTagsForProjectById,
    getTagsForRequirementById,
    getReqCodePrefixes,
};
