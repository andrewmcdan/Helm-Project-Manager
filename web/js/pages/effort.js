export default async function initEffort({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const getUrlParam = await loadUrlParamHelper();

    // --- URL params from requirements page ---
    const paramRequirementId = getUrlParam("requirement_id");
    const paramRequirementCode = getUrlParam("requirement_code");
    const paramRequirementTitle = getUrlParam("requirement_title");
    const paramTotals = getUrlParam("totals");

    // --- DOM references ---
    const form = document.getElementById("effort-entry-form");
    const modeRadios = form.querySelectorAll('input[name="effort_mode"]');
    const dateField = document.getElementById("effort-date-field");
    const weekField = document.getElementById("effort-week-field");
    const dateInput = document.getElementById("effort-date");
    const weekInput = document.getElementById("effort-week");
    const requirementSelect = document.getElementById("effort-requirement");
    const categorySelect = document.getElementById("effort-category");
    const hoursInput = document.getElementById("effort-hours");
    const notesInput = document.getElementById("effort-notes");
    const saveBtn = document.getElementById("effort-save-btn");
    const saveAnotherBtn = document.getElementById("effort-save-another-btn");
    const contextBanner = document.getElementById("effort-context-banner");

    const filterRangeSelect = document.getElementById("effort-range");
    const filterUserSelect = document.getElementById("effort-user");
    const filterCategorySelect = document.getElementById("effort-filter-category");
    const applyFiltersBtn = document.getElementById("effort-apply-filters-btn");
    const downloadCsvBtn = document.getElementById("effort-download-csv-btn");

    const byRequirementBody = document.getElementById("effort-by-requirement-body");
    const byCategoryBody = document.getElementById("effort-by-category-body");
    const recentBody = document.getElementById("effort-recent-body");

    const recentEntryLabel = document.getElementById("effort-recent-entry-label");
    const recentEntryDetail = document.getElementById("effort-recent-entry-detail");

    // --- Set today as default date ---
    const todayStr = new Date().toISOString().slice(0, 10);
    dateInput.value = todayStr;

    // --- Entry mode toggle ---
    const updateModeFields = () => {
        const mode = form.querySelector('input[name="effort_mode"]:checked')?.value || "Daily";
        if (mode === "Daily") {
            dateField.style.display = "";
            weekField.style.display = "none";
        } else {
            dateField.style.display = "none";
            weekField.style.display = "";
        }
    };
    modeRadios.forEach((radio) => radio.addEventListener("change", updateModeFields));
    updateModeFields();

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

    // --- Populate dropdowns ---
    const populateRequirements = async () => {
        try {
            const res = await fetchWithAuth("/api/requirements/filter/0/999?sortField=requirement_code_prefix&sortOrder=asc");
            if (!res.ok) return;
            const requirements = await res.json();
            requirementSelect.innerHTML = '<option value="">Select requirement</option>';
            requirements.forEach((req) => {
                const code = `${req.requirement_code_prefix}-${req.requirement_code_number}`;
                const opt = document.createElement("option");
                opt.value = String(req.id);
                opt.textContent = `${code} · ${req.title}`;
                requirementSelect.appendChild(opt);
            });
            // Pre-select from URL param
            if (paramRequirementId) {
                requirementSelect.value = paramRequirementId;
            }
        } catch (error) {
            console.error("Failed to load requirements for effort form:", error);
        }
    };

    const populateCategories = async () => {
        try {
            const res = await fetchWithAuth("/api/effort/categories");
            if (!res.ok) return;
            const categories = await res.json();
            categorySelect.innerHTML = '<option value="">Select category</option>';
            filterCategorySelect.innerHTML = '<option value="">All categories</option>';
            categories.forEach((cat) => {
                const opt1 = document.createElement("option");
                opt1.value = cat;
                opt1.textContent = cat;
                categorySelect.appendChild(opt1);
                const opt2 = document.createElement("option");
                opt2.value = cat;
                opt2.textContent = cat;
                filterCategorySelect.appendChild(opt2);
            });
        } catch (error) {
            console.error("Failed to load categories:", error);
        }
    };

    const populateTeamMembers = async () => {
        try {
            const res = await fetchWithAuth("/api/effort/team");
            if (!res.ok) return;
            const members = await res.json();
            filterUserSelect.innerHTML = '<option value="">All users</option>';
            members.forEach((m) => {
                const opt = document.createElement("option");
                opt.value = String(m.id);
                opt.textContent = m.name;
                filterUserSelect.appendChild(opt);
            });
        } catch (error) {
            console.error("Failed to load team members:", error);
        }
    };

    // --- Show context banner if navigated from a requirement ---
    if (paramRequirementCode || paramRequirementTitle) {
        const label = [paramRequirementCode, paramRequirementTitle].filter(Boolean).join(" · ");
        contextBanner.textContent = `Logging effort for: ${label}`;
        contextBanner.style.display = "";
    }

    // --- Date range helper for filters ---
    const getDateRangeFromSelect = () => {
        const val = filterRangeSelect.value;
        const now = new Date();
        let date_from = null;
        let date_to = null;

        if (val === "this_week") {
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1; // Monday start
            const monday = new Date(now);
            monday.setDate(now.getDate() - diff);
            date_from = monday.toISOString().slice(0, 10);
            date_to = now.toISOString().slice(0, 10);
        } else if (val === "last_week") {
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1;
            const thisMonday = new Date(now);
            thisMonday.setDate(now.getDate() - diff);
            const lastMonday = new Date(thisMonday);
            lastMonday.setDate(thisMonday.getDate() - 7);
            const lastSunday = new Date(thisMonday);
            lastSunday.setDate(thisMonday.getDate() - 1);
            date_from = lastMonday.toISOString().slice(0, 10);
            date_to = lastSunday.toISOString().slice(0, 10);
        } else if (val === "this_month") {
            date_from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
            date_to = now.toISOString().slice(0, 10);
        }
        return { date_from, date_to };
    };

    const buildFilterParams = () => {
        const params = new URLSearchParams();
        const { date_from, date_to } = getDateRangeFromSelect();
        if (date_from) params.set("date_from", date_from);
        if (date_to) params.set("date_to", date_to);
        if (filterUserSelect.value) params.set("user_id", filterUserSelect.value);
        if (filterCategorySelect.value) params.set("category", filterCategorySelect.value);
        return params;
    };

    // --- Load summary (totals tables) ---
    const loadSummary = async () => {
        try {
            const params = buildFilterParams();
            const res = await fetchWithAuth(`/api/effort/summary?${params.toString()}`);
            if (!res.ok) throw new Error("Failed to load summary");
            const data = await res.json();

            // Totals by requirement
            byRequirementBody.innerHTML = "";
            if (data.by_requirement.length === 0) {
                byRequirementBody.innerHTML = '<tr><td colspan="5">No effort entries found.</td></tr>';
            } else {
                data.by_requirement.forEach((row) => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${esc(row.requirement_code)}</td>
                        <td>${esc(row.requirement_title)}</td>
                        <td>${row.total_hours.toFixed(2)}</td>
                        <td>${formatDate(row.last_entry)}</td>
                        <td class="span-actions">
                            <button type="button" class="button-small" data-view-req="${row.requirement_id}">View requirement</button>
                            <button type="button" class="button-small" data-log-for-req="${row.requirement_id}" data-log-for-code="${esc(row.requirement_code)}">Log effort</button>
                        </td>
                    `;
                    tr.querySelector(`[data-view-req="${row.requirement_id}"]`).addEventListener("click", () => {
                        window.location.href = `/#/requirements?highlight=${row.requirement_id}`;
                    });
                    tr.querySelector(`[data-log-for-req="${row.requirement_id}"]`).addEventListener("click", () => {
                        requirementSelect.value = String(row.requirement_id);
                        document.getElementById("effort-form-section").scrollIntoView({ behavior: "smooth" });
                    });
                    byRequirementBody.appendChild(tr);
                });
            }

            // Totals by category
            byCategoryBody.innerHTML = "";
            if (data.by_category.length === 0) {
                byCategoryBody.innerHTML = '<tr><td colspan="3">No effort entries found.</td></tr>';
            } else {
                data.by_category.forEach((row) => {
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${esc(row.category)}</td>
                        <td>${row.total_hours.toFixed(2)}</td>
                        <td><span class="badge">${row.share}%</span></td>
                    `;
                    byCategoryBody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error("Failed to load effort summary:", error);
            byRequirementBody.innerHTML = '<tr><td colspan="5">Unable to load totals.</td></tr>';
            byCategoryBody.innerHTML = '<tr><td colspan="3">Unable to load totals.</td></tr>';
        }
    };

    // --- Load recent entries ---
    const loadRecentEntries = async () => {
        try {
            const params = new URLSearchParams();
            if (paramRequirementId) params.set("requirement_id", paramRequirementId);
            params.set("limit", "20");
            const url = paramRequirementId ? `/api/effort?${params.toString()}` : `/api/effort/recent?limit=20`;
            const res = await fetchWithAuth(url);
            if (!res.ok) throw new Error("Failed to load recent entries");
            const entries = await res.json();

            recentBody.innerHTML = "";
            if (entries.length === 0) {
                recentBody.innerHTML = '<tr><td colspan="6">No effort entries yet.</td></tr>';
            } else {
                entries.forEach((entry) => {
                    const tr = document.createElement("tr");
                    const entryDate = entry.entry_date ? formatDate(entry.entry_date) : formatDate(entry.week_of);
                    tr.innerHTML = `
                        <td>${esc(entryDate)}</td>
                        <td>${esc(entry.requirement_code || "—")}</td>
                        <td>${esc(entry.category || "—")}</td>
                        <td>${entry.effort_amount.toFixed(2)}</td>
                        <td>${esc(entry.user_name)}</td>
                        <td class="span-actions">
                            <button type="button" class="button-small" data-del-entry="${entry.id}">Delete</button>
                        </td>
                    `;
                    tr.querySelector(`[data-del-entry="${entry.id}"]`).addEventListener("click", async () => {
                        if (!confirm("Delete this effort entry?")) return;
                        try {
                            showLoadingOverlay("Deleting...");
                            const delRes = await fetchWithAuth(`/api/effort/${entry.id}`, { method: "DELETE" });
                            if (!delRes.ok) {
                                const errData = await delRes.json().catch(() => ({}));
                                throw new Error(errData.error || "Failed to delete");
                            }
                            hideLoadingOverlay();
                            await refreshAll();
                        } catch (err) {
                            hideLoadingOverlay();
                            alert(`Failed to delete entry: ${err.message}`);
                        }
                    });
                    recentBody.appendChild(tr);
                });

                // Update safeguard recent-entry display
                const latest = entries[0];
                if (latest && recentEntryLabel && recentEntryDetail) {
                    recentEntryLabel.textContent = `${latest.effort_amount.toFixed(1)} hrs · ${latest.category || "—"}`;
                    recentEntryDetail.textContent = `${latest.requirement_code || "—"} logged ${formatDate(latest.entry_date || latest.week_of)} by ${latest.user_name}`;
                }
            }
        } catch (error) {
            console.error("Failed to load recent entries:", error);
            recentBody.innerHTML = '<tr><td colspan="6">Unable to load entries.</td></tr>';
        }
    };

    // --- Refresh all data ---
    const refreshAll = async () => {
        await Promise.all([loadSummary(), loadRecentEntries()]);
    };

    // --- Submit entry ---
    const submitEntry = async (keepFormOpen) => {
        const mode = form.querySelector('input[name="effort_mode"]:checked')?.value || "Daily";
        const requirementId = requirementSelect.value;
        const category = categorySelect.value;
        const hours = hoursInput.value;
        const notes = notesInput.value;

        if (!requirementId) {
            alert("Please select a requirement.");
            return false;
        }
        if (!category) {
            alert("Please select a category.");
            return false;
        }
        if (!hours || parseFloat(hours) <= 0) {
            alert("Hours must be a positive number.");
            return false;
        }

        const payload = {
            effort_mode: mode,
            requirement_id: requirementId,
            category,
            hours,
            notes,
        };
        if (mode === "Daily") {
            payload.date = dateInput.value || todayStr;
        } else {
            payload.week_of = weekInput.value;
            if (!payload.week_of) {
                alert("Please select a week-of date.");
                return false;
            }
        }

        try {
            showLoadingOverlay("Saving effort entry...");
            const res = await fetchWithAuth("/api/effort", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.error || "Failed to save effort entry");
            }
            await res.json();
            hideLoadingOverlay();

            if (keepFormOpen) {
                // Reset everything except requirement
                const currentReq = requirementSelect.value;
                hoursInput.value = "";
                notesInput.value = "";
                requirementSelect.value = currentReq;
            } else {
                form.reset();
                dateInput.value = todayStr;
                updateModeFields();
                if (paramRequirementId) {
                    requirementSelect.value = paramRequirementId;
                }
            }

            await refreshAll();
            return true;
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to save effort entry: ${error.message}`);
            return false;
        }
    };

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        await submitEntry(false);
    });

    saveAnotherBtn.addEventListener("click", async () => {
        await submitEntry(true);
    });

    // --- Filters ---
    applyFiltersBtn.addEventListener("click", async () => {
        showLoadingOverlay("Applying filters...");
        await refreshAll();
        hideLoadingOverlay();
    });

    downloadCsvBtn.addEventListener("click", async () => {
        try {
            showLoadingOverlay("Exporting...");
            const params = buildFilterParams();
            const res = await fetchWithAuth(`/api/effort/export?${params.toString()}`);
            if (!res.ok) throw new Error("Export failed");
            const csvData = await res.text();
            const blob = new Blob([csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "effort.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to export: ${error.message}`);
        }
    });

    // --- Initial load ---
    showLoadingOverlay("Loading effort data...");
    await Promise.all([populateRequirements(), populateCategories(), populateTeamMembers()]);
    await refreshAll();
    hideLoadingOverlay();

    // If totals=1 param, scroll to totals section
    if (paramTotals === "1") {
        setTimeout(() => {
            const totalsSection = document.getElementById("effort-totals-section");
            if (totalsSection) totalsSection.scrollIntoView({ behavior: "smooth" });
        }, 300);
    }
}

async function loadFetchWithAuth() {
    const moduleUrl = new URL("/js/utils/fetch_with_auth.js", window.location.origin).href;
    const module = await import(moduleUrl);
    return { fetchWithAuth: module.fetchWithAuth };
}

async function loadUrlParamHelper() {
    const moduleUrl = new URL("/js/utils/url_params.js", window.location.origin).href;
    const module = await import(moduleUrl);
    return module.default;
}
