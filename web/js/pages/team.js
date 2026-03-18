export default async function initTeam({ showLoadingOverlay, hideLoadingOverlay }) {
    const { fetchWithAuth } = await loadFetchWithAuth();
    const { createSelect } = await loadDomHelpers();

    // ── Snapshot overview ──────────────────────────────────────────────
    const overviewTotal = document.querySelector("[data-team-overview-total]");
    const overviewActive = document.querySelector("[data-team-overview-active]");
    const overviewAdmins = document.querySelector("[data-team-overview-admins]");
    const overviewPending = document.querySelector("[data-team-overview-pending]");
    const overviewSummary = document.querySelector("[data-team-overview-summary]");

    const loadTeamOverview = async () => {
        try {
            const response = await fetchWithAuth("/api/team/summary");
            if (!response.ok) throw new Error("Failed to fetch team summary");
            const summary = await response.json();
            overviewTotal.textContent = String(summary.total_members || 0);
            overviewActive.textContent = String(summary.active_members || 0);
            overviewAdmins.textContent = String(summary.admin_count || 0);
            overviewPending.textContent = String(summary.pending_count || 0);
            if (overviewSummary) {
                overviewSummary.textContent = `Updated ${new Date().toLocaleTimeString()}`;
            }
        } catch (error) {
            console.error("Failed to load team overview:", error);
            if (overviewSummary) overviewSummary.textContent = "Unable to load overview right now.";
        }
    };

    // ── Current user role (for admin actions) ──────────────────────────
    let currentUserRole = null;
    const loadCurrentUserRole = async () => {
        try {
            const response = await fetchWithAuth("/api/team/current-user-role");
            if (!response.ok) return;
            const data = await response.json();
            currentUserRole = data.role || null;
        } catch {
            currentUserRole = null;
        }
    };

    const isAdmin = () => currentUserRole === "administrator";

    // ── Add member modal ───────────────────────────────────────────────
    const addMemberModal = document.getElementById("add_member_modal");
    const addMemberForm = document.getElementById("add_member_form");
    const assignExistingMemberForm = document.getElementById("assign_existing_member_form");
    const assignExistingMemberSelect = document.getElementById("assign_existing_member__user_id");
    const assignExistingMemberButton = document.getElementById("assign_existing_member_button");
    const assignExistingMemberHelp = document.getElementById("assign_existing_member__help");
    const closeAddMemberBtn = document.getElementById("close_add_member_modal");
    const addMemberButton = document.querySelector("[data-add-member-button]");

    const populateAvailableUsers = (users) => {
        if (!assignExistingMemberSelect) return;
        assignExistingMemberSelect.innerHTML = "";
        if (!Array.isArray(users) || users.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No available users";
            option.disabled = true;
            option.selected = true;
            assignExistingMemberSelect.appendChild(option);
            assignExistingMemberSelect.disabled = true;
            if (assignExistingMemberButton) assignExistingMemberButton.disabled = true;
            if (assignExistingMemberHelp) assignExistingMemberHelp.textContent = "Every current user is already assigned to the active project.";
            return;
        }

        const placeholder = document.createElement("option");
        placeholder.value = "";
        placeholder.textContent = "Select a user";
        placeholder.disabled = true;
        placeholder.selected = true;
        assignExistingMemberSelect.appendChild(placeholder);

        users.forEach((user) => {
            const option = document.createElement("option");
            option.value = String(user.id);
            option.textContent = `${user.first_name || ""} ${user.last_name || ""}`.trim()
                ? `${`${user.first_name || ""} ${user.last_name || ""}`.trim()} (${user.username})`
                : user.username;
            assignExistingMemberSelect.appendChild(option);
        });

        assignExistingMemberSelect.disabled = false;
        if (assignExistingMemberButton) assignExistingMemberButton.disabled = false;
        if (assignExistingMemberHelp) assignExistingMemberHelp.textContent = "Choose a user account that is not already assigned to this project.";
    };

    const loadAvailableUsers = async () => {
        if (!isAdmin() || !assignExistingMemberSelect) return;
        assignExistingMemberSelect.innerHTML = '<option value="" disabled selected>Loading users...</option>';
        assignExistingMemberSelect.disabled = true;
        if (assignExistingMemberButton) assignExistingMemberButton.disabled = true;
        try {
            const response = await fetchWithAuth("/api/team/available-users");
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to load available users");
            }
            const users = await response.json();
            populateAvailableUsers(users);
        } catch (error) {
            assignExistingMemberSelect.innerHTML = '<option value="" disabled selected>Unable to load users</option>';
            if (assignExistingMemberHelp) assignExistingMemberHelp.textContent = error.message || "Unable to load users right now.";
        }
    };

    addMemberButton.addEventListener("click", async () => {
        addMemberModal.classList.add("is-visible");
        addMemberModal.setAttribute("aria-hidden", "false");
        await loadAvailableUsers();
    });
    closeAddMemberBtn.addEventListener("click", () => {
        addMemberModal.classList.remove("is-visible");
        addMemberModal.setAttribute("aria-hidden", "true");
    });

    const assignExistingMember = async (userId) => {
        if (!isAdmin()) {
            alert("Only administrators can add members.");
            return false;
        }
        try {
            const response = await fetchWithAuth("/api/team/assign-member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to assign member");
            }
            return true;
        } catch (error) {
            alert(`Failed to add existing user: ${error.message}`);
            return false;
        }
    };

    const createMember = async (formData) => {
        if (!isAdmin()) {
            alert("Only administrators can add members.");
            return false;
        }
        const first_name = formData.get("first_name");
        const last_name = formData.get("last_name");
        const email = formData.get("email");
        const role = formData.get("role");
        const password = formData.get("password") || "";
        if (!first_name || !first_name.trim()) {
            alert("First name is required");
            return false;
        }
        if (!last_name || !last_name.trim()) {
            alert("Last name is required");
            return false;
        }
        if (!email || !email.trim()) {
            alert("Email is required");
            return false;
        }
        if (!password || !password.trim()) {
            alert("A starting password is required");
            return false;
        }
        try {
            const body = new FormData();
            body.append("first_name", first_name);
            body.append("last_name", last_name);
            body.append("email", email);
            body.append("role", role);
            body.append("password", password);
            const response = await fetchWithAuth("/api/users/create-user", {
                method: "POST",
                body,
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to create member");
            }
            const created = await response.json();
            const createdUserId = created?.user?.id;
            if (!createdUserId) {
                throw new Error("Member was created without a user ID");
            }
            const assignResponse = await fetchWithAuth("/api/team/assign-member", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: createdUserId, role }),
            });
            if (!assignResponse.ok) {
                const err = await assignResponse.json().catch(() => ({}));
                throw new Error(err.error || "Member account created, but assignment to the active project failed");
            }
            return true;
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to create member: ${error.message}`);
            return false;
        }
    };

    if (assignExistingMemberForm) {
        assignExistingMemberForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            const selectedUserId = assignExistingMemberSelect?.value;
            if (!selectedUserId) {
                alert("Select a user to add.");
                return;
            }
            showLoadingOverlay("Adding existing user...");
            const success = await assignExistingMember(selectedUserId);
            hideLoadingOverlay();
            if (!success) {
                return;
            }
            addMemberModal.classList.remove("is-visible");
            addMemberModal.setAttribute("aria-hidden", "true");
            assignExistingMemberForm.reset();
            await loadMembers();
            await loadTeamOverview();
            await loadAvailableUsers();
        });
    }

    addMemberForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        showLoadingOverlay("Creating member...");
        const success = await createMember(new FormData(addMemberForm));
        if (success) {
            addMemberModal.classList.remove("is-visible");
            addMemberModal.setAttribute("aria-hidden", "true");
            addMemberForm.reset();
            hideLoadingOverlay();
            await loadMembers();
            await loadTeamOverview();
        } else {
            hideLoadingOverlay();
        }
    });

    // ── Filters ────────────────────────────────────────────────────────
    let teamFilterParams = {};
    let teamListLength = 20;

    const listLengthSelect = document.getElementById("team-list-length");
    listLengthSelect.addEventListener("change", () => {
        teamListLength = parseInt(listLengthSelect.value, 10);
        loadMembers();
    });

    const searchInput = document.getElementById("team-search");
    searchInput.addEventListener("input", () => {
        teamFilterParams = { ...teamFilterParams, search: searchInput.value.trim() };
        loadMembers();
    });

    const roleFilter = document.getElementById("team-role");
    roleFilter.addEventListener("change", () => {
        teamFilterParams = { ...teamFilterParams, role: roleFilter.value };
        loadMembers();
    });

    const statusFilter = document.getElementById("team-status");
    statusFilter.addEventListener("change", () => {
        teamFilterParams = { ...teamFilterParams, status: statusFilter.value };
        loadMembers();
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

    const formatRole = (role) => {
        if (!role) return "—";
        return role.charAt(0).toUpperCase() + role.slice(1);
    };

    const formatStatus = (status) => {
        if (!status) return "—";
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    // ── Member detail section ──────────────────────────────────────────
    const roleOptions = [
        { value: "administrator", label: "Administrator" },
        { value: "manager", label: "Manager" },
        { value: "coder", label: "Coder" },
        { value: "viewer", label: "Viewer" },
    ];

    const loadMemberDetails = async (memberId) => {
        const response = await fetchWithAuth(`/api/team/byid/${memberId}`);
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Failed to load member details");
        }
        return response.json();
    };

    const updateMemberDetailsSection = (member) => {
        const detailsSection = document.getElementById("member-details-section");
        if (!detailsSection || !member) return;

        detailsSection.innerHTML = "";

        const heading = document.createElement("h2");
        heading.textContent = "Member details";
        detailsSection.appendChild(heading);

        const meta = document.createElement("p");
        meta.className = "meta";
        meta.textContent = `Viewing ${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}`;
        detailsSection.appendChild(meta);

        // Name
        const nameRow = document.createElement("div");
        nameRow.className = "data-row";
        nameRow.innerHTML = `
            <p class="value">
                <span class="span-label">Name</span>
                <span>${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}</span>
            </p>
            <p class="meta">Username: ${escapeHtml(member.username)}</p>
        `;
        detailsSection.appendChild(nameRow);

        // Email
        const emailRow = document.createElement("div");
        emailRow.className = "data-row";
        emailRow.innerHTML = `
            <p class="value">
                <span class="span-label">Email</span>
                <span>${escapeHtml(member.email)}</span>
            </p>
        `;
        detailsSection.appendChild(emailRow);

        // Role
        const roleRow = document.createElement("div");
        roleRow.className = "data-row";
        roleRow.innerHTML = `
            <p class="value">
                <span class="span-label">Role</span>
                <span class="badge">${escapeHtml(formatRole(member.role))}</span>
            </p>
            <p class="meta">Status: ${escapeHtml(formatStatus(member.status))}</p>
        `;
        detailsSection.appendChild(roleRow);

        // Dates
        const dateRow = document.createElement("div");
        dateRow.className = "data-row";
        dateRow.innerHTML = `
            <p class="value">
                <span class="span-label">Last login</span>
                <span>${formatDateTime(member.last_login_at)}</span>
            </p>
            <p class="meta">Joined ${formatDateTime(member.created_at)}</p>
        `;
        detailsSection.appendChild(dateRow);

        // Suspension info (if suspended)
        if (member.status === "suspended" && member.suspension_start_at) {
            const suspRow = document.createElement("div");
            suspRow.className = "data-row";
            suspRow.innerHTML = `
                <p class="value">
                    <span class="span-label">Suspended</span>
                    <span>${formatDateTime(member.suspension_start_at)}${member.suspension_end_at ? " — " + formatDateTime(member.suspension_end_at) : " (indefinite)"}</span>
                </p>
            `;
            detailsSection.appendChild(suspRow);
        }

        // Admin actions
        if (isAdmin()) {
            const actions = document.createElement("div");
            actions.className = "span-actions";

            // Change role
            const changeRoleBtn = document.createElement("button");
            changeRoleBtn.type = "button";
            changeRoleBtn.className = "button-small";
            changeRoleBtn.textContent = "Change role";
            changeRoleBtn.addEventListener("click", () => showChangeRoleUI(member, detailsSection));
            actions.appendChild(changeRoleBtn);

            // Suspend / Reinstate
            if (member.status === "active") {
                const suspendBtn = document.createElement("button");
                suspendBtn.type = "button";
                suspendBtn.className = "button-small";
                suspendBtn.textContent = "Suspend";
                suspendBtn.addEventListener("click", () => suspendMember(member.id));
                actions.appendChild(suspendBtn);
            } else if (member.status === "suspended") {
                const reinstateBtn = document.createElement("button");
                reinstateBtn.type = "button";
                reinstateBtn.className = "button-small";
                reinstateBtn.textContent = "Reinstate";
                reinstateBtn.addEventListener("click", () => reinstateMember(member.id));
                actions.appendChild(reinstateBtn);
            }

            // Approve / Reject pending
            if (member.status === "pending") {
                const approveBtn = document.createElement("button");
                approveBtn.type = "button";
                approveBtn.className = "button-small";
                approveBtn.textContent = "Approve";
                approveBtn.addEventListener("click", () => approveMember(member.id));
                actions.appendChild(approveBtn);

                const rejectBtn = document.createElement("button");
                rejectBtn.type = "button";
                rejectBtn.className = "button-small";
                rejectBtn.textContent = "Reject";
                rejectBtn.addEventListener("click", () => rejectMember(member.id));
                actions.appendChild(rejectBtn);
            }

            detailsSection.appendChild(actions);
        }
    };

    // ── Change role inline UI ──────────────────────────────────────────
    const showChangeRoleUI = (member, container) => {
        const existing = container.querySelector("[data-change-role-form]");
        if (existing) {
            existing.remove();
            return;
        }

        const formDiv = document.createElement("div");
        formDiv.setAttribute("data-change-role-form", "");
        formDiv.className = "field";

        const label = document.createElement("label");
        label.textContent = "New role";
        formDiv.appendChild(label);

        const roleSel = createSelect(roleOptions, member.role, "data-new-role");
        formDiv.appendChild(roleSel);

        const saveBtn = document.createElement("button");
        saveBtn.type = "button";
        saveBtn.className = "button-small";
        saveBtn.textContent = "Save role";
        saveBtn.addEventListener("click", async () => {
            const newRole = roleSel.value;
            if (newRole === member.role) return;
            try {
                showLoadingOverlay("Changing role...");
                const response = await fetchWithAuth("/api/users/update-user-field", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: member.id, field: "role", value: newRole }),
                });
                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error || "Failed to change role");
                }
                hideLoadingOverlay();
                const refreshed = await loadMemberDetails(member.id);
                updateMemberDetailsSection(refreshed);
                await loadMembers();
                await loadTeamOverview();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to change role: ${error.message}`);
            }
        });
        formDiv.appendChild(saveBtn);

        container.appendChild(formDiv);
    };

    // ── Admin actions (use existing /api/users endpoints) ──────────────
    const suspendMember = async (memberId) => {
        const startDate = new Date().toISOString();
        try {
            showLoadingOverlay("Suspending member...");
            const response = await fetchWithAuth("/api/users/suspend-user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userIdToSuspend: memberId, suspensionStart: startDate }),
            });
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to suspend member");
            }
            hideLoadingOverlay();
            alert("Member suspended successfully.");
            const refreshed = await loadMemberDetails(memberId);
            updateMemberDetailsSection(refreshed);
            await loadMembers();
            await loadTeamOverview();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to suspend member: ${error.message}`);
        }
    };

    const reinstateMember = async (memberId) => {
        try {
            showLoadingOverlay("Reinstating member...");
            const response = await fetchWithAuth(`/api/users/reinstate-user/${memberId}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to reinstate member");
            }
            hideLoadingOverlay();
            alert("Member reinstated successfully.");
            const refreshed = await loadMemberDetails(memberId);
            updateMemberDetailsSection(refreshed);
            await loadMembers();
            await loadTeamOverview();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to reinstate member: ${error.message}`);
        }
    };

    const approveMember = async (memberId) => {
        try {
            showLoadingOverlay("Approving member...");
            const response = await fetchWithAuth(`/api/users/approve-user/${memberId}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to approve member");
            }
            hideLoadingOverlay();
            alert("Member approved successfully.");
            const refreshed = await loadMemberDetails(memberId);
            updateMemberDetailsSection(refreshed);
            await loadMembers();
            await loadTeamOverview();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to approve member: ${error.message}`);
        }
    };

    const rejectMember = async (memberId) => {
        try {
            showLoadingOverlay("Rejecting member...");
            const response = await fetchWithAuth(`/api/users/reject-user/${memberId}`);
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                throw new Error(err.error || "Failed to reject member");
            }
            hideLoadingOverlay();
            alert("Member rejected.");
            const refreshed = await loadMemberDetails(memberId);
            updateMemberDetailsSection(refreshed);
            await loadMembers();
            await loadTeamOverview();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to reject member: ${error.message}`);
        }
    };

    // ── Team table ─────────────────────────────────────────────────────
    const buildMemberTableRow = (member) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(member.first_name)} ${escapeHtml(member.last_name)}</td>
            <td>${escapeHtml(member.email)}</td>
            <td>${escapeHtml(formatRole(member.role))}</td>
            <td><span class="badge">${escapeHtml(formatStatus(member.status))}</span></td>
            <td>${formatDateTime(member.last_login_at)}</td>
            <td>
                <button class="button" data-member-details-btn="${member.id}">Details</button>
            </td>
        `;

        tr.querySelector(`[data-member-details-btn="${member.id}"]`).addEventListener("click", async () => {
            try {
                showLoadingOverlay("Loading member details...");
                const details = await loadMemberDetails(member.id);
                updateMemberDetailsSection(details);
                hideLoadingOverlay();
            } catch (error) {
                hideLoadingOverlay();
                alert(`Failed to load member details: ${error.message}`);
            }
        });

        return tr;
    };

    const loadMembers = async () => {
        try {
            showLoadingOverlay();
            const numToShow = teamListLength || 20;
            const params = new URLSearchParams({ sortField: "name", sortOrder: "asc" });
            if (teamFilterParams.search) params.set("search", teamFilterParams.search);
            if (teamFilterParams.role) params.set("role", teamFilterParams.role);
            if (teamFilterParams.status) params.set("status", teamFilterParams.status);

            const response = await fetchWithAuth(`/api/team/filter/0/${numToShow}?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch team members");
            const members = await response.json();
            const tableBody = document.getElementById("team-table-body");
            tableBody.innerHTML = "";
            if (!Array.isArray(members) || members.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6">No team members found.</td></tr>';
                const detailsSection = document.getElementById("member-details-section");
                if (detailsSection) {
                    detailsSection.innerHTML = `
                        <h2>Member details</h2>
                        <p class="meta">No members are currently assigned to the active project.</p>
                    `;
                }
                hideLoadingOverlay();
                return;
            }
            members.forEach((member) => tableBody.appendChild(buildMemberTableRow(member)));
            // Auto-select first member for details
            const firstDetails = await loadMemberDetails(members[0].id);
            updateMemberDetailsSection(firstDetails);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to load team members: ${error.message}`);
        }
    };

    // ── Export roster ──────────────────────────────────────────────────
    const exportButton = document.querySelector("[data-export-roster-button]");
    exportButton.addEventListener("click", async () => {
        try {
            showLoadingOverlay("Exporting roster...");
            const response = await fetchWithAuth("/api/team/export/csv?sortField=name&sortOrder=asc");
            if (!response.ok) throw new Error("Failed to export roster");
            const csvData = await response.text();
            const blob = new Blob([csvData], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "team-roster.csv";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            hideLoadingOverlay();
        } catch (error) {
            hideLoadingOverlay();
            alert(`Failed to export roster: ${error.message}`);
        }
    });

    // ── Initial load ───────────────────────────────────────────────────
    await loadCurrentUserRole();
    if (addMemberButton) {
        addMemberButton.style.display = isAdmin() ? "" : "none";
    }
    await loadMembers();
    await loadTeamOverview();
}

// ── Module loaders (same pattern as risks.js) ──────────────────────────
async function loadDomHelpers() {
    const moduleUrl = new URL("/js/utils/dom_helpers.js", window.location.origin).href;
    const module = await import(moduleUrl);
    const { createSelect } = module;
    return { createSelect };
}

async function loadFetchWithAuth() {
    const moduleUrl = new URL("/js/utils/fetch_with_auth.js", window.location.origin).href;
    const module = await import(moduleUrl);
    const { fetchWithAuth } = module;
    return { fetchWithAuth };
}
