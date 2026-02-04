// This file shall provide email sending functionalities using nodemailer.

const logger = require("../utils/logger");
const utilities = require("../utils/utilities");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
    },
});

function sendEmail(to, subject, body) {
    logger.log("info", `Sending email to ${to} with subject "${subject}"`, { function: "sendEmail" }, utilities.getCallerInfo());
    let htmlBody = null;
    if(body.includes("<!doctype html>") || body.includes("<html")){
        htmlBody = body;
        body = "This is an HTML email. Please view it in an HTML-compatible email viewer.";
    }
    const mailOptions = {
        from: `HELM Project Manager <${process.env.SMTP_EMAIL_FROM}>`,
        to: to,
        subject: subject,
        text: body,
        html: htmlBody,
    };
    return transporter.sendMail(mailOptions)
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
};
