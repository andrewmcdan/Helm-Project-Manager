/**
 * One-time helper – create the helm_test role + database.
 * Run with: node scripts/create-test-db.js
 */
const { Pool } = require("pg");

async function main() {
    // Connect as superuser to the default "postgres" database
    const pool = new Pool({
        host: process.env.POSTGRES_HOST || "localhost",
        port: parseInt(process.env.POSTGRES_PORT || "5437", 10),
        database: "postgres",
        user: process.env.POSTGRES_USER || "postgres",
        password: process.env.POSTGRES_PASSWORD || "postgres",
    });

    try {
        // Create role if not exists
        const roleCheck = await pool.query("SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'helm_test'");
        if (roleCheck.rowCount === 0) {
            await pool.query("CREATE ROLE helm_test WITH LOGIN PASSWORD 'helm_test'");
            console.log("Created role helm_test");
        } else {
            console.log("Role helm_test already exists");
        }

        // Create database if not exists
        const dbCheck = await pool.query("SELECT 1 FROM pg_database WHERE datname = 'helm_test'");
        if (dbCheck.rowCount === 0) {
            await pool.query("CREATE DATABASE helm_test OWNER helm_test");
            console.log("Created database helm_test");
        } else {
            console.log("Database helm_test already exists");
        }

        // Grant privileges
        await pool.query("GRANT ALL PRIVILEGES ON DATABASE helm_test TO helm_test");
        console.log("Granted privileges to helm_test");

        // Connect to the helm_test database and grant schema privileges
        const testPool = new Pool({
            host: process.env.POSTGRES_HOST || "localhost",
            port: parseInt(process.env.POSTGRES_PORT || "5437", 10),
            database: "helm_test",
            user: process.env.POSTGRES_USER || "postgres",
            password: process.env.POSTGRES_PASSWORD || "postgres",
        });
        await testPool.query("GRANT ALL ON SCHEMA public TO helm_test");
        await testPool.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO helm_test");
        await testPool.query("ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO helm_test");
        console.log("Granted schema privileges");
        await testPool.end();
    } catch (err) {
        console.error("Error:", err.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
