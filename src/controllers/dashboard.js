const db = require("../db/db");
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");

const IMPACT_ORDER = ["Critical", "High", "Medium", "Low"];

function formatRequirementCode(prefix, number) {
    if (prefix && number) {
        return `${prefix}-${number}`;
    }
    if (prefix) {
        return prefix;
    }
    return null;
}

function formatUserName(firstName, lastName, fallback = "Unknown") {
    const parts = [firstName, lastName].map((value) => String(value || "").trim()).filter(Boolean);
    return parts.length ? parts.join(" ") : fallback;
}

function toNumber(value) {
    return Number(value || 0);
}

function getEffortTrendLabel(currentHours, previousHours) {
    if (currentHours <= 0) {
        return "Idle";
    }
    if (previousHours <= 0) {
        return "Starting";
    }
    if (currentHours >= previousHours * 1.5 && currentHours >= 8) {
        return "Peak";
    }
    if (currentHours > previousHours * 1.1) {
        return "Rising";
    }
    if (currentHours < previousHours * 0.9) {
        return "Falling";
    }
    return "Steady";
}

function buildOpenRiskBreakdown(row) {
    return {
        Critical: toNumber(row?.critical_open_risks),
        High: toNumber(row?.high_open_risks),
        Medium: toNumber(row?.medium_open_risks),
        Low: toNumber(row?.low_open_risks),
    };
}

async function getProjectTeamMembers(projectId) {
    try {
        log("debug", "Fetching project team members", { projectId }, getCallerInfo());
        const result = await db.query(
            `
            SELECT id, user_id, role, added_at, added_by
            FROM project_team_members
            WHERE project_settings_id = $1
            `,
            [projectId],
        );
        return result.rows;
    } catch (error) {
        log("error", `Failed to fetch project team members: ${error.message}`, { projectId }, getCallerInfo());
        throw error;
    }
}

async function getActiveProjectSnapshot() {
    try {
        log("debug", "Fetching active project snapshot", {}, getCallerInfo());
        const result = await db.query(
            `
            SELECT id, project_name, project_owner_name, project_description
            FROM project_settings
            WHERE project_status = 'Active'
              AND archived = FALSE
            ORDER BY updated_at DESC
            LIMIT 1
            `,
        );
        if (result.rows.length === 0) {
            log("warn", "No active project found", {}, getCallerInfo());
            return null;
        }
        const project = result.rows[0];
        const activeProjectTeam = await getProjectTeamMembers(project.id);
        const uniqueTeamMemberCount = new Set(activeProjectTeam.map((member) => member.user_id)).size;
        return {
            project_id: project.id,
            project_name: project.project_name || "",
            project_owner: project.project_owner_name || "",
            team_size: uniqueTeamMemberCount,
            project_summary: project.project_description || "",
        };
    } catch (error) {
        log("error", `Failed to fetch active project snapshot: ${error.message}`, {}, getCallerInfo());
        throw error;
    }
}

async function getDashboardMetrics() {
    const [requirementsResult, effortWeekResult, effortTotalResult, risksResult] = await Promise.all([
        db.query(`
            SELECT
                COUNT(*) FILTER (WHERE archived = FALSE)::int AS total_requirements,
                COUNT(*) FILTER (WHERE archived = FALSE AND requirement_type = 'Functional')::int AS functional_requirements,
                COUNT(*) FILTER (WHERE archived = FALSE AND requirement_type = 'Non-functional')::int AS non_functional_requirements
            FROM requirements
        `),
        db.query(`
            SELECT
                COALESCE(SUM(ee.effort_amount), 0) AS effort_this_week_hours,
                COUNT(*)::int AS effort_this_week_entries
            FROM effort_entries ee
            WHERE ee.archived = FALSE
              AND COALESCE(ee.entry_date, ee.week_of, ee.created_at::date) >= date_trunc('week', CURRENT_DATE)::date
              AND COALESCE(ee.entry_date, ee.week_of, ee.created_at::date) < date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'
        `),
        db.query(`
            SELECT
                COALESCE(SUM(ee.effort_amount), 0) AS effort_total_hours,
                COUNT(*)::int AS effort_total_entries
            FROM effort_entries ee
            WHERE ee.archived = FALSE
        `),
        db.query(`
            SELECT
                COUNT(*) FILTER (WHERE archived = FALSE AND risk_status <> 'Closed')::int AS open_risks,
                COUNT(*) FILTER (WHERE archived = FALSE AND risk_status <> 'Closed' AND risk_impact = 'Critical')::int AS critical_open_risks,
                COUNT(*) FILTER (WHERE archived = FALSE AND risk_status <> 'Closed' AND risk_impact = 'High')::int AS high_open_risks,
                COUNT(*) FILTER (WHERE archived = FALSE AND risk_status <> 'Closed' AND risk_impact = 'Medium')::int AS medium_open_risks,
                COUNT(*) FILTER (WHERE archived = FALSE AND risk_status <> 'Closed' AND risk_impact = 'Low')::int AS low_open_risks
            FROM risks
        `),
    ]);

    const requirements = requirementsResult.rows[0] || {};
    const effortWeek = effortWeekResult.rows[0] || {};
    const effortTotal = effortTotalResult.rows[0] || {};
    const risks = risksResult.rows[0] || {};

    return {
        total_requirements: toNumber(requirements.total_requirements),
        requirements_by_type: {
            Functional: toNumber(requirements.functional_requirements),
            "Non-functional": toNumber(requirements.non_functional_requirements),
        },
        effort_this_week_hours: toNumber(effortWeek.effort_this_week_hours),
        effort_this_week_entries: toNumber(effortWeek.effort_this_week_entries),
        effort_total_hours: toNumber(effortTotal.effort_total_hours),
        effort_total_entries: toNumber(effortTotal.effort_total_entries),
        open_risks: toNumber(risks.open_risks),
        open_risks_by_impact: buildOpenRiskBreakdown(risks),
    };
}

async function getDashboardSummary() {
    const [projectSnapshot, metrics] = await Promise.all([getActiveProjectSnapshot(), getDashboardMetrics()]);
    return {
        project_name: projectSnapshot?.project_name || "Not configured",
        project_owner: projectSnapshot?.project_owner || "Not assigned",
        team_size: projectSnapshot?.team_size || 0,
        project_summary: projectSnapshot?.project_summary || "No active project summary is available yet.",
        metrics,
    };
}

async function getEffortByCategory(range = "week") {
    const normalizedRange = String(range || "week").trim().toLowerCase();
    if (normalizedRange !== "week") {
        return [];
    }

    const result = await db.query(`
        WITH current_period AS (
            SELECT
                COALESCE(ee.category, 'Uncategorized') AS category,
                COALESCE(SUM(ee.effort_amount), 0) AS current_hours
            FROM effort_entries ee
            WHERE ee.archived = FALSE
              AND COALESCE(ee.entry_date, ee.week_of, ee.created_at::date) >= date_trunc('week', CURRENT_DATE)::date
              AND COALESCE(ee.entry_date, ee.week_of, ee.created_at::date) < date_trunc('week', CURRENT_DATE)::date + INTERVAL '7 days'
            GROUP BY COALESCE(ee.category, 'Uncategorized')
        ),
        previous_period AS (
            SELECT
                COALESCE(ee.category, 'Uncategorized') AS category,
                COALESCE(SUM(ee.effort_amount), 0) AS previous_hours
            FROM effort_entries ee
            WHERE ee.archived = FALSE
              AND COALESCE(ee.entry_date, ee.week_of, ee.created_at::date) >= date_trunc('week', CURRENT_DATE)::date - INTERVAL '7 days'
              AND COALESCE(ee.entry_date, ee.week_of, ee.created_at::date) < date_trunc('week', CURRENT_DATE)::date
            GROUP BY COALESCE(ee.category, 'Uncategorized')
        )
        SELECT
            cp.category,
            cp.current_hours,
            COALESCE(pp.previous_hours, 0) AS previous_hours
        FROM current_period cp
        LEFT JOIN previous_period pp ON pp.category = cp.category
        ORDER BY cp.current_hours DESC, cp.category ASC
    `);

    return result.rows.map((row) => {
        const currentHours = toNumber(row.current_hours);
        const previousHours = toNumber(row.previous_hours);
        return {
            category: row.category || "Uncategorized",
            hours: currentHours,
            previous_hours: previousHours,
            trend: getEffortTrendLabel(currentHours, previousHours),
        };
    });
}

async function getRecentActivity(limit = 6) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 6, 1), 20);
    const [requirementUpdates, effortEntries, riskUpdates] = await Promise.all([
        db.query(
            `
            SELECT
                r.id,
                r.requirement_code_prefix,
                r.requirement_code_number,
                r.title,
                COALESCE(r.updated_at, r.created_at) AS activity_at,
                u.first_name,
                u.last_name
            FROM requirements r
            LEFT JOIN users u ON u.id = r.updated_by
            WHERE r.archived = FALSE
            ORDER BY COALESCE(r.updated_at, r.created_at) DESC
            LIMIT $1
            `,
            [safeLimit],
        ),
        db.query(
            `
            SELECT
                ee.id,
                ee.effort_amount,
                ee.category,
                COALESCE(ee.description, '') AS description,
                COALESCE(ee.updated_at, ee.created_at, ee.entry_date::timestamptz, ee.week_of::timestamptz) AS activity_at,
                u.first_name,
                u.last_name,
                r.requirement_code_prefix,
                r.requirement_code_number,
                r.title AS requirement_title
            FROM effort_entries ee
            LEFT JOIN users u ON u.id = ee.user_id
            LEFT JOIN requirements r ON r.id = ee.requirement_id
            WHERE ee.archived = FALSE
            ORDER BY COALESCE(ee.updated_at, ee.created_at, ee.entry_date::timestamptz, ee.week_of::timestamptz) DESC, ee.id DESC
            LIMIT $1
            `,
            [safeLimit],
        ),
        db.query(
            `
            SELECT
                ru.id,
                ru.update_type,
                ru.status,
                COALESCE(ru.note, '') AS note,
                ru.update_date AS activity_at,
                r.risk_code,
                r.risk_title,
                u.first_name,
                u.last_name
            FROM risk_updates ru
            JOIN risks r ON r.id = ru.risk_id
            LEFT JOIN users u ON u.id = ru.updated_by
            WHERE r.archived = FALSE
            ORDER BY ru.update_date DESC
            LIMIT $1
            `,
            [safeLimit],
        ),
    ]);

    const items = [
        ...requirementUpdates.rows.map((row) => {
            const code = formatRequirementCode(row.requirement_code_prefix, row.requirement_code_number);
            return {
                type: "Requirement",
                label: code ? `${code} · ${row.title}` : row.title || "Requirement updated",
                detail: "Requirement updated",
                actor_name: formatUserName(row.first_name, row.last_name),
                occurred_at: row.activity_at,
            };
        }),
        ...effortEntries.rows.map((row) => {
            const requirementCode = formatRequirementCode(row.requirement_code_prefix, row.requirement_code_number);
            const requirementLabel = requirementCode || row.requirement_title || "Unlinked work";
            const hours = toNumber(row.effort_amount);
            return {
                type: "Effort",
                label: `${hours} hrs · ${row.category || "Uncategorized"} on ${requirementLabel}`,
                detail: row.description ? row.description : "Effort entry logged",
                actor_name: formatUserName(row.first_name, row.last_name),
                occurred_at: row.activity_at,
            };
        }),
        ...riskUpdates.rows.map((row) => {
            const detailParts = [row.update_type, row.status ? `status ${row.status}` : "", row.note].filter(Boolean);
            return {
                type: "Risk",
                label: row.risk_code ? `${row.risk_code} · ${row.risk_title}` : row.risk_title || "Risk updated",
                detail: detailParts.join(" · ") || "Risk updated",
                actor_name: formatUserName(row.first_name, row.last_name),
                occurred_at: row.activity_at,
            };
        }),
    ];

    return items
        .filter((item) => item.occurred_at)
        .sort((left, right) => new Date(right.occurred_at).getTime() - new Date(left.occurred_at).getTime())
        .slice(0, safeLimit);
}

async function getAttentionNeeded(limit = 4) {
    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 4, 1), 10);
    const [requirementsWithoutEffortResult, highRiskResult] = await Promise.all([
        db.query(`
            SELECT COUNT(*)::int AS count
            FROM requirements r
            WHERE r.archived = FALSE
              AND r.status IN ('Approved', 'In Development')
              AND NOT EXISTS (
                  SELECT 1
                  FROM effort_entries ee
                  WHERE ee.requirement_id = r.id
                    AND ee.archived = FALSE
              )
        `),
        db.query(
            `
            SELECT
                r.risk_code,
                r.risk_title,
                r.risk_status,
                r.risk_impact,
                r.risk_likelihood,
                COALESCE(u.first_name || ' ' || u.last_name, '') AS owner_name
            FROM risks r
            LEFT JOIN users u ON u.id = r.owner_id
            WHERE r.archived = FALSE
              AND r.risk_status <> 'Closed'
              AND (
                  r.risk_impact IN ('Critical', 'High')
                  OR r.risk_likelihood IN ('Critical', 'High')
              )
            ORDER BY
                CASE r.risk_impact
                    WHEN 'Critical' THEN 4
                    WHEN 'High' THEN 3
                    WHEN 'Medium' THEN 2
                    WHEN 'Low' THEN 1
                    ELSE 0
                END DESC,
                r.updated_at DESC
            LIMIT $1
            `,
            [safeLimit],
        ),
    ]);

    const items = [];
    const requirementsWithoutEffort = toNumber(requirementsWithoutEffortResult.rows[0]?.count);
    if (requirementsWithoutEffort > 0) {
        items.push({
            title: `${requirementsWithoutEffort} requirements with no effort logged`,
            badge: "Review",
            detail: "Approved or in-development requirements still need time entries.",
        });
    }

    for (const row of highRiskResult.rows) {
        const emphasis = IMPACT_ORDER.includes(row.risk_impact) ? row.risk_impact : row.risk_status || "Risk";
        const ownerDetail = row.owner_name ? `Owner: ${row.owner_name}` : "No owner assigned";
        items.push({
            title: row.risk_code ? `${row.risk_code} · ${row.risk_title}` : row.risk_title || "Risk follow-up",
            badge: emphasis,
            detail: `${row.risk_status} · Impact ${row.risk_impact} · Likelihood ${row.risk_likelihood} · ${ownerDetail}`,
        });
        if (items.length >= safeLimit) {
            break;
        }
    }

    return items.slice(0, safeLimit);
}

module.exports = {
    getActiveProjectSnapshot,
    getDashboardSummary,
    getEffortByCategory,
    getRecentActivity,
    getAttentionNeeded,
};
