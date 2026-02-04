const db = require("../db/db");
const {log} = require("../utils/logger");
const {getCallerInfo} = require("../utils/utilities");

async function getProjectTeamMembers(projectId) {
    try {
        log("debug", "Fetching project team members", { projectId }, getCallerInfo());
        const result = await db.query(
            `SELECT id, user_id, role, added_at, added_by 
             FROM project_team_members 
             WHERE project_settings_id = $1`,
            [projectId]
        );
        return result.rows;
    } catch (error) {
        log("error", `Failed to fetch project team members: ${error.message}`, { projectId }, getCallerInfo());
        throw error;
    }
}

async function getActiveProjectSnapshot(){
    try {
        log("debug", "Fetching active project snapshot", {}, getCallerInfo());
        const result = await db.query(
            `SELECT project_name, project_owner_name, project_description 
             FROM project_settings 
             WHERE project_status = 'Active' 
             LIMIT 1`
        );
        if (result.rows.length === 0) {
            log("warn", "No active project found", {}, getCallerInfo());
            return null;
        }
        const activeProjectTeam = await getProjectTeamMembers(result.rows[0].id);
        const project = result.rows[0];
        return {
            project_name: project.project_name,
            project_owner: project.project_owner_name,
            team_size: activeProjectTeam.length,
            project_summary: project.project_description
        };
    } catch (error) {
        log("error", `Failed to fetch active project snapshot: ${error.message}`, {}, getCallerInfo());
        throw error;
    }
}

module.exports = {
    getActiveProjectSnapshot,
};