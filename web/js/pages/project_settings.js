export default async function initProjectSettings({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();

    // --- DOM references ---
    const adminNotice = document.getElementById("ps-admin-notice");
    const summaryName = document.getElementById("ps-summary-name");
    const summaryOwner = document.getElementById("ps-summary-owner");
    const summaryTeamSize = document.getElementById("ps-summary-team-size");

    const saveBtn = document.getElementById("ps-save-btn");
    const resetBtn = document.getElementById("ps-reset-btn");
    const viewDashboardBtn = document.getElementById("ps-view-dashboard-btn");
    const viewTeamBtn = document.getElementById("ps-view-team-btn");

    const form = document.getElementById("ps-form");
    const nameInput = document.getElementById("ps-project-name");
    const ownerInput = document.getElementById("ps-project-owner");
    const descriptionInput = document.getElementById("ps-project-description");
    const emailInput = document.getElementById("ps-project-email");
    const statusSelect = document.getElementById("ps-project-status");

    const effortModeSelect = document.getElementById("ps-effort-mode");
    const weekStartDaySelect = document.getElementById("ps-week-start-day");
    const effortRoundingSelect = document.getElementById("ps-effort-rounding");

    const changeLogBody = document.getElementById("ps-change-log-body");
    const loadMoreBtn = document.getElementById("ps-load-more-btn");

    // All editable fields (for enable/disable toggling)
    const editableFields = [nameInput, ownerInput, descriptionInput, emailInput, statusSelect, effortModeSelect, weekStartDaySelect, effortRoundingSelect];

    let isAdmin = false;
    let changeLogOffset = 0;
    const CHANGE_LOG_PAGE_SIZE = 20;

    // --- Escape HTML helper ---
    const esc = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    // --- Format date helper ---
    const formatDate = (value) => {
        if (!value) return "—";
        const d = new Date(value);
        if (isNaN(d.getTime())) return String(value);
        return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    };

    // --- Populate form from settings data ---
    const populateForm = (settings) => {
        // Summary card
        summaryName.textContent = settings.project_name || "—";
        summaryOwner.textContent = settings.project_owner_name || "—";
        summaryTeamSize.textContent = String(settings.team_size ?? 0);

        // Form fields
        nameInput.value = settings.project_name || "";
        ownerInput.value = settings.project_owner_name || "";
        descriptionInput.value = settings.project_description || "";
        emailInput.value = settings.project_owner_email || "";
        statusSelect.value = settings.project_status || "Active";

        // Effort defaults
        effortModeSelect.value = settings.effort_default_mode || "Daily";
        weekStartDaySelect.value = settings.week_start_day || "Monday";
        effortRoundingSelect.value = String(settings.effort_rounding ?? 0.25);
    };

    // --- Toggle editing based on admin role ---
    const applyAdminState = () => {
        editableFields.forEach((field) => {
            field.disabled = !isAdmin;
        });
        saveBtn.style.display = isAdmin ? "" : "none";
        resetBtn.style.display = isAdmin ? "" : "none";
        adminNotice.style.display = isAdmin ? "none" : "";
    };

    // --- Load settings from API ---
    const loadSettings = async () => {
        const res = await fetchWithAuth("/api/project-settings");
        if (!res.ok) {
            if (res.status === 404) {
                summaryName.textContent = "No project configured";
                changeLogBody.innerHTML = '<tr><td colspan="3">No project settings found.</td></tr>';
                editableFields.forEach((f) => (f.disabled = true));
                saveBtn.style.display = "none";
                return null;
            }
            throw new Error("Failed to load project settings");
        }
        const settings = await res.json();
        isAdmin = settings.is_admin === true;
        populateForm(settings);
        applyAdminState();
        return settings;
    };

    // --- Load change log ---
    const loadChangeLog = async (append = false) => {
        try {
            const res = await fetchWithAuth(`/api/project-settings/change-log?limit=${CHANGE_LOG_PAGE_SIZE}&offset=${changeLogOffset}`);
            if (!res.ok) throw new Error("Failed to load change log");
            const entries = await res.json();

            if (!append) {
                changeLogBody.innerHTML = "";
            }

            if (entries.length === 0 && !append) {
                changeLogBody.innerHTML = '<tr><td colspan="3">No changes recorded yet.</td></tr>';
                loadMoreBtn.style.display = "none";
                return;
            }

            entries.forEach((entry) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${esc(formatDate(entry.changed_at))}</td>
                    <td>${esc(entry.change_description)}</td>
                    <td>${esc(entry.changed_by_name)}</td>
                `;
                changeLogBody.appendChild(tr);
            });

            changeLogOffset += entries.length;
            loadMoreBtn.style.display = entries.length >= CHANGE_LOG_PAGE_SIZE ? "" : "none";
        } catch (error) {
            console.error("Failed to load change log:", error);
            if (!append) {
                changeLogBody.innerHTML = '<tr><td colspan="3">Unable to load change log.</td></tr>';
            }
            loadMoreBtn.style.display = "none";
        }
    };

    // --- Collect form data ---
    const collectFormData = () => ({
        project_name: nameInput.value.trim(),
        project_owner_name: ownerInput.value.trim(),
        project_description: descriptionInput.value.trim(),
        project_owner_email: emailInput.value.trim(),
        project_status: statusSelect.value,
        effort_default_mode: effortModeSelect.value,
        week_start_day: weekStartDaySelect.value,
        effort_rounding: effortRoundingSelect.value,
    });

    // --- Save settings ---
    const saveSettings = async () => {
        const data = collectFormData();
        if (!data.project_name) {
            alert("Project name is required.");
            nameInput.focus();
            return;
        }

        try {
            showLoadingOverlay("Saving project settings...");
            const res = await fetchWithAuth("/api/project-settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to save project settings");
            }
            const result = await res.json();
            if (result.changesApplied) {
                populateForm(result.settings);
                changeLogOffset = 0;
                await loadChangeLog(false);
            }
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to save: ${error.message}`);
        }
    };

    // --- Event listeners ---
    saveBtn.addEventListener("click", saveSettings);

    resetBtn.addEventListener("click", async () => {
        showLoadingOverlay("Resetting...");
        try {
            await loadSettings();
        } catch (error) {
            console.error("Failed to reset:", error);
        }
        hideLoadingOverlay();
    });

    viewDashboardBtn.addEventListener("click", () => {
        window.location.hash = "#/dashboard";
    });

    viewTeamBtn.addEventListener("click", () => {
        window.location.hash = "#/team";
    });

    loadMoreBtn.addEventListener("click", () => {
        loadChangeLog(true);
    });

    // --- Initial load ---
    showLoadingOverlay("Loading project settings...");
    try {
        await loadSettings();
        await loadChangeLog(false);
    } catch (error) {
        console.error("Failed to initialize project settings:", error);
    }
    hideLoadingOverlay();
}

async function loadFetchWithAuth() {
    const moduleUrl = new URL("/js/utils/fetch_with_auth.js", window.location.origin).href;
    const module = await import(moduleUrl);
    return { fetchWithAuth: module.fetchWithAuth };
}
