// This file shall provide email sending functionalities using nodemailer.

const logger = require("../utils/logger");
const utilities = require("../utils/utilities");
const nodemailer = require("nodemailer");
const { renderEmail } = require("./email_renderer");

function buildAccountApprovedText(data) {
    const lines = [];
    lines.push(`Hi ${data.firstName},`);
    lines.push("");
    lines.push(`Your account for ${data.appName} has been approved.`);
    lines.push("");
    lines.push(`Sign in: ${data.loginUrl}`);
    lines.push("");
    lines.push(`Username or email: ${data.userEmail}`);
    lines.push(`Approved on: ${data.approvedDate}`);
    lines.push(`Organization: ${data.orgName}`);
    lines.push("");
    lines.push(`Need help: ${data.supportEmail}`);
    return lines.join("\n");
}

async function sendAccountApprovedEmail(data) {
    const subject = `Your HELM account has been approved!`;
    const html = await renderEmail("account_approval", {
        subject,
        preheader: "Your HELM account has been approved. Log in to get started.",
        title: "Account Approved",
        headerRightText: "HELM Project Manager",
        companyName: "HELM Project Manager",
        companyAddress: "1234 Main St, Anytown, USA",
        logoUrl: data.logoUrl,
        supportEmail: data.supportEmail,
        firstName: data.firstName,
        appName: data.appName,
        loginUrl: data.loginUrl,
        userEmail: data.userEmail,
        approvedDate: data.approvedDate,
        orgName: data.orgName,
        button: {
            url: data.loginUrl,
            label: "Log In to HELM",
        },
        footerNote: "If you did not request this account, please ignore this email.",
    });
    const text = buildAccountApprovedText(data);
    return sendEmail(data.userEmail, subject, html, text);

}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
    },
});

function sendEmail(to, subject, body, text = null) {
    logger.log("info", `Sending email to ${to} with subject "${subject}"`, { function: "sendEmail" }, utilities.getCallerInfo());
    let htmlBody = null;
    if (body.includes("<!doctype html>") || body.includes("<html")) {
        htmlBody = body;
        body = text || "This is an HTML email. Please view it in an HTML-compatible email viewer.";
    }
    const mailOptions = {
        from: `HELM Project Manager <${process.env.SMTP_EMAIL_FROM}>`,
        to: to,
        subject: subject,
        text: body,
        html: htmlBody,
    };
    return transporter
        .sendMail(mailOptions)
        .then((result) => {
            logger.log("debug", `Email sent to ${to}`, { function: "sendEmail", messageId: result?.messageId }, utilities.getCallerInfo());
            return result;
        })
        .catch((error) => {
            logger.log("error", `Failed to send email to ${to}: ${error.message}`, { function: "sendEmail" }, utilities.getCallerInfo());
            throw error;
        });
}

module.exports = {
    sendEmail,
    sendAccountApprovedEmail,
};
