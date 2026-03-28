const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const dashboardController = require("../controllers/dashboard");

function loggedInCheck(req, res, next) {
    const userId = req.user?.id;
    const loggedIn = req.user?.loggedIn;
    if (!userId || !loggedIn) {
        log("warn", "Unauthorized access to dashboard route", {}, getCallerInfo());
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

router.get("/summary", loggedInCheck, async (req, res) => {
    try {
        log("debug", "Fetching dashboard summary data", { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        const summaryData = await dashboardController.getDashboardSummary();
        res.json(summaryData);
    } catch (error) {
        log("error", `Failed to fetch dashboard summary data: ${error.message}`, { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        res.status(500).json({ error: "Failed to fetch dashboard summary data" });
    }
});

router.get("/effort-by-category", loggedInCheck, async (req, res) => {
    try {
        log("debug", "Fetching dashboard effort by category", { userId: req.user?.id, range: req.query.range }, getCallerInfo(), req.user?.id);
        const categories = await dashboardController.getEffortByCategory(req.query.range);
        res.json({ items: categories });
    } catch (error) {
        log("error", `Failed to fetch dashboard effort by category: ${error.message}`, { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        res.status(500).json({ error: "Failed to fetch dashboard effort by category" });
    }
});

router.get("/recent-activity", loggedInCheck, async (req, res) => {
    try {
        log("debug", "Fetching dashboard recent activity", { userId: req.user?.id, limit: req.query.limit }, getCallerInfo(), req.user?.id);
        const items = await dashboardController.getRecentActivity(req.query.limit);
        res.json({ items });
    } catch (error) {
        log("error", `Failed to fetch dashboard recent activity: ${error.message}`, { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        res.status(500).json({ error: "Failed to fetch dashboard recent activity" });
    }
});

router.get("/attention-needed", loggedInCheck, async (req, res) => {
    try {
        log("debug", "Fetching dashboard attention-needed items", { userId: req.user?.id, limit: req.query.limit }, getCallerInfo(), req.user?.id);
        const items = await dashboardController.getAttentionNeeded(req.query.limit);
        res.json({ items });
    } catch (error) {
        log("error", `Failed to fetch dashboard attention-needed items: ${error.message}`, { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        res.status(500).json({ error: "Failed to fetch dashboard attention-needed items" });
    }
});

module.exports = router;
