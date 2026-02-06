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
        SELECT id, requirement_code_prefix, requirement_code_number, project_id, title, description, requirement_type, priority, status, created_at, updated_at, created_by, updated_by
        FROM requirements
        WHERE 1=1
        ${filterClause}
        ${sortClause}
        LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `;
    log("debug", "Listing requirements", { userId, offset, count }, getCallerInfo(), userId);
    const result = await db.query(query, queryParams);
    // TODO: we also need to look up the tags for each requirement and include them in the result
    // TODO: we also need to look up the total effort for each requirement and include it in the result
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
    let queryParams = [];
    const normalizeRequirementType = (value) => {
        if (!value) return null;
        const normalized = value.toString().trim().toLowerCase();
        if (normalized === "functional") return "Functional";
        if (normalized === "non-functional" || normalized === "non functional" || normalized === "nonfunctional") {
            return "Non-functional";
        }
        return value.toString().trim();
    };
    const normalizePriority = (value) => {
        if (!value) return null;
        const normalized = value.toString().trim().toLowerCase();
        if (normalized === "low") return "Low";
        if (normalized === "medium") return "Medium";
        if (normalized === "high") return "High";
        if (normalized === "critical") return "Critical";
        return value.toString().trim();
    };
    const normalizeStatus = (value) => {
        if (!value) return "Proposed";
        const normalized = value.toString().trim().toLowerCase();
        if (normalized === "proposed") return "Proposed";
        if (normalized === "approved") return "Approved";
        if (normalized === "in development" || normalized === "in-development" || normalized === "indevelopment") {
            return "In Development";
        }
        if (normalized === "completed") return "Completed";
        if (normalized === "rejected") return "Rejected";
        return value.toString().trim();
    };
    const normalizeTags = (tags) => {
        if (!tags) return [];
        if (Array.isArray(tags)) {
            return tags.map((tag) => String(tag).trim()).filter((tag) => tag.length > 0);
        }
        return String(tags)
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0);
    };
    const requirementType = normalizeRequirementType(requirementData.requirement_type);
    const requirementPriority = normalizePriority(requirementData.priority);
    const requirementStatus = normalizeStatus(requirementData.status);
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
        const codeParts = requirementCode.split("-");
        if(codeParts.length === 2){
            requirementCodePrefix = codeParts[0];
            requirementCodeNumber = Number(codeParts[1]);
            if(isNaN(requirementCodeNumber)){
                throw new Error("Invalid requirement code format. If using PREFIX-NUMBER format, the number part must be a valid integer.");
            }
        }else if(codeParts.length === 1){
            requirementCodePrefix = codeParts[0];
            // look up the max number for this prefix and use the next number in sequence
            const query = `SELECT MAX(requirement_code_number) AS max_number FROM requirements WHERE requirement_code_prefix = $1`;
            const result = await db.query(query, [requirementCodePrefix]);
            const maxNumber = result.rows[0].max_number || 0;
            requirementCodeNumber = maxNumber + 1;
        }else{
            throw new Error("Invalid requirement code format. Requirement code should be in the format of PREFIX-NUMBER or just PREFIX.");
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
    return createdRequirement;
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
