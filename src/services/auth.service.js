const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../config/database");

const login = async (email, password) => {
    const [users] = await db.query(
        `
        SELECT
            u.id,
            u.organization_id,
            u.name,
            u.email,
            u.password_hash,
            u.status,
            r.name AS role
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.email = ?
        LIMIT 1
        `,
        [email]
    );

    if (users.length === 0) {
        throw new Error("Invalid email or password");
    }

    const user = users[0];

    if (user.status !== "ACTIVE") {
        throw new Error("User account is inactive");
    }

    const passwordValid = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordValid) {
        throw new Error("Invalid email or password");
    }

    const token = jwt.sign(
        {
            userId: user.id,
            organizationId: user.organization_id,
            role: user.role
        },
        process.env.JWT_SECRET,
        {
            expiresIn: process.env.JWT_EXPIRES_IN || "8h"
        }
    );

    await db.query(
        `
        UPDATE users
        SET last_login_at = NOW()
        WHERE id = ?
        `,
        [user.id]
    );

    return {
        token,
        user: {
            id: user.id,
            organizationId: user.organization_id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    };
};

const registerOrganization = async ({
    organizationName,
    adminName,
    email,
    password
}) => {

    const connection = await db.getConnection();

    try {

        await connection.beginTransaction();

        // Normalize inputs
        let organizationCode;

        do {

            organizationCode =
                generateOrganizationCode();

            const [existing] =
                await connection.query(
                    `
            SELECT id
            FROM organizations
            WHERE code = ?
            LIMIT 1
            `,
                    [organizationCode]
                );

            if (existing.length === 0) {
                break;
            }

        } while (true);

        const normalizedEmail =
            email.trim().toLowerCase();

        // Check admin email
        const [existingUsers] =
            await connection.query(
                `
                SELECT id
                FROM users
                WHERE email = ?
                LIMIT 1
                `,
                [normalizedEmail]
            );

        if (existingUsers.length > 0) {

            throw new Error(
                "Email address is already registered"
            );
        }

        // Create organization
        const [organizationResult] =
            await connection.query(
                `
                INSERT INTO organizations
                (
                    name,
                    code,
                    status
                )
                VALUES (?, ?, 'ACTIVE')
                `,
                [
                    organizationName.trim(),
                    organizationCode
                ]
            );

        const organizationId =
            organizationResult.insertId;

        // Find ORG_ADMIN role
        const [roles] =
            await connection.query(
                `
                SELECT id
                FROM roles
                WHERE name = 'ORG_ADMIN'
                LIMIT 1
                `
            );

        if (roles.length === 0) {

            throw new Error(
                "ORG_ADMIN role is not configured"
            );
        }

        const roleId = roles[0].id;

        // Hash password
        const passwordHash =
            await bcrypt.hash(password, 12);

        // Create administrator
        const [userResult] =
            await connection.query(
                `
                INSERT INTO users
                (
                    organization_id,
                    role_id,
                    name,
                    email,
                    password_hash,
                    status
                )
                VALUES (?, ?, ?, ?, ?, 'ACTIVE')
                `,
                [
                    organizationId,
                    roleId,
                    adminName.trim(),
                    normalizedEmail,
                    passwordHash
                ]
            );

        const userId =
            userResult.insertId;

        await connection.commit();

        return {
            organizationId,
            userId
        };

    } catch (error) {

        await connection.rollback();

        throw error;

    } finally {

        connection.release();
    }
};


const generateOrganizationCode = () => {
    return `ORG-${crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase()
        .substring(0, 6)}`;
};
module.exports = {
    login,
    registerOrganization
};