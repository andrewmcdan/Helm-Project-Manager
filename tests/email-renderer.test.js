const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const { renderEmail } = require("../src/services/email_renderer");

describe("email renderer", () => {
    it("renders account_approval template to HTML", async () => {
        const html = await renderEmail("account_approval", {
            subject: "Test Subject",
            preheader: "Test preheader",
            title: "Account Approved",
            headerRightText: "HELM",
            companyName: "HELM",
            companyAddress: "123 Test St",
            logoUrl: "https://example.com/logo.png",
            supportEmail: "support@example.com",
            firstName: "Alice",
            appName: "HELM",
            loginUrl: "https://example.com/login",
            userEmail: "alice@example.com",
            approvedDate: "2025-01-01",
            orgName: "TestOrg",
            unsubscribeUrl: "",
            preferencesUrl: "",
            button: {
                url: "https://example.com/login",
                label: "Log In",
            },
            footerNote: "If you did not request this, ignore.",
        });
        assert.ok(html.includes("<!doctype html>") || html.includes("<html"));
        assert.ok(html.includes("Alice"));
        assert.ok(html.includes("Account Approved") || html.includes("account"));
        assert.ok(html.includes("Log In"));
    });

    it("renders without button when button data is absent", async () => {
        const html = await renderEmail("account_approval", {
            subject: "No Button",
            preheader: "",
            title: "Test",
            headerRightText: "HELM",
            companyName: "HELM",
            companyAddress: "",
            logoUrl: "",
            supportEmail: "",
            firstName: "Bob",
            appName: "HELM",
            loginUrl: "",
            userEmail: "bob@test.com",
            approvedDate: "",
            orgName: "",
            unsubscribeUrl: "",
            preferencesUrl: "",
            footerNote: "",
        });
        assert.ok(html.includes("Bob"));
    });
});
