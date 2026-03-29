const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, createTestUser, loginTestUser, getDb } = require("./helpers/setup");

const users = require("../src/controllers/users");

describe("users controller", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => await teardown());

    /* ------------------------------------------------------------------ */
    /*  checkPasswordComplexity (tested indirectly through changePassword) */
    /* ------------------------------------------------------------------ */

    describe("password complexity (via changePassword)", () => {
        it("rejects password shorter than 8 characters", async () => {
            const user = await createTestUser();
            await assert.rejects(() => users.changePassword(user.id, "Ab1!xyz"), /complexity/);
        });

        it("rejects password missing uppercase letter", async () => {
            const user = await createTestUser();
            await assert.rejects(() => users.changePassword(user.id, "abcdefg1!"), /complexity/);
        });

        it("rejects password missing lowercase letter", async () => {
            const user = await createTestUser();
            await assert.rejects(() => users.changePassword(user.id, "ABCDEFG1!"), /complexity/);
        });

        it("rejects password missing digit", async () => {
            const user = await createTestUser();
            await assert.rejects(() => users.changePassword(user.id, "Abcdefgh!"), /complexity/);
        });

        it("rejects password missing special character", async () => {
            const user = await createTestUser();
            await assert.rejects(() => users.changePassword(user.id, "Abcdefg1A"), /complexity/);
        });

        it("accepts password meeting all complexity requirements", async () => {
            const user = await createTestUser();
            await users.changePassword(user.id, "Aa1!xyzw");
            const result = await db.query("SELECT 1 FROM users WHERE id = $1 AND password_hash = crypt($2, password_hash)", [user.id, "Aa1!xyzw"]);
            assert.strictEqual(result.rowCount, 1);
        });
    });

    describe("getUserLoggedInStatus", () => {
        it("returns false when no session exists", async () => {
            const user = await createTestUser();
            const result = await users.getUserLoggedInStatus(user.id, "fake-token");
            assert.strictEqual(result, false);
        });

        it("returns true for a valid active session", async () => {
            const user = await createTestUser();
            const auth = await loginTestUser(user.id);
            const result = await users.getUserLoggedInStatus(user.id, auth.token);
            assert.strictEqual(result, true);
        });

        it("returns false for an expired session", async () => {
            const user = await createTestUser();
            const auth = await loginTestUser(user.id);
            // Expire the session
            await db.query("UPDATE logged_in_users SET logout_at = now() - interval '1 hour' WHERE user_id = $1", [user.id]);
            const result = await users.getUserLoggedInStatus(user.id, auth.token);
            assert.strictEqual(result, false);
        });
    });

    describe("isAdmin / isManager", () => {
        it("isAdmin returns true for admin user with valid session", async () => {
            const admin = await createTestUser({ role: "administrator" });
            const auth = await loginTestUser(admin.id);
            const result = await users.isAdmin(admin.id, auth.token);
            assert.strictEqual(result, true);
        });

        it("isAdmin returns false for non-admin user", async () => {
            const coder = await createTestUser({ role: "coder" });
            const auth = await loginTestUser(coder.id);
            const result = await users.isAdmin(coder.id, auth.token);
            assert.strictEqual(result, false);
        });

        it("isAdmin returns false with no token", async () => {
            const admin = await createTestUser({ role: "administrator" });
            const result = await users.isAdmin(admin.id, null);
            assert.strictEqual(result, false);
        });

        it("isManager returns true for manager user", async () => {
            const mgr = await createTestUser({ role: "manager" });
            const auth = await loginTestUser(mgr.id);
            const result = await users.isManager(mgr.id, auth.token);
            assert.strictEqual(result, true);
        });

        it("isManager returns false for non-manager", async () => {
            const coder = await createTestUser({ role: "coder" });
            const auth = await loginTestUser(coder.id);
            const result = await users.isManager(coder.id, auth.token);
            assert.strictEqual(result, false);
        });
    });

    describe("getUserById", () => {
        it("returns user data for existing user", async () => {
            const user = await createTestUser({ first_name: "John", last_name: "Doe" });
            const result = await users.getUserById(user.id);
            assert.ok(result);
            assert.strictEqual(result.first_name, "John");
            assert.strictEqual(result.last_name, "Doe");
            assert.strictEqual(result.id, user.id);
        });

        it("returns null for non-existent user", async () => {
            const result = await users.getUserById(999999);
            assert.strictEqual(result, null);
        });
    });

    describe("getUserByEmail", () => {
        it("returns user data for existing email", async () => {
            const user = await createTestUser({ email: "findme@helm.local" });
            const result = await users.getUserByEmail("findme@helm.local");
            assert.ok(result);
            assert.strictEqual(result.id, user.id);
        });

        it("returns null for unknown email", async () => {
            const result = await users.getUserByEmail("nope@helm.local");
            assert.strictEqual(result, null);
        });
    });

    describe("listUsers", () => {
        it("returns all users ordered by ID", async () => {
            const u1 = await createTestUser({ first_name: "Alpha" });
            const u2 = await createTestUser({ first_name: "Beta" });
            const list = await users.listUsers();
            assert.ok(Array.isArray(list));
            assert.ok(list.length >= 2);
            const ids = list.map((u) => u.id);
            assert.ok(ids.includes(u1.id));
            assert.ok(ids.includes(u2.id));
        });
    });

    describe("listLoggedInUsers", () => {
        it("returns only users with active sessions", async () => {
            const u1 = await createTestUser();
            const u2 = await createTestUser();
            await loginTestUser(u1.id);
            // u2 has no session

            const list = await users.listLoggedInUsers();
            const userIds = list.map((u) => u.user_id);
            assert.ok(userIds.includes(u1.id));
            assert.ok(!userIds.includes(u2.id));
        });
    });

    describe("approveUser / rejectUser", () => {
        it("approveUser sets status to active", async () => {
            const user = await createTestUser({ status: "pending" });
            await users.approveUser(user.id);
            const after = await users.getUserById(user.id);
            assert.strictEqual(after.status, "active");
        });

        it("rejectUser sets status to rejected", async () => {
            const user = await createTestUser({ status: "pending" });
            await users.rejectUser(user.id);
            const after = await users.getUserById(user.id);
            assert.strictEqual(after.status, "rejected");
        });
    });

    describe("suspendUser / reinstateUser", () => {
        it("suspendUser sets status and dates", async () => {
            const user = await createTestUser();
            const start = new Date();
            const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            await users.suspendUser(user.id, start, end);
            const after = await users.getUserById(user.id);
            assert.strictEqual(after.status, "suspended");
            assert.ok(after.suspension_start_at);
            assert.ok(after.suspension_end_at);
        });

        it("reinstateUser sets status back to active", async () => {
            const user = await createTestUser({ status: "suspended" });
            await users.reinstateUser(user.id);
            const after = await users.getUserById(user.id);
            assert.strictEqual(after.status, "active");
            assert.strictEqual(after.suspension_start_at, null);
            assert.strictEqual(after.suspension_end_at, null);
        });
    });

    describe("changePassword", () => {
        it("changes the password successfully with a valid password", async () => {
            const user = await createTestUser();
            // New password must meet complexity requirements
            await users.changePassword(user.id, "NewPass1!xyz");
            // Verify new password works by checking via DB crypt comparison
            const result = await db.query("SELECT 1 FROM users WHERE id = $1 AND password_hash = crypt($2, password_hash)", [user.id, "NewPass1!xyz"]);
            assert.strictEqual(result.rowCount, 1);
        });

        it("rejects weak passwords", async () => {
            const user = await createTestUser();
            await assert.rejects(async () => await users.changePassword(user.id, "weak"), { message: "Password does not meet complexity requirements" });
        });
    });

    describe("updateUserProfile", () => {
        it("updates provided fields", async () => {
            const user = await createTestUser();
            const result = await users.updateUserProfile(user.id, {
                first_name: "Updated",
                last_name: "Name",
            });
            assert.ok(result);
            assert.strictEqual(result.first_name, "Updated");
            assert.strictEqual(result.last_name, "Name");
        });

        it("returns null when no updates are provided", async () => {
            const user = await createTestUser();
            const result = await users.updateUserProfile(user.id, {});
            assert.strictEqual(result, null);
        });

        it("returns null for non-existent user", async () => {
            const result = await users.updateUserProfile(999999, { first_name: "Ghost" });
            assert.strictEqual(result, null);
        });
    });

    describe("createUser", () => {
        it("creates a user with valid data", async () => {
            const newUser = await users.createUser("Jane", "Smith", "jane@helm.local", "Valid1!Pass", "coder", "123 Main St", "1990-01-01", null);
            assert.ok(newUser.id);
            assert.ok(newUser.username.startsWith("J"));
            assert.ok(newUser.username.includes("Smith"));
        });

        it("rejects invalid role", async () => {
            await assert.rejects(async () => await users.createUser("Bad", "Role", "bad@helm.local", "Valid1!Pass", "superadmin", "", null, null), { message: "Invalid role specified" });
        });

        it("rejects empty first/last/email", async () => {
            await assert.rejects(async () => await users.createUser("", "Test", "t@helm.local", "Valid1!Pass", "coder", "", null, null), { message: "First name, last name, email, and password cannot be empty" });
        });
    });

    describe("security questions", () => {
        it("updateSecurityQuestions and getSecurityQuestionsForUser round-trip", async () => {
            const user = await createTestUser();
            const qas = [
                { question: "Color?", answer: "blue" },
                { question: "Pet?", answer: "dog" },
                { question: "City?", answer: "nyc" },
            ];
            await users.updateSecurityQuestions(user.id, qas);
            const qs = await users.getSecurityQuestionsForUser(user.id);
            assert.strictEqual(qs.security_question_1, "Color?");
            assert.strictEqual(qs.security_question_2, "Pet?");
            assert.strictEqual(qs.security_question_3, "City?");
        });

        it("verifySecurityAnswers returns true for correct answers", async () => {
            const user = await createTestUser();
            const qas = [
                { question: "A?", answer: "one" },
                { question: "B?", answer: "two" },
                { question: "C?", answer: "three" },
            ];
            await users.updateSecurityQuestions(user.id, qas);
            const valid = await users.verifySecurityAnswers(user.id, ["one", "two", "three"]);
            assert.strictEqual(valid, true);
        });

        it("verifySecurityAnswers returns false for wrong answers", async () => {
            const user = await createTestUser();
            const qas = [
                { question: "A?", answer: "one" },
                { question: "B?", answer: "two" },
                { question: "C?", answer: "three" },
            ];
            await users.updateSecurityQuestions(user.id, qas);
            const invalid = await users.verifySecurityAnswers(user.id, ["wrong", "wrong", "wrong"]);
            assert.strictEqual(invalid, false);
        });

        it("rejects wrong number of security questions", async () => {
            const user = await createTestUser();
            await assert.rejects(async () => await users.updateSecurityQuestions(user.id, [{ question: "A?", answer: "one" }]), { message: "Exactly three security questions and answers must be provided" });
        });
    });

    describe("logoutInactiveUsers", () => {
        it("deletes expired sessions", async () => {
            const user = await createTestUser();
            await loginTestUser(user.id);
            // Expire the session
            await db.query("UPDATE logged_in_users SET logout_at = now() - interval '1 hour' WHERE user_id = $1", [user.id]);
            await users.logoutInactiveUsers();
            const result = await db.query("SELECT * FROM logged_in_users WHERE user_id = $1", [user.id]);
            assert.strictEqual(result.rowCount, 0);
        });
    });

    describe("unsuspendExpiredSuspensions", () => {
        it("reinstates users whose suspension has ended", async () => {
            const user = await createTestUser({ status: "active" });
            // Suspend with an already-expired end date
            await db.query("UPDATE users SET status = 'suspended', suspension_start_at = now() - interval '2 days', suspension_end_at = now() - interval '1 day' WHERE id = $1", [user.id]);
            await users.unsuspendExpiredSuspensions();
            const after = await users.getUserById(user.id);
            assert.strictEqual(after.status, "active");
            assert.strictEqual(after.suspension_start_at, null);
        });
    });

    describe("getUserByResetToken", () => {
        it("returns null for non-existent token", async () => {
            const result = await users.getUserByResetToken("nonexistent_token");
            assert.strictEqual(result, null);
        });

        it("returns user for valid non-expired token", async () => {
            const user = await createTestUser();
            await db.query("UPDATE users SET reset_token = $1, reset_token_expires_at = now() + interval '1 hour' WHERE id = $2", ["valid_token_123", user.id]);
            const result = await users.getUserByResetToken("valid_token_123");
            assert.ok(result);
            assert.strictEqual(result.id, user.id);
        });

        it("returns null for expired token", async () => {
            const user = await createTestUser();
            await db.query("UPDATE users SET reset_token = $1, reset_token_expires_at = now() - interval '1 hour' WHERE id = $2", ["expired_token", user.id]);
            const result = await users.getUserByResetToken("expired_token");
            assert.strictEqual(result, null);
        });
    });

    describe("getUserByUsername", () => {
        it("returns user for existing username", async () => {
            const user = await createTestUser();
            const result = await users.getUserByUsername(user.username);
            assert.ok(result);
            assert.strictEqual(result.id, user.id);
            assert.strictEqual(result.username, user.username);
        });

        it("returns null for non-existent username", async () => {
            const result = await users.getUserByUsername("nobody_here_9999");
            assert.strictEqual(result, null);
        });
    });

    describe("changePasswordWithCurrentPassword", () => {
        it("changes password when current password is correct", async () => {
            const user = await createTestUser({ password: "OldPass1!x" });
            await users.changePasswordWithCurrentPassword(user.id, "OldPass1!x", "NewPass2@y");
            // Verify new password works
            const check = await db.query("SELECT 1 FROM users WHERE id = $1 AND password_hash = crypt($2, password_hash)", [user.id, "NewPass2@y"]);
            assert.strictEqual(check.rowCount, 1);
        });

        it("rejects incorrect current password", async () => {
            const user = await createTestUser({ password: "Correct1!x" });
            await assert.rejects(
                () => users.changePasswordWithCurrentPassword(user.id, "Wrong1!Pass", "NewPass2@y"),
                (err) => {
                    assert.strictEqual(err.code, "INVALID_CURRENT_PASSWORD");
                    return true;
                },
            );
        });
    });

    describe("updateSecurityQuestionsWithCurrentPassword", () => {
        it("updates questions when current password is correct", async () => {
            const user = await createTestUser({ password: "Valid1!Pass" });
            const questions = [
                { question: "q1", answer: "a1" },
                { question: "q2", answer: "a2" },
                { question: "q3", answer: "a3" },
            ];
            await users.updateSecurityQuestionsWithCurrentPassword(user.id, "Valid1!Pass", questions);
            const result = await users.getSecurityQuestionsForUser(user.id);
            assert.strictEqual(result.security_question_1, "q1");
        });

        it("rejects incorrect current password", async () => {
            const user = await createTestUser({ password: "Valid1!Pass" });
            const questions = [
                { question: "q1", answer: "a1" },
                { question: "q2", answer: "a2" },
                { question: "q3", answer: "a3" },
            ];
            await assert.rejects(
                () => users.updateSecurityQuestionsWithCurrentPassword(user.id, "Wrong1!Pass", questions),
                (err) => {
                    assert.strictEqual(err.code, "INVALID_CURRENT_PASSWORD");
                    return true;
                },
            );
        });
    });

    describe("deleteUserById", () => {
        it("deletes the user from the database", async () => {
            const user = await createTestUser();
            await users.deleteUserById(user.id);
            const result = await users.getUserById(user.id);
            assert.strictEqual(result, null);
        });
    });

    describe("setUserPassword", () => {
        it("sets password and marks temp when temp=true", async () => {
            const user = await createTestUser();
            const ok = await users.setUserPassword(user.id, "Temp1!Pass", true);
            assert.ok(ok);
            const check = await db.query("SELECT temp_password FROM users WHERE id = $1", [user.id]);
            assert.strictEqual(check.rows[0].temp_password, true);
        });

        it("sets password with temp=false by default", async () => {
            const user = await createTestUser();
            await users.setUserPassword(user.id, "Perm1!Pass");
            const check = await db.query("SELECT temp_password, password_hash FROM users WHERE id = $1", [user.id]);
            assert.strictEqual(check.rows[0].temp_password, false);
            // Verify password works
            const verify = await db.query("SELECT 1 FROM users WHERE id = $1 AND password_hash = crypt($2, password_hash)", [user.id, "Perm1!Pass"]);
            assert.strictEqual(verify.rowCount, 1);
        });

        it("rejects weak password", async () => {
            const user = await createTestUser();
            await assert.rejects(() => users.setUserPassword(user.id, "weak"), /complexity/);
        });
    });

    describe("sendPasswordExpiryWarnings", () => {
        it("runs without error on empty data", async () => {
            await users.sendPasswordExpiryWarnings();
        });
    });

    describe("suspendUsersWithExpiredPasswords", () => {
        it("suspends users with expired passwords", async () => {
            const user = await createTestUser();
            await db.query("UPDATE users SET password_expires_at = now() - interval '1 day' WHERE id = $1", [user.id]);
            // The function sends emails, which will fail in test without SMTP.
            // We just verify the DB state change by catching the email error.
            try {
                await users.suspendUsersWithExpiredPasswords();
            } catch {
                // email send failure is expected in test env
            }
            const after = await users.getUserById(user.id);
            assert.strictEqual(after.status, "suspended");
        });
    });

    /* ------------------------------------------------------------------ */
    /*  updateUserProfile – edge cases                                     */
    /* ------------------------------------------------------------------ */

    describe("updateUserProfile (edges)", () => {
        it("returns null when no updates provided", async () => {
            const user = await createTestUser();
            const result = await users.updateUserProfile(user.id, {});
            assert.strictEqual(result, null);
        });
    });

    /* ------------------------------------------------------------------ */
    /*  getSecurityQuestionsForUser – missing user                         */
    /* ------------------------------------------------------------------ */

    describe("getSecurityQuestionsForUser (missing)", () => {
        it("returns empty for non-existent user", async () => {
            const result = await users.getSecurityQuestionsForUser(999999);
            assert.ok(!result || (Array.isArray(result) && result.length === 0));
        });
    });

    /* ------------------------------------------------------------------ */
    /*  changePassword – password reuse                                    */
    /* ------------------------------------------------------------------ */

    describe("changePassword (reuse)", () => {
        it("rejects re-using the same password", async () => {
            const user = await createTestUser();
            await users.changePassword(user.id, "NewStr0ng!Pass99");
            await assert.rejects(() => users.changePassword(user.id, "NewStr0ng!Pass99"), /same as any past/i);
        });
    });
});
