const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const risksController = require("../controllers/risks");

function loggedInCheck(req, res, next) {
    const userId = req.user?.id;
    const loggedIn = req.user?.loggedIn;
    if (!userId || !loggedIn) {
        log("warn", "Unauthorized access to risks route", {}, getCallerInfo());
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
    const count = parseInt(req.params.count, 10) || 10;
    if (isNaN(offset) || isNaN(count) || offset < 0 || count <= 0) {
        return res.status(400).json({ error: "Invalid offset or count" });
    }
    try {
        const { search, status, likelihood, impact, sortField, sortOrder } = req.query;
        const risks = await risksController.listRisks(userId, req.user.token, offset, count, {
            search,
            status,
            likelihood,
            impact,
            sortField,
            sortOrder,
        });
        res.json(Array.isArray(risks) ? risks : []);
    } catch (error) {
        log("error", `Failed to fetch risks: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch risks" });
    }
});

router.get("/count", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const { search, status, likelihood, impact } = req.query;
        const count = await risksController.countRisks(userId, req.user.token, {
            search,
            status,
            likelihood,
            impact,
        });
        res.json({ count });
    } catch (error) {
        log("error", `Failed to fetch risks count: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch risks count" });
    }
});

router.get("/summary", loggedInCheck, async (req, res) => {
    try {
        const summary = await risksController.getRisksSummary();
        res.json(summary);
    } catch (error) {
        log("error", `Failed to fetch risks summary: ${error.message}`, {}, getCallerInfo());
        res.status(500).json({ error: "Failed to fetch risks summary" });
    }
});

router.get("/recent-updates", loggedInCheck, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 10;
        const updates = await risksController.getRecentUpdates(limit);
        res.json(updates);
    } catch (error) {
        log("error", `Failed to fetch recent risk updates: ${error.message}`, {}, getCallerInfo());
        res.status(500).json({ error: "Failed to fetch recent risk updates" });
    }
});

router.get("/team", loggedInCheck, async (req, res) => {
    try {
        const members = await risksController.getTeamMembers();
        res.json(members);
    } catch (error) {
        log("error", `Failed to fetch team members: ${error.message}`, {}, getCallerInfo());
        res.status(500).json({ error: "Failed to fetch team members" });
    }
});

router.get("/export/csv", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const { search, status, likelihood, impact, sortField, sortOrder } = req.query;
        const csvData = await risksController.exportRisksToCSV(userId, {
            search,
            status,
            likelihood,
            impact,
            sortField,
            sortOrder,
        });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=risks.csv");
        res.send(csvData);
    } catch (error) {
        log("error", `Failed to export risks: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to export risks" });
    }
});

router.post("/new", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const newRisk = await risksController.createRisk(userId, req.body);
        res.status(201).json(newRisk);
    } catch (error) {
        log("error", `Failed to create risk: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to create risk" });
    }
});

router.get("/byid/:id", loggedInCheck, async (req, res) => {
    try {
        const risk = await risksController.getRiskById(req.params.id);
        if (!risk) return res.status(404).json({ error: "Risk not found" });
        res.json(risk);
    } catch (error) {
        log("error", `Failed to fetch risk: ${error.message}`, {}, getCallerInfo());
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch risk" });
    }
});

router.patch("/update/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const updated = await risksController.updateRisk(userId, req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: "Risk not found" });
        res.json(updated);
    } catch (error) {
        log("error", `Failed to update risk: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to update risk" });
    }
});

router.get("/:id/updates", loggedInCheck, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit, 10) || 20;
        const offset = parseInt(req.query.offset, 10) || 0;
        const updates = await risksController.getRiskUpdates(req.params.id, limit, offset);
        res.json(updates);
    } catch (error) {
        log("error", `Failed to fetch risk updates: ${error.message}`, {}, getCallerInfo());
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch risk updates" });
    }
});

router.post("/:id/updates", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const update = await risksController.createRiskUpdate(userId, req.params.id, req.body);
        if (!update) return res.status(404).json({ error: "Risk not found" });
        res.status(201).json(update);
    } catch (error) {
        log("error", `Failed to create risk update: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to create risk update" });
    }
});

// RESTful aliases
router.get("/:id", loggedInCheck, async (req, res) => {
    try {
        const risk = await risksController.getRiskById(req.params.id);
        if (!risk) return res.status(404).json({ error: "Risk not found" });
        res.json(risk);
    } catch (error) {
        log("error", `Failed to fetch risk: ${error.message}`, {}, getCallerInfo());
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch risk" });
    }
});

router.patch("/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const updated = await risksController.updateRisk(userId, req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: "Risk not found" });
        res.json(updated);
    } catch (error) {
        log("error", `Failed to update risk: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to update risk" });
    }
});

module.exports = router;
