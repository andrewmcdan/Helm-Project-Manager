const path = require("path");
const ejs = require("ejs");

function pathFromParts(...parts) {
    return path.join(__dirname, "email_templates", ...parts);
}

async function renderFile(filePath, data) {
    return ejs.renderFile(filePath, data, { async: true });
}

async function renderEmail(templateName, data) {
    // Render header and footer partials
    const headerHtml = await renderFile(pathFromParts("partials", "header.ejs"), data);
    const footerHtml = await renderFile(pathFromParts("partials", "footer.ejs"), data);

    // Optionally render a button partial if caller wants it
    let buttonHtml = "";
    if (data.button && data.button.url && data.button.label) {
        buttonHtml = await renderFile(pathFromParts("partials", "button.ejs"), {
            url: data.button.url,
            label: data.button.label,
        });
    }

    // Render body template
    const bodyHtml = await renderFile(pathFromParts(`${templateName}.ejs`), {
        ...data,
        buttonHtml, // allow templates to include <%- buttonHtml %>
    });

    // Render base layout
    return renderFile(pathFromParts("base.ejs"), {
        ...data,
        headerHtml,
        footerHtml,
        bodyHtml,
    });
}

module.exports = {
    renderEmail,
};
