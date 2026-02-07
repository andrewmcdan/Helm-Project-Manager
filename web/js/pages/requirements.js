export default async function initRequirements({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const { createInput, createSelect } = await loadDomHelpers();

    const createRequirementButton = document.querySelector("[data-create-requirement-button]");
    const addRequirementModal = document.getElementById("add_requirement_modal");
    createRequirementButton.addEventListener("click", async () => {
        addRequirementModal.classList.add("is-visible");
        addRequirementModal.setAttribute("aria-hidden", "false");
        // TODO: Load requirement code/id prefixes
        // TODO: Load requirement tags
    });
    const addCloseRequirementModalBtn = document.getElementById("close_add_requirement_modal");
    addCloseRequirementModalBtn.addEventListener("click", () => {
        addRequirementModal.classList.remove("is-visible");
        addRequirementModal.setAttribute("aria-hidden", "true");
    });

    const addRequirementCodeInput = document.getElementById("add_requirement__code");
    addRequirementCodeInput.addEventListener("input", () => {
        const code = addRequirementCodeInput.value;
        addRequirementCodeInput.value = code.replace(/[^a-zA-Z0-9_-]/g, "").toUpperCase();
        // TODO: show code suggestions based on existing requirement codes and selected project
    });

    const addRequirementTagsInput = document.getElementById("add_requirement__tags");
    addRequirementTagsInput.addEventListener("input", () => {
        const tags = addRequirementTagsInput.value;
        addRequirementTagsInput.value = tags.replace(/[^a-zA-Z0-9, ]/g, "").toLowerCase();
        // TODO: show tag suggestions based on existing tags
    });

    const createRequirementBtn = document.getElementById("create_requirement_button");
    const createRequirementForm = document.getElementById("add_requirement_form");
    const createRequirement = async (formData)=>{
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
    }
    createRequirementBtn.addEventListener("click", async (event) => {
        showLoadingOverlay();
        event.preventDefault();
        const formData = new FormData(createRequirementForm);
        const success = await createRequirement(formData);
        if(success){
            addRequirementModal.classList.remove("is-visible");
            addRequirementModal.setAttribute("aria-hidden", "true");
            hideLoadingOverlay();
            createRequirementForm.reset();
            await loadRequirements();
        }else{
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
        if(success){
            // reset the form for next requirement input
            createRequirementForm.reset();
            hideLoadingOverlay();
            await loadRequirements();
        }else{
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
                }else{
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
            const response = await fetchWithAuth("/api/requirements/get-by-filter/0/10?sortField=updated_at&sortOrder=desc");
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
