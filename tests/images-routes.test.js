const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { setup, teardown, cleanAllTables, getDb, createTestUser, loginTestUser, getAdminAuth } = require("./helpers/setup");
const { startApp, stopApp, request, getBaseUrl } = require("./helpers/http");
const path = require("path");
const fs = require("fs");

describe("images routes", () => {
    let db;

    before(async () => {
        await setup();
        db = getDb();
        await startApp();
    });

    beforeEach(async () => await cleanAllTables());
    after(async () => {
        await stopApp();
        await teardown();
    });

    async function adminHeaders() {
        const { headers } = await getAdminAuth();
        return headers;
    }

    describe("GET /images/user-icon.png", () => {
        it("returns 401 without auth", async () => {
            const res = await request("GET", "/images/user-icon.png");
            assert.strictEqual(res.status, 401);
        });

        it("returns an image with auth", async () => {
            const h = await adminHeaders();
            const res = await request("GET", "/images/user-icon.png", { headers: h });
            assert.strictEqual(res.status, 200);
        });

        it("returns default icon when user has no custom icon", async () => {
            const user = await createTestUser();
            const { headers } = await loginTestUser(user.id);
            const res = await request("GET", "/images/user-icon.png", { headers });
            assert.strictEqual(res.status, 200);
        });
    });

    describe("POST /images/upload-user-icon", () => {
        it("returns 401 without auth", async () => {
            const res = await request("POST", "/images/upload-user-icon");
            assert.strictEqual(res.status, 401);
        });

        it("returns 400 when no file is provided", async () => {
            const h = await adminHeaders();
            const res = await request("POST", "/images/upload-user-icon", { headers: h });
            assert.strictEqual(res.status, 400);
        });

        it("accepts a valid image upload via multipart", async () => {
            const h = await adminHeaders();

            // Create a tiny valid PNG (1x1 pixel)
            const pngBuffer = Buffer.from([
                0x89,
                0x50,
                0x4e,
                0x47,
                0x0d,
                0x0a,
                0x1a,
                0x0a, // PNG signature
                0x00,
                0x00,
                0x00,
                0x0d,
                0x49,
                0x48,
                0x44,
                0x52, // IHDR chunk
                0x00,
                0x00,
                0x00,
                0x01,
                0x00,
                0x00,
                0x00,
                0x01, // 1x1
                0x08,
                0x02,
                0x00,
                0x00,
                0x00,
                0x90,
                0x77,
                0x53,
                0xde,
                0x00,
                0x00,
                0x00,
                0x0c,
                0x49,
                0x44,
                0x41, // IDAT chunk
                0x54,
                0x08,
                0xd7,
                0x63,
                0xf8,
                0xcf,
                0xc0,
                0x00,
                0x00,
                0x00,
                0x02,
                0x00,
                0x01,
                0xe2,
                0x21,
                0xbc,
                0x33,
                0x00,
                0x00,
                0x00,
                0x00,
                0x49,
                0x45,
                0x4e, // IEND chunk
                0x44,
                0xae,
                0x42,
                0x60,
                0x82,
            ]);

            const boundary = "----TestBoundary" + Date.now();
            const filename = `test-upload-${Date.now()}.png`;
            const body = `--${boundary}\r\n` + `Content-Disposition: form-data; name="user_icon"; filename="${filename}"\r\n` + `Content-Type: image/png\r\n\r\n`;
            const ending = `\r\n--${boundary}--\r\n`;

            const bodyBuffer = Buffer.concat([Buffer.from(body, "utf-8"), pngBuffer, Buffer.from(ending, "utf-8")]);

            // Use raw http to send multipart since our helper uses JSON
            const http = require("http");
            const bUrl = getBaseUrl();

            const url = new URL("/images/upload-user-icon", bUrl);
            const reqHeaders = {
                ...h,
                "Content-Type": `multipart/form-data; boundary=${boundary}`,
                "Content-Length": bodyBuffer.length,
            };
            // Remove JSON content-type from admin headers
            delete reqHeaders["Content-Type"];
            reqHeaders["Content-Type"] = `multipart/form-data; boundary=${boundary}`;

            const res = await new Promise((resolve, reject) => {
                const req = http.request(url, { method: "POST", headers: reqHeaders }, (resp) => {
                    let data = "";
                    resp.on("data", (chunk) => (data += chunk));
                    resp.on("end", () => {
                        try {
                            resolve({ status: resp.statusCode, json: JSON.parse(data) });
                        } catch {
                            resolve({ status: resp.statusCode, body: data });
                        }
                    });
                });
                req.on("error", reject);
                req.write(bodyBuffer);
                req.end();
            });

            assert.strictEqual(res.status, 200);
            assert.ok(res.json.message.includes("uploaded"));

            // Clean up the uploaded file
            const uploadedPath = path.resolve(__dirname, "../user-icons", filename);
            if (fs.existsSync(uploadedPath)) {
                fs.unlinkSync(uploadedPath);
            }
        });
    });
});
