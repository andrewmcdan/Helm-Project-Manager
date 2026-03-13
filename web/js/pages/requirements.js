export default async function initRequirements({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const { createInput, createSelect } = await loadDomHelpers();
    const getUrlParamFn = await loadUrlParamHelper();

    const addReqUrlParam = getUrlParamFn("add_requirement");
    if (addReqUrlParam === "true") {
        // trigger click event on the "Create Requirement" button to open the modal
        setTimeout(() => {
            document.querySelector("[data-create-requirement-button]").click();
        }, 500);
    }

    const requirementsOverviewTotal = document.querySelector("[data-requirements-overview-total]");
    const requirementsOverviewFunctional = document.querySelector("[data-requirements-overview-functional]");
    const requirementsOverviewNonFunctional = document.querySelector("[data-requirements-overview-non-functional]");
    const requirementsOverviewInDevelopment = document.querySelector("[data-requirements-overview-in-development]");
    const requirementsOverviewSummary = document.querySelector("[data-requirements-overview-summary]");

    const loadRequirementsOverview = async () => {
        if (!requirementsOverviewTotal || !requirementsOverviewFunctional || !requirementsOverviewNonFunctional || !requirementsOverviewInDevelopment) {
            return;
        }
        try {
            const response = await fetchWithAuth("/api/requirements/summary");
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to fetch requirements summary");
            }
            const summary = await response.json().catch(() => ({}));
            const byType = summary.requirements_by_type || {};
            const byStatus = summary.requirements_by_status || {};
            const totalRequirements = Number(summary.total_requirements || 0);
            const functionalCount = Number(byType.Functional || 0);
            const nonFunctionalCount = Number(byType["Non-functional"] || 0);
            const inDevelopmentCount = Number(byStatus["In Development"] || 0);

            requirementsOverviewTotal.textContent = String(totalRequirements);
            requirementsOverviewFunctional.textContent = String(functionalCount);
            requirementsOverviewNonFunctional.textContent = String(nonFunctionalCount);
            requirementsOverviewInDevelopment.textContent = String(inDevelopmentCount);
            if (requirementsOverviewSummary) {
                requirementsOverviewSummary.textContent = `Updated ${new Date().toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load requirements overview:", error);
            if (requirementsOverviewSummary) {
                requirementsOverviewSummary.textContent = "Unable to load overview right now.";
            }
        }
    };

    const logEffortButton = document.querySelector("[data-log-effort-button]");
    logEffortButton.addEventListener("click", () => {
        window.location.href = "/#/effort";
    });

    const viewEffortTotalsButton = document.querySelector("[data-view-effort-totals-button]");
    viewEffortTotalsButton.addEventListener("click", () => {
        window.location.href = "/#/effort?totals=1";
    });

    const createRequirementButton = document.querySelector("[data-create-requirement-button]");
    const addRequirementModal = document.getElementById("add_requirement_modal");
    createRequirementButton.addEventListener("click", async () => {
        addRequirementModal.classList.add("is-visible");
        addRequirementModal.setAttribute("aria-hidden", "false");
    });
    const addCloseRequirementModalBtn = document.getElementById("close_add_requirement_modal");
    addCloseRequirementModalBtn.addEventListener("click", () => {
        addRequirementModal.classList.remove("is-visible");
        addRequirementModal.setAttribute("aria-hidden", "true");
        hideCodeSuggestions();
        hideTagSuggestions();
    });

    const addRequirementCodeInput = document.getElementById("add_requirement__code");
    const addRequirementCodeSuggestions = document.getElementById("add_requirement__code_suggestions");
    let activeCodeSuggestionIndex = -1;
    let requirementCodes = [];
    const loadRequirementCodes = async () => {
        try {
            const response = await fetchWithAuth("/api/requirements/requirement-codes");
            requirementCodes = await response.json().catch(() => []);
        } catch (error) {
            console.error("Failed to load requirement codes:", error);
            requirementCodes = [];
        }
        return requirementCodes;
    };
    const hideCodeSuggestions = () => {
        addRequirementCodeSuggestions.classList.remove("is-visible");
        addRequirementCodeSuggestions.innerHTML = "";
        activeCodeSuggestionIndex = -1;
    };
    const getCurrentCodeFilter = () => {
        const value = addRequirementCodeInput.value;
        const [prefix] = value.split("-");
        return (prefix || "").trim();
    };
    const applyCodeSuggestion = (code) => {
        const value = addRequirementCodeInput.value;
        const parts = value.split("-");
        const suffix = parts.length > 1 ? parts.slice(1).join("-").trim() : "";
        addRequirementCodeInput.value = suffix ? `${code}-${suffix}` : code;
        addRequirementCodeInput.focus();
        hideCodeSuggestions();
    };
    const updateActiveCodeSuggestion = (buttons, newIndex) => {
        buttons.forEach((button, index) => {
            if (index === newIndex) {
                button.classList.add("is-active");
                button.setAttribute("aria-selected", "true");
                button.scrollIntoView({ block: "nearest" });
            } else {
                button.classList.remove("is-active");
                button.setAttribute("aria-selected", "false");
            }
        });
        activeCodeSuggestionIndex = newIndex;
    };
    const renderCodeSuggestions = (items) => {
        addRequirementCodeSuggestions.innerHTML = "";
        if (!items || items.length === 0) {
            hideCodeSuggestions();
            return;
        }
        activeCodeSuggestionIndex = -1;
        items.forEach((item) => {
            const code = item.code || item;
            const description = item.description || "";
            const button = document.createElement("button");
            button.type = "button";
            button.className = "suggestion-item";
            button.setAttribute("aria-selected", "false");
            button.textContent = description ? `${code} — ${description}` : code;
            button.dataset.codeValue = code;
            button.addEventListener("click", () => {
                applyCodeSuggestion(code);
            });
            addRequirementCodeSuggestions.appendChild(button);
        });
        addRequirementCodeSuggestions.classList.add("is-visible");
    };
    loadRequirementCodes();
    addRequirementCodeInput.addEventListener("input", () => {
        const code = addRequirementCodeInput.value;
        addRequirementCodeInput.value = code.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
        const filter = getCurrentCodeFilter().toUpperCase();
        if (!filter) {
            hideCodeSuggestions();
            return;
        }
        const suggestions = requirementCodes.filter((item) => {
            const value = (item.code || item).toString().toUpperCase();
            return value.startsWith(filter);
        });
        renderCodeSuggestions(suggestions);
    });
    addRequirementCodeInput.addEventListener("blur", () => {
        setTimeout(() => {
            hideCodeSuggestions();
        }, 150);
    });
    addRequirementCodeInput.addEventListener("keydown", (event) => {
        if (!addRequirementCodeSuggestions.classList.contains("is-visible")) {
            return;
        }
        const buttons = Array.from(addRequirementCodeSuggestions.querySelectorAll(".suggestion-item"));
        if (buttons.length === 0) {
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            const nextIndex = activeCodeSuggestionIndex < buttons.length - 1 ? activeCodeSuggestionIndex + 1 : 0;
            updateActiveCodeSuggestion(buttons, nextIndex);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            const nextIndex = activeCodeSuggestionIndex > 0 ? activeCodeSuggestionIndex - 1 : buttons.length - 1;
            updateActiveCodeSuggestion(buttons, nextIndex);
        } else if (event.key === "Enter") {
            if (activeCodeSuggestionIndex >= 0) {
                event.preventDefault();
                const selected = buttons[activeCodeSuggestionIndex];
                if (selected) {
                    applyCodeSuggestion(selected.dataset.codeValue || selected.textContent);
                }
            }
        } else if (event.key === "Escape") {
            hideCodeSuggestions();
        }
    });

    const addRequirementTagsInput = document.getElementById("add_requirement__tags");
    const addRequirementTagsSuggestions = document.getElementById("add_requirement__tags_suggestions");
    let activeTagSuggestionIndex = -1;
    let tags = [];
    const loadTags = async (filter) => {
        try {
            const response = await fetchWithAuth(`/api/requirements/requirement-tags/10?filter=${encodeURIComponent(filter)}`);
            tags = await response.json().catch(() => []);
        } catch (error) {
            console.error("Failed to load requirement tags:", error);
            tags = [];
        }
        return tags;
    };
    const hideTagSuggestions = () => {
        addRequirementTagsSuggestions.classList.remove("is-visible");
        addRequirementTagsSuggestions.innerHTML = "";
        activeTagSuggestionIndex = -1;
    };
    const getCurrentTagFilter = () => {
        const value = addRequirementTagsInput.value;
        const parts = value.split(",");
        return (parts[parts.length - 1] || "").trim();
    };
    const applyTagSuggestion = (tag) => {
        const parts = addRequirementTagsInput.value.split(",");
        parts[parts.length - 1] = ` ${tag}`;
        const normalized = parts
            .map((part) => part.trim())
            .filter((part) => part.length > 0)
            .join(", ");
        addRequirementTagsInput.value = normalized.length > 0 ? `${normalized}, ` : "";
        addRequirementTagsInput.focus();
        hideTagSuggestions();
    };
    const updateActiveTagSuggestion = (buttons, newIndex) => {
        buttons.forEach((button, index) => {
            if (index === newIndex) {
                button.classList.add("is-active");
                button.setAttribute("aria-selected", "true");
                button.scrollIntoView({ block: "nearest" });
            } else {
                button.classList.remove("is-active");
                button.setAttribute("aria-selected", "false");
            }
        });
        activeTagSuggestionIndex = newIndex;
    };
    const renderTagSuggestions = (items) => {
        addRequirementTagsSuggestions.innerHTML = "";
        if (!items || items.length === 0) {
            hideTagSuggestions();
            return;
        }
        activeTagSuggestionIndex = -1;
        items.forEach((tag) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "suggestion-item";
            button.setAttribute("aria-selected", "false");
            button.textContent = tag;
            button.addEventListener("click", () => {
                applyTagSuggestion(tag);
            });
            addRequirementTagsSuggestions.appendChild(button);
        });
        addRequirementTagsSuggestions.classList.add("is-visible");
    };
    loadTags("").then((t) => {
        tags = t;
    });
    addRequirementTagsInput.addEventListener("input", async () => {
        const value = addRequirementTagsInput.value;
        addRequirementTagsInput.value = value.replace(/[^a-zA-Z0-9, ]/g, "").toLowerCase();
        const filter = getCurrentTagFilter();
        if (!filter) {
            hideTagSuggestions();
            return;
        }
        const suggestions = await loadTags(filter);
        renderTagSuggestions(suggestions);
    });
    addRequirementTagsInput.addEventListener("blur", () => {
        setTimeout(() => {
            hideTagSuggestions();
        }, 150);
    });
    addRequirementTagsInput.addEventListener("keydown", (event) => {
        if (!addRequirementTagsSuggestions.classList.contains("is-visible")) {
            return;
        }
        const buttons = Array.from(addRequirementTagsSuggestions.querySelectorAll(".suggestion-item"));
        if (buttons.length === 0) {
            return;
        }
        if (event.key === "ArrowDown") {
            event.preventDefault();
            const nextIndex = activeTagSuggestionIndex < buttons.length - 1 ? activeTagSuggestionIndex + 1 : 0;
            updateActiveTagSuggestion(buttons, nextIndex);
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            const nextIndex = activeTagSuggestionIndex > 0 ? activeTagSuggestionIndex - 1 : buttons.length - 1;
            updateActiveTagSuggestion(buttons, nextIndex);
        } else if (event.key === "Enter") {
            if (activeTagSuggestionIndex >= 0) {
                event.preventDefault();
                const selected = buttons[activeTagSuggestionIndex];
                if (selected) {
                    applyTagSuggestion(selected.textContent);
                }
            }
        } else if (event.key === "Escape") {
            hideTagSuggestions();
        }
    });

    const createRequirementBtn = document.getElementById("create_requirement_button");
    const createRequirementForm = document.getElementById("add_requirement_form");
    const createRequirement = async (formData) => {
        const requirementTitle = formData.get("requirement_title");
        const requirementDescription = formData.get("requirement_description");
        const requirementType = formData.get("requirement_type");
        const requirementPriority = formData.get("requirement_priority");
        const requirementStatus = formData.get("requirement_status");
        const requirementTags = formData.get("requirement_tags");
        const requirementCode = formData.get("requirement_code");
        if (!requirementTitle || requirementTitle.trim() === "") {
            alert("Title is required");
            return;
        }
        if (!requirementType || requirementType.trim() === "") {
            alert("Type is required");
            return;
        }
        if (!requirementPriority || requirementPriority.trim() === "") {
            alert("Priority is required");
            return;
        }
        if (!requirementStatus || requirementStatus.trim() === "") {
            alert("Status is required");
            return;
        }
        if (!requirementCode || requirementCode.trim() === "") {
            alert("Code is required");
            return;
        }
        if (!requirementTags || requirementTags.trim() === "") {
            alert("Tags are required");
            return;
        }
        try {
            const response = await fetchWithAuth("/api/requirements/new", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: requirementTitle,
                    description: requirementDescription,
                    requirement_type: requirementType,
                    priority: requirementPriority,
                    status: requirementStatus,
                    requirement_code: requirementCode,
                    tags: requirementTags ? requirementTags.split(",").map((tag) => tag.trim()) : [],
                }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to create requirement");
            }
            await response.json();
            return true;
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to create requirement: ${error.message}`);
            return false;
        }
    };
    createRequirementBtn.addEventListener("click", async (event) => {
        showLoadingOverlay();
        event.preventDefault();
        const formData = new FormData(createRequirementForm);
        const success = await createRequirement(formData);
        if (success) {
            addRequirementModal.classList.remove("is-visible");
            addRequirementModal.setAttribute("aria-hidden", "true");
            hideLoadingOverlay();
            createRequirementForm.reset();
            await loadRequirements();
            await loadRequirementsOverview();
        } else {
            // keep the modal open for user to fix the errors
            hideLoadingOverlay();
        }
    });

    const createRequirementAndAddAnotherBtn = document.getElementById("create_and_add_another_requirement_button");
    createRequirementAndAddAnotherBtn.addEventListener("click", async (event) => {
        showLoadingOverlay();
        event.preventDefault();
        const formData = new FormData(createRequirementForm);
        const success = await createRequirement(formData);
        if (success) {
            // reset the form for next requirement input
            createRequirementForm.reset();
            hideLoadingOverlay();
            await loadRequirements();
            await loadRequirementsOverview();
        } else {
            // keep the modal open for user to fix the errors
            hideLoadingOverlay();
        }
    });

    let requirementsListFilterParams = {};
    let requirementsListLength = 20;

    const requirementsListListLength = document.getElementById("list-length");
    requirementsListListLength.addEventListener("change", () => {
        const numToShow = parseInt(requirementsListListLength.value, 10);
        requirementsListLength = numToShow;
        loadRequirements(requirementsListLength, requirementsListFilterParams);
    });

    const requirementsListFilterSearchInput = document.getElementById("requirement-search");
    requirementsListFilterSearchInput.addEventListener("input", () => {
        const filterValue = requirementsListFilterSearchInput.value.trim();
        requirementsListFilterParams = { ...requirementsListFilterParams, search: filterValue };
        loadRequirements(requirementsListLength, requirementsListFilterParams);
    });

    const requirementsListFiltertypeSelect = document.getElementById("requirement-type");
    requirementsListFiltertypeSelect.addEventListener("change", () => {
        const filterValue = requirementsListFiltertypeSelect.value;
        requirementsListFilterParams = { ...requirementsListFilterParams, type: filterValue };
        loadRequirements(requirementsListLength, requirementsListFilterParams);
    });

    const requirementsListFilterPrioritySelect = document.getElementById("requirement-status");
    requirementsListFilterPrioritySelect.addEventListener("change", () => {
        const filterValue = requirementsListFilterPrioritySelect.value;
        requirementsListFilterParams = { ...requirementsListFilterParams, status: filterValue };
        loadRequirements(requirementsListLength, requirementsListFilterParams);
    });

    const requirementsListFilterStatusSelect = document.getElementById("requirement-priority");
    requirementsListFilterStatusSelect.addEventListener("change", () => {
        const filterValue = requirementsListFilterStatusSelect.value;
        requirementsListFilterParams = { ...requirementsListFilterParams, priority: filterValue };
        loadRequirements(requirementsListLength, requirementsListFilterParams);
    });

    const escapeHtml = (value) =>
        String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const formatRequirementCode = (requirement) =>
        `${requirement.requirement_code_prefix || "REQ"}-${requirement.requirement_code_number || "?"}`;

    const getRequirementEffortUrl = (requirement) => {
        const params = new URLSearchParams({
            requirement_id: String(requirement.id || ""),
            requirement_code: formatRequirementCode(requirement),
            requirement_title: requirement.title || "",
        });
        return `/#/effort?${params.toString()}`;
    };

    const loadRequirementDetails = async (requirementId) => {
        const response = await fetchWithAuth(`/api/requirements/byid/${requirementId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to load requirement details");
        }
        return response.json();
    };

    const updateRequirementDetailsSection = (requirement) => {
        const detailsSection = document.getElementById("requirement-details-section");
        const effortLinksSection = document.getElementById("requirement-effort-links-section");
        if (!detailsSection || !effortLinksSection || !requirement) {
            return;
        }

        const requirementCode = formatRequirementCode(requirement);
        const tags = Array.isArray(requirement.tags) ? requirement.tags : [];
        const acceptanceCriteria = Array.isArray(requirement.acceptance_criteria) ? requirement.acceptance_criteria : [];
        const tagsLabel = tags.length > 0 ? tags.join(", ") : "None";
        const totalEffortValue = Number(requirement.total_effort || 0);
        const effortLabel = totalEffortValue > 0 ? `${totalEffortValue.toFixed(2)} hrs` : "None Logged";
        const lastEffortDateLabel = formatDateTime(requirement.last_effort_date);
        const effortUrl = getRequirementEffortUrl(requirement);

        detailsSection.innerHTML = `
            <h2>Requirement details</h2>
            <p class="meta">Selected requirement preview.</p>
            <h3>${escapeHtml(requirementCode)} · ${escapeHtml(requirement.title || "Untitled requirement")}</h3>
            <p>${escapeHtml(requirement.description || "No description provided.")}</p>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Status</span>
                    <span class="badge">${escapeHtml(requirement.status || "Proposed")}</span>
                </p>
            </div>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Priority</span>
                    <span class="badge">${escapeHtml(requirement.priority || "None")}</span>
                </p>
            </div>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Type</span>
                    <span class="badge">${escapeHtml(requirement.requirement_type || "Unknown")}</span>
                </p>
            </div>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Tags</span>
                    <span class="badge">${escapeHtml(tagsLabel)}</span>
                </p>
            </div>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Acceptance criteria</span>
                    <span class="badge">${acceptanceCriteria.length}</span>
                </p>
            </div>
            <div class="span-actions">
                <button type="button" class="button-small" data-requirement-detail-refresh="${requirement.id}">Refresh details</button>
                <button type="button" class="button-small" data-requirement-detail-log-effort="${requirement.id}">Log effort</button>
            </div>
        `;

        effortLinksSection.innerHTML = `
            <h2>Effort links</h2>
            <p class="meta">Jump to effort details for this requirement.</p>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Total logged hours</span>
                    <span>${escapeHtml(effortLabel)}</span>
                </p>
                <p class="meta">View category breakdown and entries in Effort.</p>
            </div>
            <div class="data-row">
                <p class="value">
                    <span class="span-label">Last entry</span>
                    <span>${escapeHtml(lastEffortDateLabel)}</span>
                </p>
                <p class="meta">Use Effort to review individual entries.</p>
            </div>
            <div class="span-actions">
                <button type="button" class="button-small" data-requirement-detail-view-effort="${requirement.id}">View effort entries</button>
                <button type="button" class="button-small" data-requirement-detail-log-effort2="${requirement.id}">Log effort</button>
            </div>
        `;

        const refreshButton = detailsSection.querySelector(`[data-requirement-detail-refresh="${requirement.id}"]`);
        refreshButton?.addEventListener("click", async () => {
            try {
                showLoadingOverlay("Loading requirement details...");
                const freshRequirement = await loadRequirementDetails(requirement.id);
                updateRequirementDetailsSection(freshRequirement);
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to refresh requirement details: ${error.message}`);
            }
        });

        const effortButtons = document.querySelectorAll(
            `[data-requirement-detail-log-effort="${requirement.id}"], [data-requirement-detail-log-effort2="${requirement.id}"], [data-requirement-detail-view-effort="${requirement.id}"]`,
        );
        effortButtons.forEach((button) => {
            button.addEventListener("click", () => {
                window.location.href = effortUrl;
            });
        });
    };

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

    const buildRequirementTableLine = (requirement) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${requirement.requirement_code_prefix + "-" + requirement.requirement_code_number}</td>
            <td>${requirement.title}</td>
            <td>${requirement.status}</td>
            <td>${requirement.priority}</td>
            <td>${requirement.total_effort ? requirement.total_effort : "None Logged"}</td>
            <td>${formatDateTime(requirement.updated_at)}</td>
            <td>
                <button class="button" data-requirement-table-row-details-btn-id-${requirement.id}>Details</button>
                <button class="button" data-requirement-table-row-effort-btn-id-${requirement.id}>Effort</button>
                <button class="button" data-requirement-table-row-archive-btn-id-${requirement.id}>Archive</button>
            </td>
        `;

        tr.querySelector(`[data-requirement-table-row-details-btn-id-${requirement.id}]`).addEventListener("click", async () => {
            try {
                showLoadingOverlay("Loading requirement details...");
                const requirementDetails = await loadRequirementDetails(requirement.id);
                updateRequirementDetailsSection(requirementDetails);
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to load requirement details: ${error.message}`);
            }
        });
        tr.querySelector(`[data-requirement-table-row-effort-btn-id-${requirement.id}]`).addEventListener("click", () => {
            window.location.href = getRequirementEffortUrl(requirement);
        });
        tr.querySelector(`[data-requirement-table-row-archive-btn-id-${requirement.id}]`).addEventListener("click", async () => {
            try {
                showLoadingOverlay("Archiving requirement...");
                let res = await fetchWithAuth(`/api/requirements/${requirement.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "archived" }),
                });
                if (!res.ok) {
                    const errorData = await res.json().catch(() => ({}));
                    throw new Error(errorData.error || "Failed to archive requirement");
                } else {
                    alert("Requirement archived successfully");
                }
                tr.remove();
                await loadRequirementsOverview();
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to archive requirement: ${error.message}`);
            }
        });
        return tr;
    };

    const loadRequirements = async (numToShow = 20, filter = {}) => {
        try {
            showLoadingOverlay();
            const params = new URLSearchParams({
                sortField: "updated_at",
                sortOrder: "desc",
            });
            if (filter && typeof filter === "object") {
                if (filter.search) params.set("search", filter.search);
                if (filter.type) params.set("type", filter.type);
                if (filter.status) params.set("status", filter.status);
                if (filter.priority) params.set("priority", filter.priority);
            }
            const fetchUrl = `/api/requirements/filter/0/${numToShow}?${params.toString()}`;
            const response = await fetchWithAuth(fetchUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to fetch requirements");
            }
            const requirements = await response.json().catch(() => []);
            const tableBody = document.getElementById("requirements-table-body");
            tableBody.innerHTML = "";
            if (!requirements || !Array.isArray(requirements)) {
                throw new Error("Invalid response format: expected an array of requirements");
            }
            requirements.forEach((requirement) => {
                const tr = buildRequirementTableLine(requirement);
                tableBody.appendChild(tr);
            });
            if (requirements.length > 0) {
                updateRequirementDetailsSection(requirements[0]);
            }
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to load requirements: ${error.message}`);
        }
    };

    const exportRequirementsButton = document.querySelector("[data-export-list-button]");
    exportRequirementsButton.addEventListener("click", async () => {
        try {
            showLoadingOverlay("Exporting requirements...");
            const response = await fetchWithAuth("/api/requirements/export/csv?sortField=updated_at&sortOrder=desc");
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to export requirements");
            }
            const csvData = await response.text();
            const blob = new Blob([csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "requirements.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to export requirements: ${error.message}`);
        }
    });

    // Initial load
    await loadRequirements();
    await loadRequirementsOverview();
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

async function loadUrlParamHelper() {
    // Use an absolute URL so it resolves when the module itself is loaded from a blob URL.
    const moduleUrl = new URL("/js/utils/url_params.js", window.location.origin).href;
    const module = await import(moduleUrl);
    return module.default;
}
