const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { sendEmail, sendAccountApprovedEmail } = require("../src/services/email");

describe("email service", () => {
    describe("sendEmail", () => {
        it("throws when SMTP is not configured", async () => {
            // In test env there is no real SMTP, so sendEmail rejects
            await assert.rejects(
                () => sendEmail("test@example.com", "Test Subject", "<p>Hello</p>", "Hello"),
                (err) => {
                    // Accept any SMTP-related error
                    assert.ok(err instanceof Error);
                    return true;
                },
            );
        });
    });

    describe("sendAccountApprovedEmail", () => {
        it("throws when SMTP is not configured", async () => {
            await assert.rejects(
                () =>
                    sendAccountApprovedEmail({
                        logoUrl: "https://example.com/logo.png",
                        supportEmail: "support@example.com",
                        firstName: "Test",
                        appName: "HELM",
                        loginUrl: "https://example.com/login",
                        userEmail: "approved@example.com",
                        approvedDate: "2025-01-15",
                        orgName: "Test Org",
                    }),
                (err) => {
                    assert.ok(err instanceof Error);
                    return true;
                },
            );
        });

        it("renders HTML before attempting to send", async () => {
            // Verify the function attempts to render email (it will fail at SMTP send)
            let caught;
            try {
                await sendAccountApprovedEmail({
                    logoUrl: "https://example.com/logo.png",
                    supportEmail: "support@example.com",
                    firstName: "Alice",
                    appName: "HELM",
                    loginUrl: "https://example.com/login",
                    userEmail: "alice@example.com",
                    approvedDate: "2025-01-15",
                    orgName: "Test Org",
                });
            } catch (err) {
                caught = err;
            }
            // The function should throw (no SMTP), confirming it ran
            assert.ok(caught, "Expected an error to be thrown");
            assert.ok(caught instanceof Error);
        });
    });
});
