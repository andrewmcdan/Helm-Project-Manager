const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const effortController = require("../controllers/effort");

function loggedInCheck(req, res, next) {
    const userId = req.user?.id;
    const loggedIn = req.user?.loggedIn;
    if (!userId || !loggedIn) {
        log("warn", "Unauthorized access to effort route", {}, getCallerInfo());
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

function getStatusCodeForError(error) {
    if (error?.statusCode && Number.isInteger(error.statusCode)) {
        return error.statusCode;
    }
    const message = String(error?.message || "").toLowerCase();
    if (message.includes("invalid")) return 400;
    return 500;
}

// --- Categories ---
router.get("/categories", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching effort categories", { userId }, getCallerInfo(), userId);
        const categories = await effortController.getCategories();
        res.json(categories);
    } catch (error) {
        log("error", `Failed to fetch effort categories: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch effort categories" });
    }
});

// --- Summary ---
router.get("/summary", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching effort summary", { userId }, getCallerInfo(), userId);
        const { requirement_id, category, user_id, date_from, date_to } = req.query;
        const summary = await effortController.getSummary(userId, { requirement_id, category, user_id, date_from, date_to });
        res.json(summary);
    } catch (error) {
        log("error", `Failed to fetch effort summary: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch effort summary" });
    }
});

// --- Recent entries ---
router.get("/recent", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching recent effort entries", { userId }, getCallerInfo(), userId);
        const limit = req.query.limit || 20;
        const entries = await effortController.getRecentEntries(userId, limit);
        res.json(entries);
    } catch (error) {
        log("error", `Failed to fetch recent effort entries: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch recent effort entries" });
    }
});

// --- Team members (for filter dropdowns) ---
router.get("/team", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching team members for effort filters", { userId }, getCallerInfo(), userId);
        const members = await effortController.getTeamMembers();
        res.json(members);
    } catch (error) {
        log("error", `Failed to fetch team members: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch team members" });
    }
});

// --- CSV Export ---
router.get("/export", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Exporting effort entries to CSV", { userId }, getCallerInfo(), userId);
        const { requirement_id, category, user_id, date_from, date_to } = req.query;
        const csv = await effortController.exportCSV(userId, { requirement_id, category, user_id, date_from, date_to });
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=effort.csv");
        res.send(csv);
    } catch (error) {
        log("error", `Failed to export effort CSV: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to export effort entries" });
    }
});

// --- List entries (with filters) ---
router.get("/", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching effort entries list", { userId }, getCallerInfo(), userId);
        const { requirement_id, category, user_id, date_from, date_to, limit, offset } = req.query;
        const entries = await effortController.listEntries(userId, { requirement_id, category, user_id, date_from, date_to, limit, offset });
        res.json(entries);
    } catch (error) {
        log("error", `Failed to fetch effort entries: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch effort entries" });
    }
});

// --- Create entry ---
router.post("/", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Creating effort entry", { userId }, getCallerInfo(), userId);
        const entry = await effortController.createEntry(userId, req.body);
        res.status(201).json(entry);
    } catch (error) {
        log("error", `Failed to create effort entry: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to create effort entry" });
    }
});

// --- Single entry by ID ---
router.get("/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching effort entry", { userId, entryId: req.params.id }, getCallerInfo(), userId);
        const entry = await effortController.getEntryById(userId, req.params.id);
        if (!entry) return res.status(404).json({ error: "Effort entry not found" });
        res.json(entry);
    } catch (error) {
        log("error", `Failed to fetch effort entry: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to fetch effort entry" });
    }
});

// --- Update entry ---
router.patch("/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Updating effort entry", { userId, entryId: req.params.id }, getCallerInfo(), userId);
        const updated = await effortController.updateEntry(userId, req.params.id, req.body);
        if (!updated) return res.status(404).json({ error: "Effort entry not found" });
        res.json(updated);
    } catch (error) {
        log("error", `Failed to update effort entry: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to update effort entry" });
    }
});

// --- Delete (archive) entry ---
router.delete("/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Deleting effort entry", { userId, entryId: req.params.id }, getCallerInfo(), userId);
        const deleted = await effortController.deleteEntry(userId, req.params.id);
        if (!deleted) return res.status(404).json({ error: "Effort entry not found" });
        res.json({ success: true });
    } catch (error) {
        log("error", `Failed to delete effort entry: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to delete effort entry" });
    }
});

module.exports = router;
