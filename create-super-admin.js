const bcrypt = require("bcryptjs");
const db = require("./src/config/database");
require("dotenv").config();

async function createSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@mis.local";
    const password = process.env.SUPER_ADMIN_PASSWORD || "Admin@123";
    const name = process.env.SUPER_ADMIN_NAME || "Platform Super Admin";

    const [roles] = await db.query(
        `SELECT id FROM roles WHERE name = 'SUPER_ADMIN' LIMIT 1`
    );

    if (!roles.length) throw new Error("SUPER_ADMIN role is not configured. Run the database migration first.");

    const [existing] = await db.query(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        [email]
    );

    const passwordHash = await bcrypt.hash(password, 12);

    if (existing.length) {
        await db.query(
            `UPDATE users SET role_id = ?, organization_id = NULL, name = ?, password_hash = ?, status = 'ACTIVE' WHERE id = ?`,
            [roles[0].id, name, passwordHash, existing[0].id]
        );
        console.log(`SUPER_ADMIN updated: ${email}`);
    } else {
        await db.query(
            `INSERT INTO users (organization_id, role_id, name, email, password_hash, status) VALUES (NULL, ?, ?, ?, ?, 'ACTIVE')`,
            [roles[0].id, name, email, passwordHash]
        );
        console.log(`SUPER_ADMIN created: ${email}`);
    }

    await db.end();
}

createSuperAdmin().catch(async (error) => {
    console.error(error);
    try { await db.end(); } catch (_) {}
    process.exit(1);
});
