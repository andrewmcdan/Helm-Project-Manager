export default async function initRisks({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const { createInput, createSelect } = await loadDomHelpers();

    // ── Snapshot overview ──────────────────────────────────────────────
    const overviewTotal = document.querySelector("[data-risks-overview-total]");
    const overviewHighImpact = document.querySelector("[data-risks-overview-high-impact]");
    const overviewIdentified = document.querySelector("[data-risks-overview-identified]");
    const overviewMitigated = document.querySelector("[data-risks-overview-mitigated]");
    const overviewSummary = document.querySelector("[data-risks-overview-summary]");

    const loadRisksOverview = async () => {
        try {
            const response = await fetchWithAuth("/api/risks/summary");
            if (!response.ok) throw new Error("Failed to fetch risks summary");
            const summary = await response.json();
            const byStatus = summary.risks_by_status || {};
            const byImpact = summary.risks_by_impact || {};
            overviewTotal.textContent = String(summary.total_risks || 0);
            overviewHighImpact.textContent = String(Number(byImpact.High || 0) + Number(byImpact.Critical || 0));
            overviewIdentified.textContent = String(byStatus.Identified || 0);
            overviewMitigated.textContent = String(byStatus.Mitigated || 0);
            if (overviewSummary) {
                overviewSummary.textContent = `Updated ${new Date().toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load risks overview:", error);
            if (overviewSummary) overviewSummary.textContent = "Unable to load overview right now.";
        }
    };

    // ── Team members (for owner dropdowns) ─────────────────────────────
    let teamMembers = [];
    const loadTeamMembers = async () => {
        try {
            const response = await fetchWithAuth("/api/risks/team");
            if (!response.ok) throw new Error("Failed to fetch team");
            teamMembers = await response.json();
        } catch (error) {
            console.error("Failed to load team members:", error);
            teamMembers = [];
        }
    };

    const ownerOptions = () => [
        { value: "", label: "Unassigned" },
        ...teamMembers.map((m) => ({
            value: String(m.id),
            label: `${m.first_name} ${m.last_name}`,
        })),
    ];

    // ── Add risk modal ─────────────────────────────────────────────────
    const addRiskModal = document.getElementById("add_risk_modal");
    const addRiskForm = document.getElementById("add_risk_form");
    const closeAddRiskBtn = document.getElementById("close_add_risk_modal");
    const addRiskButton = document.querySelector("[data-add-risk-button]");
    const addRiskOwnerSelect = document.getElementById("add_risk__owner");

    const populateModalOwnerDropdown = () => {
        addRiskOwnerSelect.innerHTML = "";
        const opt0 = document.createElement("option");
        opt0.value = "";
        opt0.textContent = "Unassigned";
        addRiskOwnerSelect.appendChild(opt0);
        teamMembers.forEach((m) => {
            const opt = document.createElement("option");
            opt.value = String(m.id);
            opt.textContent = `${m.first_name} ${m.last_name}`;
            addRiskOwnerSelect.appendChild(opt);
        });
    };

    addRiskButton.addEventListener("click", () => {
        populateModalOwnerDropdown();
        addRiskModal.classList.add("is-visible");
        addRiskModal.setAttribute("aria-hidden", "false");
    });
    closeAddRiskBtn.addEventListener("click", () => {
        addRiskModal.classList.remove("is-visible");
        addRiskModal.setAttribute("aria-hidden", "true");
    });

    const createRisk = async (formData) => {
        const risk_title = formData.get("risk_title");
        const risk_code = formData.get("risk_code");
        const risk_likelihood = formData.get("risk_likelihood");
        const risk_impact = formData.get("risk_impact");
        const risk_status = formData.get("risk_status");
        if (!risk_title || !risk_title.trim()) {
            alert("Title is required");
            return false;
        }
        if (!risk_code || !risk_code.trim()) {
            alert("Risk code is required");
            return false;
        }
        if (!risk_likelihood) {
            alert("Likelihood is required");
            return false;
        }
        if (!risk_impact) {
            alert("Impact is required");
            return false;
        }
        try {
            const response = await fetchWithAuth("/api/risks/new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    risk_title,
                    risk_code,
                    risk_description: formData.get("risk_description") || "",
                    risk_likelihood,
                    risk_impact,
                    risk_status: risk_status || "Identified",
                    owner_id: formData.get("owner_id") || null,
                    mitigation_plan: formData.get("mitigation_plan") || "",
                }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to create risk");
            }
            await response.json();
            return true;
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to create risk: ${error.message}`);
            return false;
        }
    };

    document.getElementById("create_risk_button").addEventListener("click", async (event) => {
        event.preventDefault();
        showLoadingOverlay();
        const success = await createRisk(new FormData(addRiskForm));
        if (success) {
            addRiskModal.classList.remove("is-visible");
            addRiskModal.setAttribute("aria-hidden", "true");
            addRiskForm.reset();
            hideLoadingOverlay();
            await loadRisks();
            await loadRisksOverview();
            await loadRecentUpdates();
        } else {
            hideLoadingOverlay();
        }
    });

    document.getElementById("create_and_add_another_risk_button").addEventListener("click", async (event) => {
        event.preventDefault();
        showLoadingOverlay();
        const success = await createRisk(new FormData(addRiskForm));
        if (success) {
            addRiskForm.reset();
            populateModalOwnerDropdown();
            hideLoadingOverlay();
            await loadRisks();
            await loadRisksOverview();
            await loadRecentUpdates();
        } else {
            hideLoadingOverlay();
        }
    });

    // ── Filters ────────────────────────────────────────────────────────
    let risksFilterParams = {};
    let risksListLength = 20;

    const listLengthSelect = document.getElementById("risk-list-length");
    listLengthSelect.addEventListener("change", () => {
        risksListLength = parseInt(listLengthSelect.value, 10);
        loadRisks();
    });

    const searchInput = document.getElementById("risk-search");
    searchInput.addEventListener("input", () => {
        risksFilterParams = { ...risksFilterParams, search: searchInput.value.trim() };
        loadRisks();
    });

    const statusFilter = document.getElementById("risk-status");
    statusFilter.addEventListener("change", () => {
        risksFilterParams = { ...risksFilterParams, status: statusFilter.value };
        loadRisks();
    });

    const likelihoodFilter = document.getElementById("risk-likelihood");
    likelihoodFilter.addEventListener("change", () => {
        risksFilterParams = { ...risksFilterParams, likelihood: likelihoodFilter.value };
        loadRisks();
    });

    const impactFilter = document.getElementById("risk-impact");
    impactFilter.addEventListener("change", () => {
        risksFilterParams = { ...risksFilterParams, impact: impactFilter.value };
        loadRisks();
    });

    // ── Helpers ─────────────────────────────────────────────────────────
    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const formatDateTime = (value) => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    // ── Risk detail section (editable, like requirements) ──────────────
    const statusOptions = [
        { value: "Identified", label: "Identified" },
        { value: "Analyzed", label: "Analyzed" },
        { value: "Mitigated", label: "Mitigated" },
        { value: "Closed", label: "Closed" },
    ];
    const levelOptions = [
        { value: "Low", label: "Low" },
        { value: "Medium", label: "Medium" },
        { value: "High", label: "High" },
        { value: "Critical", label: "Critical" },
    ];

    const loadRiskDetails = async (riskId) => {
        const response = await fetchWithAuth(`/api/risks/byid/${riskId}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Failed to load risk details");
        }
        return response.json();
    };

    const saveRiskDetails = async (riskId) => {
        const section = document.getElementById("risk-details-section");
        if (!section) return;

        const titleInput = section.querySelector("[data-edit-title]");
        const descInput = section.querySelector("[data-edit-description]");
        const statusSelect = section.querySelector("[data-edit-status]");
        const likelihoodSelect = section.querySelector("[data-edit-likelihood]");
        const impactSelect = section.querySelector("[data-edit-impact]");
        const ownerSelect = section.querySelector("[data-edit-owner]");

        const title = titleInput?.value?.trim();
        if (!title) {
            alert("Title is required");
            return;
        }

        const payload = {
            risk_title: title,
            risk_description: descInput?.value?.trim() || "",
            risk_status: statusSelect?.value || "Identified",
            risk_likelihood: likelihoodSelect?.value || "Medium",
            risk_impact: impactSelect?.value || "Medium",
            owner_id: ownerSelect?.value || null,
        };

        try {
            showLoadingOverlay("Saving changes...");
            const response = await fetchWithAuth(`/api/risks/update/${riskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save risk");
            }
            const updated = await response.json();
            updateRiskDetailsSection(updated);
            await loadRisks();
            await loadRisksOverview();
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to save risk: ${error.message}`);
        }
    };

    const saveMitigationPlan = async (riskId) => {
        const section = document.getElementById("risk-mitigation-section");
        if (!section) return;
        const mitigationInput = section.querySelector("[data-edit-mitigation]");
        const payload = { mitigation_plan: mitigationInput?.value?.trim() || "" };

        try {
            showLoadingOverlay("Saving mitigation plan...");
            const response = await fetchWithAuth(`/api/risks/update/${riskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to save mitigation plan");
            }
            const updated = await response.json();
            updateRiskDetailsSection(updated);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to save mitigation plan: ${error.message}`);
        }
    };

    const updateRiskDetailsSection = (risk) => {
        const detailsSection = document.getElementById("risk-details-section");
        const mitigationSection = document.getElementById("risk-mitigation-section");
        if (!detailsSection || !mitigationSection || !risk) return;

        // ── Details card ───────────────────────────────────────────────
        detailsSection.innerHTML = "";

        const heading = document.createElement("h2");
        heading.textContent = "Risk details";
        detailsSection.appendChild(heading);

        const meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = `Editing ${escapeHtml(risk.risk_code)}`;
        detailsSection.appendChild(meta);

        // Title
        const titleRow = document.createElement("div");
        titleRow.className = "field";
        const titleLabel = document.createElement("label");
        titleLabel.textContent = "Title";
        titleLabel.setAttribute("for", "edit-risk-title");
        const titleInput = createInput("text", risk.risk_title || "", "data-edit-title");
        titleInput.id = "edit-risk-title";
        titleInput.required = true;
        titleRow.appendChild(titleLabel);
        titleRow.appendChild(titleInput);
        detailsSection.appendChild(titleRow);

        // Description
        const descRow = document.createElement("div");
        descRow.className = "field";
        const descLabel = document.createElement("label");
        descLabel.textContent = "Description";
        descLabel.setAttribute("for", "edit-risk-desc");
        const descTextarea = document.createElement("textarea");
        descTextarea.id = "edit-risk-desc";
        descTextarea.setAttribute("data-edit-description", "");
        descTextarea.rows = 3;
        descTextarea.value = risk.risk_description || "";
        descRow.appendChild(descLabel);
        descRow.appendChild(descTextarea);
        detailsSection.appendChild(descRow);

        // Status
        const statusRow = document.createElement("div");
        statusRow.className = "field";
        const statusLabel = document.createElement("label");
        statusLabel.textContent = "Status";
        statusLabel.setAttribute("for", "edit-risk-status");
        const statusSel = createSelect(statusOptions, risk.risk_status || "Identified", "data-edit-status");
        statusSel.id = "edit-risk-status";
        statusRow.appendChild(statusLabel);
        statusRow.appendChild(statusSel);
        detailsSection.appendChild(statusRow);

        // Likelihood
        const likelihoodRow = document.createElement("div");
        likelihoodRow.className = "field";
        const likelihoodLabel = document.createElement("label");
        likelihoodLabel.textContent = "Likelihood";
        likelihoodLabel.setAttribute("for", "edit-risk-likelihood");
        const likelihoodSel = createSelect(levelOptions, risk.risk_likelihood || "Medium", "data-edit-likelihood");
        likelihoodSel.id = "edit-risk-likelihood";
        likelihoodRow.appendChild(likelihoodLabel);
        likelihoodRow.appendChild(likelihoodSel);
        detailsSection.appendChild(likelihoodRow);

        // Impact
        const impactRow = document.createElement("div");
        impactRow.className = "field";
        const impactLabel = document.createElement("label");
        impactLabel.textContent = "Impact";
        impactLabel.setAttribute("for", "edit-risk-impact");
        const impactSel = createSelect(levelOptions, risk.risk_impact || "Medium", "data-edit-impact");
        impactSel.id = "edit-risk-impact";
        impactRow.appendChild(impactLabel);
        impactRow.appendChild(impactSel);
        detailsSection.appendChild(impactRow);

        // Owner
        const ownerRow = document.createElement("div");
        ownerRow.className = "field";
        const ownerLabel = document.createElement("label");
        ownerLabel.textContent = "Owner";
        ownerLabel.setAttribute("for", "edit-risk-owner");
        const ownerSel = createSelect(ownerOptions(), risk.owner_id ? String(risk.owner_id) : "", "data-edit-owner");
        ownerSel.id = "edit-risk-owner";
        ownerRow.appendChild(ownerLabel);
        ownerRow.appendChild(ownerSel);
        detailsSection.appendChild(ownerRow);

        // Action buttons
        const actions = document.createElement("div");
        actions.className = "span-actions";

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "button-small";
        saveBtn.textContent = "Save changes";
        saveBtn.addEventListener("click", () => saveRiskDetails(risk.id));
        actions.appendChild(saveBtn);

        const refreshBtn = document.createElement("button");
        refreshBtn.type = "button";
        refreshBtn.className = "button-small";
        refreshBtn.textContent = "Discard changes";
        refreshBtn.addEventListener("click", async () => {
            try {
                showLoadingOverlay("Reloading risk...");
                const fresh = await loadRiskDetails(risk.id);
                updateRiskDetailsSection(fresh);
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to refresh risk details: ${error.message}`);
            }
        });
        actions.appendChild(refreshBtn);

        detailsSection.appendChild(actions);

        // ── Mitigation card ────────────────────────────────────────────
        mitigationSection.innerHTML = "";

        const mitigHeading = document.createElement("h2");
        mitigHeading.textContent = "Mitigation plan";
        mitigationSection.appendChild(mitigHeading);

        const mitigMeta = document.createElement("p");
        mitigMeta.className = "meta";
        mitigMeta.textContent = `Mitigation for ${escapeHtml(risk.risk_code)}`;
        mitigationSection.appendChild(mitigMeta);

        const mitigRow = document.createElement("div");
        mitigRow.className = "field";
        const mitigLabel = document.createElement("label");
        mitigLabel.textContent = "Plan";
        mitigLabel.setAttribute("for", "edit-risk-mitigation");
        const mitigTextarea = document.createElement("textarea");
        mitigTextarea.id = "edit-risk-mitigation";
        mitigTextarea.setAttribute("data-edit-mitigation", "");
        mitigTextarea.rows = 5;
        mitigTextarea.value = risk.mitigation_plan || "";
        mitigRow.appendChild(mitigLabel);
        mitigRow.appendChild(mitigTextarea);
        mitigationSection.appendChild(mitigRow);

        const mitigActions = document.createElement("div");
        mitigActions.className = "span-actions";

        const mitigSaveBtn = document.createElement("button");
        mitigSaveBtn.type = "button";
        mitigSaveBtn.className = "button-small";
        mitigSaveBtn.textContent = "Save mitigation";
        mitigSaveBtn.addEventListener("click", () => saveMitigationPlan(risk.id));
        mitigActions.appendChild(mitigSaveBtn);

        const addUpdateBtn = document.createElement("button");
        addUpdateBtn.type = "button";
        addUpdateBtn.className = "button-small";
        addUpdateBtn.textContent = "Add update";
        addUpdateBtn.addEventListener("click", () => promptAddUpdate(risk.id));
        mitigActions.appendChild(addUpdateBtn);

        const viewHistoryBtn = document.createElement("button");
        viewHistoryBtn.type = "button";
        viewHistoryBtn.className = "button-small";
        viewHistoryBtn.textContent = "View history";
        viewHistoryBtn.addEventListener("click", () => showRiskHistory(risk.id, risk.risk_code));
        mitigActions.appendChild(viewHistoryBtn);

        mitigationSection.appendChild(mitigActions);
    };

    // ── Add update prompt ──────────────────────────────────────────────
    const promptAddUpdate = async (riskId) => {
        const note = prompt("Enter update note:");
        if (note === null) return;
        const updateType = prompt("Update type (Status Change, Mitigation Update, Owner Change, General Update):", "General Update");
        if (updateType === null) return;

        try {
            showLoadingOverlay("Adding update...");
            const response = await fetchWithAuth(`/api/risks/${riskId}/updates`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note, update_type: updateType }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to add update");
            }
            hideLoadingOverlay();
            await loadRecentUpdates();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to add update: ${error.message}`);
        }
    };

    // ── Risk history (in-page display) ─────────────────────────────────
    const showRiskHistory = async (riskId, riskCode) => {
        try {
            showLoadingOverlay("Loading history...");
            const response = await fetchWithAuth(`/api/risks/${riskId}/updates?limit=20`);
            if (!response.ok) throw new Error("Failed to load updates");
            const updates = await response.json();
            hideLoadingOverlay();
            if (!updates || updates.length === 0) {
                alert(`No updates recorded for ${riskCode}.`);
                return;
            }
            const lines = updates.map((u) => `[${formatDateTime(u.update_date)}]  ${u.update_type}: ${u.note || "(no note)"}  — ${u.updated_by_name || "Unknown"}`);
            alert(`History for ${riskCode}:\n\n${lines.join("\n\n")}`);
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to load history: ${error.message}`);
        }
    };

    // ── Risk table ─────────────────────────────────────────────────────
    const buildRiskTableRow = (risk) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(risk.risk_code)}</td>
            <td>${escapeHtml(risk.risk_title)}</td>
            <td>${escapeHtml(risk.risk_likelihood)}</td>
            <td>${escapeHtml(risk.risk_impact)}</td>
            <td><span class="badge">${escapeHtml(risk.risk_status)}</span></td>
            <td>${escapeHtml(risk.owner_name || "Unassigned")}</td>
            <td>${formatDateTime(risk.updated_at)}</td>
            <td>
                <button class="button" data-risk-details-btn="${risk.id}">Details</button>
                <button class="button" data-risk-archive-btn="${risk.id}">Archive</button>
            </td>
        `;

        tr.querySelector(`[data-risk-details-btn="${risk.id}"]`).addEventListener("click", async () => {
            try {
                showLoadingOverlay("Loading risk details...");
                const details = await loadRiskDetails(risk.id);
                updateRiskDetailsSection(details);
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to load risk details: ${error.message}`);
            }
        });

        tr.querySelector(`[data-risk-archive-btn="${risk.id}"]`).addEventListener("click", async () => {
            try {
                showLoadingOverlay("Archiving risk...");
                const res = await fetchWithAuth(`/api/risks/${risk.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ risk_status: "archived" }),
                });
                if (!res.ok) {
                    const err = await res.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to archive risk");
                }
                alert("Risk archived successfully");
                tr.remove();
                await loadRisksOverview();
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to archive risk: ${error.message}`);
            }
        });

        return tr;
    };

    const loadRisks = async () => {
        try {
            showLoadingOverlay();
            const numToShow = risksListLength || 20;
            const params = new URLSearchParams({ sortField: "updated_at", sortOrder: "desc" });
            if (risksFilterParams.search) params.set("search", risksFilterParams.search);
            if (risksFilterParams.status) params.set("status", risksFilterParams.status);
            if (risksFilterParams.likelihood) params.set("likelihood", risksFilterParams.likelihood);
            if (risksFilterParams.impact) params.set("impact", risksFilterParams.impact);

            const response = await fetchWithAuth(`/api/risks/filter/0/${numToShow}?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch risks");
            const risks = await response.json();
            const tableBody = document.getElementById("risks-table-body");
            tableBody.innerHTML = "";
            if (!Array.isArray(risks) || risks.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8">No risks found.</td></tr>';
                hideLoadingOverlay();
                return;
            }
            risks.forEach((risk) => tableBody.appendChild(buildRiskTableRow(risk)));
            updateRiskDetailsSection(risks[0]);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to load risks: ${error.message}`);
        }
    };

    // ── Recent updates table ───────────────────────────────────────────
    const loadRecentUpdates = async () => {
        try {
            const response = await fetchWithAuth("/api/risks/recent-updates?limit=10");
            if (!response.ok) throw new Error("Failed to fetch recent updates");
            const updates = await response.json();
            const tbody = document.getElementById("recent-updates-body");
            tbody.innerHTML = "";
            if (!Array.isArray(updates) || updates.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">No updates yet.</td></tr>';
                return;
            }
            updates.forEach((u) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${formatDateTime(u.update_date)}</td>
                    <td>${escapeHtml(u.risk_code)}</td>
                    <td>${escapeHtml(u.note || u.update_type)}</td>
                    <td>${escapeHtml(u.updated_by_name)}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (error) {
            console.error("Failed to load recent updates:", error);
        }
    };

    // ── Export ──────────────────────────────────────────────────────────
    const exportButton = document.querySelector("[data-export-risks-button]");
    exportButton.addEventListener("click", async () => {
        try {
            showLoadingOverlay("Exporting risks...");
            const response = await fetchWithAuth("/api/risks/export/csv?sortField=updated_at&sortOrder=desc");
            if (!response.ok) throw new Error("Failed to export risks");
            const csvData = await response.text();
            const blob = new Blob([csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "risks.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to export risks: ${error.message}`);
        }
    });

    // ── Initial load ───────────────────────────────────────────────────
    await loadTeamMembers();
    await loadRisks();
    await loadRisksOverview();
    await loadRecentUpdates();
}

// ── Module loaders (same pattern as requirements.js) ───────────────────
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
