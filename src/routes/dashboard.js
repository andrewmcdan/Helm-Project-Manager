const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const dashboardController = require("../controllers/dashboard");

router.get("/summary", async (req, res) => {
    try {
        log("debug", "Fetching dashboard summary data", { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        const projData = await dashboardController.getActiveProjectSnapshot();
        if (!projData) {
            log("warn", "No active project data found for dashboard summary", { userId: req.user?.id }, getCallerInfo(), req.user?.id);
            return res.status(404).json({ error: "No active project data found" });
        }
        const summaryData = {
            project_name: projData.project_name,
            project_owner: projData.project_owner,
            team_size: projData.team_size,
            project_summary: projData.project_summary
        };
        res.json(summaryData);
    } catch (error) {
        log("error", `Failed to fetch dashboard summary data: ${error.message}`, { userId: req.user?.id }, getCallerInfo(), req.user?.id);
        res.status(500).json({ error: "Failed to fetch dashboard summary data" });
    }
});

module.exports = router;