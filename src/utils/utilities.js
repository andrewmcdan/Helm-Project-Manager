const db = require("../db/db.js");
const fs = require("fs").promises;
const path = require("path");
const {log} = require("./logger.js");

function getCallerInfo() {
    const stack = new Error().stack;
    const lines = stack.split("\n").map((l) => l.trim());

    const caller = lines[2] || lines[1];

    const match = caller.match(/\((.*):(\d+):(\d+)\)$/) || caller.match(/at (.*):(\d+):(\d+)$/);

    if (!match) return null;

    return {
        file: match[1],
        line: Number(match[2]),
        column: Number(match[3]),
    };
}

function sanitizeInput(input) {
    if (typeof input !== "string") {
        return input;
    }
    let sanitized1 = input.replace(/[<>&"'`]/g, (char) => {
        switch (char) {
            case "<":
                return "&lt;";
            case ">":
                return "&gt;";
            case "&":
                return "&amp;";
            case '"':
                return "&quot;";
            case "'":
                return "&#x27;";
            case "`":
                return "&#x60;";
            default:
                return char;
        }
    });
    let sanitized2 = sanitized1.replace(/'/g, "''");
    let sanitized3 = sanitized2.replace(/[$.]/g, "");
    return sanitized3;
}

function generateRandomToken(length = 32) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let token = "";
    for (let i = 0; i < length; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}

async function cleanupLogs() {
    const appLogsRetentionDays = parseInt(process.env.APP_LOGS_RETENTION_DAYS) || 30;
    const auditLogsRetentionDays = parseInt(process.env.AUDIT_LOGS_RETENTION_DAYS) || 180;
    try {
        const appLogsCutoff = new Date(Date.now() - appLogsRetentionDays * 24 * 60 * 60 * 1000);
        const auditLogsCutoff = new Date(Date.now() - auditLogsRetentionDays * 24 * 60 * 60 * 1000);
        const appLogsResult = await db.query("DELETE FROM app_logs WHERE created_at < $1 RETURNING *", [appLogsCutoff]);
        const auditLogsResult = await db.query("DELETE FROM audit_logs WHERE created_at < $1 RETURNING *", [auditLogsCutoff]);
        log("info", `Cleaned up logs: ${appLogsResult.rowCount} app logs and ${auditLogsResult.rowCount} audit logs deleted`, {}, getCallerInfo());
    } catch (error) {
        log("error", `Error during cleanupLogs: ${error.message}`, {}, getCallerInfo());
    }
}

module.exports = {
    getCallerInfo,
    sanitizeInput,
    generateRandomToken,
    cleanupLogs,   
};
