const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const requirementsController = require("../controllers/requirements");

function loggedInCheck(req, res, next) {
    const userId = req.user?.id;
    const loggedIn = req.user?.loggedIn;
    if(!userId || !loggedIn){
        log("warn", "Unauthorized access to requirements route", {}, getCallerInfo());
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}


router.get("/:offset/:count", loggedInCheck, async (req, res) => {
    const offset = parseInt(req.params.offset, 10) || 0;
    const count = parseInt(req.params.count, 10) || 10;
    const userId = req.user?.id;
    if(isNaN(offset) || isNaN(count) || offset < 0 || count <= 0){
        log("warn", "Invalid offset or count for requirements listing", { userId, offset: req.params.offset, count: req.params.count }, getCallerInfo(), userId);
        return res.status(400).json({ error: "Invalid offset or count" });
    }
    try {
        log("debug", "Fetching requirements list", { userId, offset, count }, getCallerInfo(), userId);
        const {filterField, filterValue, filterMin, filterMax, sortField, sortOrder} = req.query;
        const requirements = await requirementsController.listRequirements(userId, req.user.token, offset,  count, {
            filterField,
            filterValue,
            filterMin,
            filterMax,
            sortField,
            sortOrder
        });
        res.json({ requirements });
    } catch (error) {
        log("error", `Failed to fetch requirements: ${error.message}`, { userId, offset, count }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch requirements" });
    }
});

router.get("/count", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching requirements count", { userId }, getCallerInfo(), userId);
        const {filterField, filterValue, filterMin, filterMax} = req.query;
        const count = await requirementsController.countRequirements(userId, req.user.token, {
            filterField,
            filterValue,
            filterMin,
            filterMax
        });
        res.json({ count });
    } catch (error) {
        log("error", `Failed to fetch requirements count: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch requirements count" });
    }
});

router.get("/summary", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching requirements summary", { userId }, getCallerInfo(), userId);
        // TODO: call the getRequirementsSummary() function from requirementsController
        const summary = {
            total_requirements: 0,
            requirements_by_status: {},
            requirements_by_priority: {},
        };
        res.json(summary);
    }catch (error) { 
        log("error", `Failed to fetch requirements summary: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch requirements summary" });
    }
});

router.post("/", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Creating new requirement", { userId }, getCallerInfo(), userId);
        const requirementData = req.body;
        // TODO: call the createRequirement() function from requirementsController
        const newRequirement = {};
        res.status(201).json(newRequirement);
    } catch (error) {
        log("error", `Failed to create requirement: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to create requirement" });
    }
});

router.get("/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const requirementId = req.params.id;
        log("debug", "Fetching requirement details", { userId, requirementId }, getCallerInfo(), userId);
        // TODO: call the getRequirementById() function from requirementsController
        const requirement = null;
        if (!requirement) {
            log("warn", "Requirement not found", { userId, requirementId }, getCallerInfo(), userId);
            return res.status(404).json({ error: "Requirement not found" });
        }
        res.json(requirement);
    } catch (error) {
        log("error", `Failed to fetch requirement: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch requirement" });
    }
});

router.patch("/:id", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const requirementId = req.params.id;
        log("debug", "Updating requirement", { userId, requirementId }, getCallerInfo(), userId);
        const updateData = req.body;
        // TODO: call the updateRequirement() function from requirementsController
        const updatedRequirement = {};
        res.json(updatedRequirement);
    } catch (error) {
        log("error", `Failed to update requirement: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to update requirement" });
    }
});

router.get("/:id/totals", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        const requirementId = req.params.id;
        log("debug", "Fetching requirement totals", { userId, requirementId }, getCallerInfo(), userId);
        // TODO: call the getRequirementTotals() function from requirementsController
        const totals = {
            total_efforts: 0,
            last_effort_date: null,
            total_comments: 0,
        };
        res.json(totals);
    } catch (error) {
        log("error", `Failed to fetch requirement totals: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch requirement totals" });
    }
});

router.get("/export/csv", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Exporting requirements to CSV", { userId }, getCallerInfo(), userId);
        const {filterField, filterValue, filterMin, filterMax, sortField, sortOrder} = req.query;
        // TODO: call the exportRequirementsToCSV() function from requirementsController
        const csvData = "id,title,description\n"; // Placeholder CSV header
        res.setHeader("Content-Disposition", "attachment; filename=requirements_export.csv");
        res.setHeader("Content-Type", "text/csv");
        res.send(csvData);
    } catch (error) {
        log("error", `Failed to export requirements to CSV: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to export requirements to CSV" });
    }
});

module.exports = router;

