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
        } else {
            // keep the modal open for user to fix the errors
            hideLoadingOverlay();
        }
    });

    const updateRequirementDetailsSection = (requirement) => {
        const detailsSection = document.getElementById("requirement-details-section");
        // TODO:
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

        tr.querySelector(`[data-requirement-table-row-details-btn-id-${requirement.id}]`).addEventListener("click", () => {
            updateRequirementDetailsSection(requirement);
        });
        tr.querySelector(`[data-requirement-table-row-effort-btn-id-${requirement.id}]`).addEventListener("click", () => {
            // TODO: go to effort page and select details for this requirement
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
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to archive requirement: ${error.message}`);
            }
        });
        return tr;
    };

    const loadRequirements = async () => {
        try {
            showLoadingOverlay();
            const response = await fetchWithAuth("/api/requirements/filter/0/10?sortField=updated_at&sortOrder=desc");
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
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to load requirements: ${error.message}`);
        }
    };

    const eportRequirementsButton = document.querySelector("[data-export-list-button]");
    eportRequirementsButton.addEventListener("click", async () => {
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