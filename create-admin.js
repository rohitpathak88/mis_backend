const bcrypt = require("bcryptjs");
const db = require("./src/config/database");

const createAdmin = async () => {
    try {
        const password = "Admin@123";

        const passwordHash = await bcrypt.hash(password, 12);

        const [roles] = await db.query(
            `SELECT id FROM roles WHERE name = 'ORG_ADMIN' LIMIT 1`
        );

        if (roles.length === 0) {
            throw new Error("ORG_ADMIN role not found");
        }

        const roleId = roles[0].id;

        const [organizations] = await db.query(
            `SELECT id FROM organizations WHERE code = 'DEMO' LIMIT 1`
        );

        if (organizations.length === 0) {
            throw new Error("Demo organization not found");
        }

        const organizationId = organizations[0].id;

        await db.query(
            `
            INSERT INTO users
            (
                organization_id,
                role_id,
                name,
                email,
                password_hash
            )
            VALUES (?, ?, ?, ?, ?)
            `,
            [
                organizationId,
                roleId,
                "MIS Administrator",
                "admin@mis.local",
                passwordHash
            ]
        );

        console.log("Admin user created successfully");
        console.log("Email: admin@mis.local");
        console.log("Password: Admin@123");

    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await db.end();
    }
};

createAdmin();