export default async function initRequirements({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const { createInput, createSelect } = await loadDomHelpers();

    const createRequirementButton = document.querySelector("[data-create-requirement-button]");
    const addRequirementModal = document.getElementById("add_requirement_modal");
    createRequirementButton.addEventListener("click", async () => {
        addRequirementModal.classList.add("is-visible");
        addRequirementModal.setAttribute("aria-hidden", "false");
    });

    const updateRequirementDetailsSection = (requirement) => {
        const detailsSection = document.getElementById("requirement-details-section");
        // TODO:
    }

    const buildRequirementTableLine = (requirement) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${requirement.id}</td>
            <td>${requirement.title}</td>
            <td>${requirement.status}</td>
            <td>${requirement.priority}</td>
            <td>${requirement.total_effort}</td>
            <td>${requirement.updated_at}</td>
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
                await fetchWithAuth(`/api/requirements/${requirement.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status: "archived" }),
                });
                tr.remove();
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to archive requirement: ${error.message}`);
            }
        });
        return tr;
    }

    const loadRequirements = async () => {
        try {
            showLoadingOverlay();
            const response = await fetchWithAuth("/api/requirements?sortField=updated_at&sortOrder=desc");
            const requirements = await response.json();
            const tableBody = document.getElementById("requirements-table-body");
            tableBody.innerHTML = "";
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
