const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const teamController = require("../controllers/team");
const { isAdmin } = require("../controllers/users");

function loggedInCheck(req, res, next) {
    const userId = req.user?.id;
    const loggedIn = req.user?.loggedIn;
    if (!userId || !loggedIn) {
        log("warn", "Unauthorized access to team route", {}, getCallerInfo());
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

function getStatusCodeForError(error) {
    if (error?.statusCode && Number.isInteger(error.statusCode)) return error.statusCode;
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("invalid")) return 400;
    return 500;
}

router.get("/filter/:offset/:count", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    const offset = parseInt(req.params.offset, 10) || 0;
    const count = parseInt(req.params.count, 10) || 20;
    if (isNaN(offset) || isNaN(count) || offset < 0 || count <= 0) {
        return res.status(400).json({ error: "Invalid offset or count" });
    }
    try {
        const { search, role, status, sortField, sortOrder } = req.query;
        const members = await teamController.listMembers(offset, count, {
            search,
            role,
            status,
            sortField,
            sortOrder,
        });
        res.json(Array.isArray(members) ? members : []);
    } catch (error) {
        log("error", `Failed to fetch team members: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch team members" });
    }
});

router.get("/count", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const { search, role, status } = req.query;
        const count = await teamController.countMembers({ search, role, status });
        res.json({ count });
    } catch (error) {
        log("error", `Failed to fetch team count: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch team count" });
    }
});

router.get("/summary", loggedInCheck, async (req, res) => {
    try {
        const summary = await teamController.getTeamSummary();
        res.json(summary);
    } catch (error) {
        log("error", `Failed to fetch team summary: ${error.message}`, {}, getCallerInfo());
        res.status(500).json({ error: "Failed to fetch team summary" });
    }
});

router.get("/current-user-role", loggedInCheck, async (req, res) => {
    try {
        const role = await teamController.getCurrentUserRole(req.user?.id);
        res.json({ role });
    } catch (error) {
        log("error", `Failed to fetch current user role: ${error.message}`, { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch current user role" });
    }
});

router.get("/available-users", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        if (!(await isAdmin(userId, req.user?.token))) {
            return res.status(403).json({ error: "Access denied. Administrator role required." });
        }
        const users = await teamController.listAvailableUsers();
        res.json(Array.isArray(users) ? users : []);
    } catch (error) {
        log("error", `Failed to fetch available users for project assignment: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch available users" });
    }
});

router.post("/assign-member", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        if (!(await isAdmin(userId, req.user?.token))) {
            return res.status(403).json({ error: "Access denied. Administrator role required." });
        }
        const memberUserId = req.body?.user_id;
        const role = req.body?.role;
        const assignment = await teamController.assignUserToActiveProject(memberUserId, userId, role);
        res.json(assignment);
    } catch (error) {
        log("error", `Failed to assign member to active project: ${error.message}`, { userId, memberUserId: req.body?.user_id }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to assign member to active project" });
    }
});

router.get("/export/csv", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const { search, role, status, sortField, sortOrder } = req.query;
        const csvData = await teamController.exportRosterToCSV({
            search,
            role,
            status,
            sortField,
            sortOrder,
        });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=team-roster.csv");
        res.send(csvData);
    } catch (error) {
        log("error", `Failed to export team roster: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to export team roster" });
    }
});

router.get("/byid/:id", loggedInCheck, async (req, res) => {
    try {
        const member = await teamController.getMemberById(req.params.id);
        if (!member) return res.status(404).json({ error: "Member not found" });
        res.json(member);
    } catch (error) {
        log("error", `Failed to fetch member: ${error.message}`, {}, getCallerInfo());
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch member" });
    }
});

// RESTful alias
router.get("/:id", loggedInCheck, async (req, res) => {
    try {
        const member = await teamController.getMemberById(req.params.id);
        if (!member) return res.status(404).json({ error: "Member not found" });
        res.json(member);
    } catch (error) {
        log("error", `Failed to fetch member: ${error.message}`, {}, getCallerInfo());
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch member" });
    }
});

module.exports = router;
