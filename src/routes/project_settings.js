const express = require("express");
const router = express.Router();
const { log } = require("../utils/logger");
const { getCallerInfo } = require("../utils/utilities");
const projectSettingsController = require("../controllers/project_settings");
const { isAdmin } = require("../controllers/users");

function loggedInCheck(req, res, next) {
    const userId = req.user?.id;
    const loggedIn = req.user?.loggedIn;
    if (!userId || !loggedIn) {
        log("warn", "Unauthorized access to project-settings route", {}, getCallerInfo());
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

// --- Get current project settings ---
router.get("/", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching project settings", { userId }, getCallerInfo(), userId);
        const settings = await projectSettingsController.getSettings();
        if (!settings) {
            return res.status(404).json({ error: "No project settings found" });
        }

        // Include user role info so client can enable/disable editing
        const admin = await isAdmin(userId, req.user?.token);
        res.json({ ...settings, is_admin: admin });
    } catch (error) {
        log("error", `Failed to fetch project settings: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch project settings" });
    }
});

// --- Update project settings (admin only) ---
router.patch("/", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Updating project settings", { userId }, getCallerInfo(), userId);

        const admin = await isAdmin(userId, req.user?.token);
        if (!admin) {
            log("warn", "Non-admin attempted to update project settings", { userId }, getCallerInfo(), userId);
            return res.status(403).json({ error: "Only administrators can update project settings" });
        }

        const result = await projectSettingsController.updateSettings(userId, req.body);
        res.json(result);
    } catch (error) {
        log("error", `Failed to update project settings: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(getStatusCodeForError(error)).json({ error: error.message || "Failed to update project settings" });
    }
});

// --- Get change log ---
router.get("/change-log", loggedInCheck, async (req, res) => {
    const userId = req.user?.id;
    try {
        log("debug", "Fetching project settings change log", { userId }, getCallerInfo(), userId);
        const settings = await projectSettingsController.getSettings();
        if (!settings) {
            return res.status(404).json({ error: "No project settings found" });
        }
        const { limit, offset } = req.query;
        const changeLog = await projectSettingsController.getChangeLog(settings.id, limit, offset);
        res.json(changeLog);
    } catch (error) {
        log("error", `Failed to fetch change log: ${error.message}`, { userId }, getCallerInfo(), userId);
        res.status(500).json({ error: "Failed to fetch change log" });
    }
});

module.exports = router;
