export default async function initDashboard({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const { createInput, createSelect } = await loadDomHelpers();

    bindQuickActions();

    await Promise.allSettled([
        loadDashboardSummary(fetchWithAuth),
        loadEffortByCategory(fetchWithAuth),
        loadRecentActivity(fetchWithAuth),
        loadAttentionNeeded(fetchWithAuth),
    ]);

    const stamp = document.querySelector("[data-last-updated]");
    if (stamp) {
        stamp.textContent = new Date().toLocaleString();
    }

    const usersDataEl = document.getElementById("users-data");
    let usersData = [];
    let currentUserId = null;
    try {
        const parsed = usersDataEl ? JSON.parse(usersDataEl.textContent) : {};
        usersData = parsed.users || [];
        currentUserId = parsed.currentUserId || null;
    } catch (error) {
        usersData = [];
        console.error("Failed to parse users data", error);
    }

    const resetUserPassword = async (userId) => {
        const response = await fetchWithAuth(`/api/users/reset-user-password/${userId}`, {
            method: "GET",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "Failed to reset password");
        }
    };

    const emailForm = document.getElementById("email-user-form");
    if (emailForm) {
        emailForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            showLoadingOverlay();
            try {
                const formData = new FormData(emailForm);
                const payload = {
                    username: formData.get("username"),
                    subject: formData.get("subject"),
                    message: formData.get("message"),
                };
                const response = await fetchWithAuth("/api/users/email-user", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(payload),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Failed to send email");
                }
                alert("Email sent successfully");
                emailForm.reset();
            } catch (error) {
                alert(error.message || "Failed to send email");
            } finally {
                hideLoadingOverlay();
            }
        });
    }

    const actionButtons = document.querySelectorAll("[data-user-action]");
    if (actionButtons.length) {
        const actionConfig = {
            approve: {
                request: (userId) =>
                    fetchWithAuth(`/api/users/approve-user/${userId}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }),
                success: "User approved successfully",
                rowSelector: (userId) => `[data-user_id-${userId}]`,
                containerSelector: "[data-user-approvals-list]",
                emptySelector: "[data-user-approvals-empty]",
                emptyMessage: "No pending user approvals",
            },
            reject: {
                request: (userId) =>
                    fetchWithAuth(`/api/users/reject-user/${userId}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }),
                success: "User rejected successfully",
                rowSelector: (userId) => `[data-user_id-${userId}]`,
                containerSelector: "[data-user-approvals-list]",
                emptySelector: "[data-user-approvals-empty]",
                emptyMessage: "No pending user approvals",
            },
            reinstate: {
                request: (userId) =>
                    fetchWithAuth(`/api/users/reinstate-user/${userId}`, {
                        method: "GET",
                        headers: { "Content-Type": "application/json" },
                    }),
                success: "User reinstated successfully",
                rowSelector: (userId) => `[data-suspended_user_id-${userId}]`,
                containerSelector: "[data-suspended-users-list]",
                emptySelector: "[data-suspended-users-empty]",
                emptyMessage: "No suspended user accounts",
            },
            "reset-password": {
                request: async (userId) => {
                    await resetUserPassword(userId);
                    return { ok: true, json: async () => ({}) };
                },
                success: "Password reset successfully. An email has been sent to the user with the new password.",
                rowSelector: (userId) => `[data-expired-password-row-${userId}]`,
                containerSelector: "[data-expired-passwords-list]",
                emptySelector: "[data-expired-passwords-empty]",
                emptyMessage: "No users with expired passwords",
            },
        };

        actionButtons.forEach((button) => {
            button.addEventListener("click", async () => {
                const action = button.dataset.userAction;
                const userId = button.dataset.userId;
                const config = actionConfig[action];
                if (!config || !userId) {
                    return;
                }

                showLoadingOverlay();
                try {
                    const response = await config.request(userId);
                    if (!response.ok) {
                        const data = await response.json().catch(() => ({}));
                        throw new Error(data.error || `Failed to ${action.replace("-", " ")}`);
                    }
                    alert(config.success);
                    const row = document.querySelector(config.rowSelector(userId));
                    if (row) {
                        row.remove();
                        ensureEmptyState(config.containerSelector, config.emptySelector, config.emptyMessage);
                    }
                } catch (error) {
                    alert(error.message || `Failed to ${action.replace("-", " ")}`);
                } finally {
                    hideLoadingOverlay();
                }
            });
        });
    }

    const tableColumns = ["fullname", "email", "role", "status", "created_at", "last_login_at", "suspension_start_at", "suspension_end_at", "address", "password_expires_at"];
    const dateColumns = ["last_login_at", "suspension_start_at", "suspension_end_at", "created_at", "password_expires_at"];
    const modifyTableCell = (user, column, _value, isDate = false) => {
        const selector = `[data-${column}-${user.id}]`;
        const cell = document.querySelector(selector);
        if (!cell) {
            return;
        }

        const handleClick = () => {
            cell.removeEventListener("click", handleClick);
            const inputAttr = `data-input-${column}-${user.id}`;
            const currentValue = column === "fullname" ? `${user.first_name || ""} ${user.last_name || ""}`.trim() : user[column];
            if (isDate) {
                const dateValue = currentValue ? new Date(currentValue).toISOString().slice(0, 16) : "";
                const input = createInput("datetime-local", dateValue, inputAttr);
                cell.replaceChildren(input);
            } else if (column === "role") {
                const roleOptions = [
                    { value: "administrator", label: "Administrator" },
                    { value: "manager", label: "Manager" },
                    { value: "coder", label: "Coder" },
                    { value: "viewer", label: "Viewer" },
                ];
                const select = createSelect(roleOptions, currentValue, inputAttr);
                cell.replaceChildren(select);
            } else if (column === "status") {
                const statusOptions = [
                    { value: "active", label: "Active" },
                    { value: "pending", label: "Pending" },
                    { value: "suspended", label: "Suspended" },
                    { value: "deactivated", label: "Deactivated" },
                    { value: "rejected", label: "Rejected" },
                ];
                const select = createSelect(statusOptions, currentValue, inputAttr);
                cell.replaceChildren(select);
            } else {
                const input = createInput("text", currentValue || "", inputAttr);
                cell.replaceChildren(input);
            }

            const inputEl = cell.querySelector(`[data-input-${column}-${user.id}]`);
            inputEl.focus();
            inputEl.addEventListener("blur", async () => {
                const newValue = inputEl.value;
                cell.textContent = newValue;
                if (newValue !== currentValue) {
                    const payload = {
                        user_id: user.id,
                        field: column,
                        value: newValue,
                    };
                    try {
                        const response = await fetchWithAuth("/api/users/update-user-field", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify(payload),
                        });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) {
                            throw new Error(data.error || "Failed to update user field");
                        }
                    } catch (error) {
                        alert(error.message || "Failed to update user field");
                        cell.textContent = currentValue;
                    }
                }
                cell.addEventListener("click", handleClick);
            });
            inputEl.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                    inputEl.blur();
                }
            });
            inputEl.addEventListener("click", (event) => {
                event.stopPropagation();
            });
        };

        cell.addEventListener("click", handleClick);
    };

    if (usersData.length) {
        for (const user of usersData) {
            for (const column of tableColumns) {
                modifyTableCell(user, column, user[column], dateColumns.includes(column));
            }
        }
    }

    const refreshButton = document.querySelector("[data-refresh]");
    if (refreshButton) {
        refreshButton.addEventListener("click", () => {
            location.reload();
        });
    }

    const createUserForm = document.getElementById("create-user-form");
    if (createUserForm) {
        createUserForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            showLoadingOverlay();
            try {
                const formData = new FormData(createUserForm);
                const requestedRole = formData.get("role");
                const response = await fetchWithAuth("/api/users/create-user", {
                    method: "POST",
                    body: formData,
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || data.message || "Failed to create user");
                }
                const createdUserId = data?.user?.id;
                if (createdUserId) {
                    const assignResponse = await fetchWithAuth("/api/team/assign-member", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ user_id: createdUserId, role: requestedRole }),
                    });
                    const assignData = await assignResponse.json().catch(() => ({}));
                    if (!assignResponse.ok) {
                        throw new Error(assignData.error || "User account created, but assignment to the active project failed");
                    }
                }
                alert("User created successfully");
                createUserForm.reset();
                location.reload();
            } catch (error) {
                alert(error.message || "Failed to create user");
            } finally {
                hideLoadingOverlay();
            }
        });
    }

    const suspendUserForm = document.getElementById("suspend-user-form");
    if (suspendUserForm) {
        suspendUserForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            showLoadingOverlay();
            try {
                const formData = new FormData(suspendUserForm);
                const usernameToSuspend = formData.get("suspend_username");
                const matchedUser = usersData.find((user) => user.username === usernameToSuspend && user.status === "active" && user.id !== currentUserId);
                if (!matchedUser) {
                    throw new Error("Invalid username selected");
                }

                const suspensionStartRaw = formData.get("suspension_start_date");
                const suspensionEndRaw = formData.get("suspension_end_date");
                if (!suspensionStartRaw || !suspensionEndRaw) {
                    throw new Error("Please fill in all fields");
                }

                const suspensionStartDate = new Date(suspensionStartRaw);
                const suspensionEndDate = new Date(suspensionEndRaw);
                if (Number.isNaN(suspensionStartDate.getTime()) || Number.isNaN(suspensionEndDate.getTime())) {
                    throw new Error("Please provide valid suspension dates");
                }
                if (suspensionEndDate <= suspensionStartDate) {
                    throw new Error("Suspension end date must be after start date");
                }

                const response = await fetchWithAuth("/api/users/suspend-user", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        userIdToSuspend: matchedUser.id,
                        suspensionStart: suspensionStartDate.toISOString(),
                        suspensionEnd: suspensionEndDate.toISOString(),
                    }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || data.message || "Failed to suspend user");
                }
                alert("User suspended successfully");
                suspendUserForm.reset();
                location.reload();
            } catch (error) {
                alert(error.message || "Failed to suspend user");
            } finally {
                hideLoadingOverlay();
            }
        });
    }

    const deleteUserForm = document.getElementById("delete-user-form");
    if (deleteUserForm) {
        deleteUserForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            showLoadingOverlay();
            try {
                const formData = new FormData(deleteUserForm);
                const usernameToDelete = formData.get("username");
                if (!usernameToDelete) {
                    throw new Error("Please enter a username to delete");
                }
                const userToDelete = usersData.find((user) => user.username === usernameToDelete);
                if (!userToDelete) {
                    throw new Error("User not found");
                }
                if (userToDelete.id === currentUserId) {
                    throw new Error("You cannot delete your own account");
                }
                const confirmDelete = confirm(`Are you sure you want to delete user "${usernameToDelete}"? This action cannot be undone.`);
                if (!confirmDelete) {
                    return;
                }

                const response = await fetchWithAuth("/api/users/delete-user", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userIdToDelete: userToDelete.id }),
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    throw new Error(data.error || "Failed to delete user");
                }
                alert("User deleted successfully");
                deleteUserForm.reset();
                location.reload();
            } catch (error) {
                if (error.message) {
                    alert(error.message);
                }
            } finally {
                hideLoadingOverlay();
            }
        });
    }

    const resetPasswordForm = document.getElementById("reset-password-form");
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            showLoadingOverlay();
            try {
                const formData = new FormData(resetPasswordForm);
                const username = formData.get("username");
                if (!username) {
                    throw new Error("Please enter a username to reset password");
                }
                const user = usersData.find((candidate) => candidate.username === username);
                if (!user) {
                    throw new Error("User not found");
                }
                await resetUserPassword(user.id);
                alert("Password reset successfully. An email has been sent to the user with the new password.");
                resetPasswordForm.reset();
            } catch (error) {
                alert(error.message || "Failed to reset password");
            } finally {
                hideLoadingOverlay();
            }
        });
    }
}

function bindQuickActions() {
    const bindings = [
        { selector: "[data-add-requirement-button]", hash: "#/requirements?add_requirement=true" },
        { selector: "[data-log-effort-button]", hash: "#/effort" },
        { selector: "[data-add-risk-button]", hash: "#/risks?add_risk=true" },
        { selector: "[data-view-requirements-button]", hash: "#/requirements" },
        { selector: "[data-view-effort-report-button]", hash: "#/effort?totals=1" },
    ];

    const navigateTo = (hash) => {
        const targetUrl = new URL(`/${hash.replace(/^\/?/, "")}`, window.location.origin);
        window.location.href = targetUrl.toString();
    };

    bindings.forEach(({ selector, hash }) => {
        const button = document.querySelector(selector);
        if (button) {
            button.addEventListener("click", () => {
                navigateTo(hash);
            });
        }
    });
}

async function loadDashboardSummary(fetchWithAuth) {
    const projectNameEl = document.querySelector("[data-project-name]");
    const projectOwnerEl = document.querySelector("[data-project-owner]");
    const projectTeamSizeEl = document.querySelector("[data-team-size]");
    const projectSummaryEl = document.querySelector("[data-project-summary]");
    const metricTotalRequirementsEl = document.querySelector("[data-metric-total-requirements]");
    const metricRequirementsBreakdownEl = document.querySelector("[data-metric-requirements-breakdown]");
    const metricEffortWeekEl = document.querySelector("[data-metric-effort-week]");
    const metricEffortWeekMetaEl = document.querySelector("[data-metric-effort-week-meta]");
    const metricEffortTotalEl = document.querySelector("[data-metric-effort-total]");
    const metricEffortTotalMetaEl = document.querySelector("[data-metric-effort-total-meta]");
    const metricOpenRisksEl = document.querySelector("[data-metric-open-risks]");
    const metricOpenRisksMetaEl = document.querySelector("[data-metric-open-risks-meta]");

    try {
        const response = await fetchWithAuth("/api/dashboard/summary", {
            method: "GET",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "Failed to load dashboard summary");
        }

        if (projectNameEl) {
            projectNameEl.textContent = data.project_name || "Not configured";
        }
        if (projectOwnerEl) {
            projectOwnerEl.textContent = data.project_owner || "Not assigned";
        }
        if (projectTeamSizeEl) {
            projectTeamSizeEl.textContent = String(data.team_size ?? 0);
        }
        if (projectSummaryEl) {
            projectSummaryEl.textContent = data.project_summary || "No active project summary is available yet.";
        }

        const metrics = data.metrics || {};
        const requirementsByType = metrics.requirements_by_type || {};
        if (metricTotalRequirementsEl) {
            metricTotalRequirementsEl.textContent = String(metrics.total_requirements ?? 0);
        }
        if (metricRequirementsBreakdownEl) {
            metricRequirementsBreakdownEl.textContent = `${requirementsByType.Functional || 0} functional · ${requirementsByType["Non-functional"] || 0} non-functional`;
        }
        if (metricEffortWeekEl) {
            metricEffortWeekEl.textContent = formatHours(metrics.effort_this_week_hours);
        }
        if (metricEffortWeekMetaEl) {
            metricEffortWeekMetaEl.textContent = `Across ${metrics.effort_this_week_entries || 0} entries`;
        }
        if (metricEffortTotalEl) {
            metricEffortTotalEl.textContent = formatHours(metrics.effort_total_hours);
        }
        if (metricEffortTotalMetaEl) {
            metricEffortTotalMetaEl.textContent = `${metrics.effort_total_entries || 0} total entries`;
        }
        if (metricOpenRisksEl) {
            metricOpenRisksEl.textContent = String(metrics.open_risks ?? 0);
        }
        if (metricOpenRisksMetaEl) {
            metricOpenRisksMetaEl.textContent = formatOpenRiskBreakdown(metrics.open_risks_by_impact);
        }
    } catch (error) {
        console.error("Error fetching dashboard summary:", error);
        const fallbackValue = "Unavailable";
        if (projectNameEl) {
            projectNameEl.textContent = fallbackValue;
        }
        if (projectOwnerEl) {
            projectOwnerEl.textContent = fallbackValue;
        }
        if (projectTeamSizeEl) {
            projectTeamSizeEl.textContent = fallbackValue;
        }
        if (projectSummaryEl) {
            projectSummaryEl.textContent = "Unable to load project summary.";
        }
        const metricElements = [
            metricTotalRequirementsEl,
            metricRequirementsBreakdownEl,
            metricEffortWeekEl,
            metricEffortWeekMetaEl,
            metricEffortTotalEl,
            metricEffortTotalMetaEl,
            metricOpenRisksEl,
            metricOpenRisksMetaEl,
        ];
        metricElements.forEach((element) => {
            if (element) {
                element.textContent = fallbackValue;
            }
        });
    }
}

async function loadEffortByCategory(fetchWithAuth) {
    const body = document.querySelector("[data-effort-by-category-body]");
    if (!body) {
        return;
    }

    try {
        const response = await fetchWithAuth("/api/dashboard/effort-by-category?range=week", {
            method: "GET",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "Failed to load effort categories");
        }

        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
            body.replaceChildren(createTableMessageRow("No effort has been logged yet this week.", 3));
            return;
        }

        body.replaceChildren(
            ...items.map((item) => {
                const row = document.createElement("tr");
                row.append(
                    createTableCell(item.category || "Uncategorized"),
                    createTableCell(formatNumber(item.hours)),
                    createTableBadgeCell(item.trend || "Steady"),
                );
                return row;
            }),
        );
    } catch (error) {
        console.error("Error fetching effort by category:", error);
        body.replaceChildren(createTableMessageRow("Unable to load effort categories.", 3));
    }
}

async function loadRecentActivity(fetchWithAuth) {
    const container = document.querySelector("[data-recent-activity-list]");
    if (!container) {
        return;
    }

    try {
        const response = await fetchWithAuth("/api/dashboard/recent-activity?limit=6", {
            method: "GET",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "Failed to load recent activity");
        }

        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
            container.replaceChildren(createMetaParagraph("No recent activity yet."));
            return;
        }

        container.replaceChildren(...items.map(createRecentActivityRow));
    } catch (error) {
        console.error("Error fetching recent activity:", error);
        container.replaceChildren(createMetaParagraph("Unable to load recent activity."));
    }
}

async function loadAttentionNeeded(fetchWithAuth) {
    const container = document.querySelector("[data-attention-needed-list]");
    if (!container) {
        return;
    }

    try {
        const response = await fetchWithAuth("/api/dashboard/attention-needed?limit=4", {
            method: "GET",
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data.error || "Failed to load follow-up items");
        }

        const items = Array.isArray(data.items) ? data.items : [];
        if (!items.length) {
            container.replaceChildren(createMetaParagraph("No urgent follow-up items right now."));
            return;
        }

        container.replaceChildren(...items.map(createAttentionRow));
    } catch (error) {
        console.error("Error fetching attention-needed items:", error);
        container.replaceChildren(createMetaParagraph("Unable to load follow-up items."));
    }
}

function createRecentActivityRow(item) {
    const row = document.createElement("article");
    row.className = "data-row";

    const value = document.createElement("p");
    value.className = "value";
    const spanLabel = document.createElement("span");
    spanLabel.className = "span-label";
    const label = document.createElement("span");
    label.textContent = item.label || "Activity";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item.type || "Update";
    spanLabel.append(label, badge);
    value.append(spanLabel);

    const meta = document.createElement("p");
    meta.className = "meta";
    const detail = item.detail ? `${item.detail} · ` : "";
    meta.textContent = `${detail}${formatRelativeTime(item.occurred_at)} by ${item.actor_name || "Unknown"}`;

    row.append(value, meta);
    return row;
}

function createAttentionRow(item) {
    const row = document.createElement("article");
    row.className = "data-row";

    const value = document.createElement("p");
    value.className = "value";
    const spanLabel = document.createElement("span");
    spanLabel.className = "span-label";
    const label = document.createElement("span");
    label.textContent = item.title || "Follow-up needed";
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = item.badge || "Review";
    spanLabel.append(label, badge);
    value.append(spanLabel);

    const meta = document.createElement("p");
    meta.className = "meta";
    meta.textContent = item.detail || "Needs attention.";

    row.append(value, meta);
    return row;
}

function ensureEmptyState(containerSelector, emptySelector, message) {
    const container = document.querySelector(containerSelector);
    if (!container) {
        return;
    }

    const hasRows = container.querySelector(".data-row");
    if (hasRows) {
        return;
    }

    let emptyMessage = document.querySelector(emptySelector);
    if (!emptyMessage) {
        emptyMessage = createMetaParagraph(message);
        const cleanSelector = emptySelector.replace(/^\[|\]$/g, "");
        if (cleanSelector) {
            emptyMessage.setAttribute(cleanSelector, "");
        }
        container.append(emptyMessage);
        return;
    }
    emptyMessage.textContent = message;
}

function createTableCell(text) {
    const cell = document.createElement("td");
    cell.textContent = text;
    return cell;
}

function createTableBadgeCell(text) {
    const cell = document.createElement("td");
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = text;
    cell.append(badge);
    return cell;
}

function createTableMessageRow(message, colspan) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = colspan;
    cell.className = "meta";
    cell.textContent = message;
    row.append(cell);
    return row;
}

function createMetaParagraph(message) {
    const paragraph = document.createElement("p");
    paragraph.className = "meta";
    paragraph.textContent = message;
    return paragraph;
}

function formatHours(value) {
    const hours = Number(value || 0);
    return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)} hrs`;
}

function formatNumber(value) {
    const amount = Number(value || 0);
    return amount.toFixed(amount % 1 === 0 ? 0 : 1);
}

function formatOpenRiskBreakdown(breakdown = {}) {
    const parts = ["Critical", "High", "Medium", "Low"]
        .map((level) => ({ level, count: Number(breakdown[level] || 0) }))
        .filter((item) => item.count > 0)
        .map((item) => `${item.count} ${item.level.toLowerCase()}`);

    return parts.length ? parts.join(" · ") : "No open risks";
}

function formatRelativeTime(value) {
    if (!value) {
        return "Recently";
    }

    const timestamp = new Date(value).getTime();
    if (Number.isNaN(timestamp)) {
        return "Recently";
    }

    const diffMs = Date.now() - timestamp;
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;

    if (diffMs < minute) {
        return "Just now";
    }
    if (diffMs < hour) {
        const minutes = Math.max(1, Math.round(diffMs / minute));
        return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    }
    if (diffMs < day) {
        const hours = Math.max(1, Math.round(diffMs / hour));
        return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    }
    const days = Math.max(1, Math.round(diffMs / day));
    return `${days} day${days === 1 ? "" : "s"} ago`;
}

async function loadDomHelpers() {
    const moduleUrl = new URL("/js/utils/dom_helpers.js", window.location.origin).href;
    const module = await import(moduleUrl);
    const { createInput, createSelect } = module;
    return { createInput, createSelect };
}

async function loadFetchWithAuth() {
    const moduleUrl = new URL("/js/utils/fetch_with_auth.js", window.location.origin).href;
    const module = await import(moduleUrl);
    const { fetchWithAuth } = module;
    return { fetchWithAuth };
}
