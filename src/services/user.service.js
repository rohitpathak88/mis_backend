const db = require("../config/database");
const bcrypt = require("bcryptjs");

const mapUser = (row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,

    organizationId: row.organization_id,

    department: row.department_id
        ? {
            id: row.department_id,
            name: row.department_name,
            code: row.department_code
        }
        : null,

    team: row.team_id
        ? {
            id: row.team_id,
            name: row.team_name,
            code: row.team_code
        }
        : null,

    role: {
        id: row.role_id,
        name: row.role_name,
        description: row.role_description
    }
});


/*
|--------------------------------------------------------------------------
| User assignment validation
|--------------------------------------------------------------------------
*/

const validateAssignment = async (
    organizationId,
    roleName,
    departmentId,
    teamId
) => {
    const normalizedDepartmentId =
        departmentId ? Number(departmentId) : null;

    const normalizedTeamId =
        teamId ? Number(teamId) : null;


    // ---------------------------------------------------------
    // DEPARTMENT_HEAD
    // ---------------------------------------------------------

    if (roleName === "DEPARTMENT_HEAD") {

        if (!normalizedDepartmentId) {
            const error = new Error(
                "Department is required for Department Head"
            );

            error.statusCode = 400;
            throw error;
        }

        if (normalizedTeamId) {
            const error = new Error(
                "Team must not be assigned to a Department Head"
            );

            error.statusCode = 400;
            throw error;
        }
    }


    // ---------------------------------------------------------
    // TEAM_LEADER
    // ---------------------------------------------------------

    if (roleName === "TEAM_LEADER") {

        if (!normalizedDepartmentId) {
            const error = new Error(
                "Department is required for Team Leader"
            );

            error.statusCode = 400;
            throw error;
        }

        if (!normalizedTeamId) {
            const error = new Error(
                "Team is required for Team Leader"
            );

            error.statusCode = 400;
            throw error;
        }
    }


    // ---------------------------------------------------------
    // Validate department
    // ---------------------------------------------------------

    if (normalizedDepartmentId) {

        const [departments] = await db.query(
            `
            SELECT
                id,
                organization_id,
                status
            FROM departments
            WHERE id = ?
              AND organization_id = ?
            LIMIT 1
            `,
            [
                normalizedDepartmentId,
                organizationId
            ]
        );

        if (!departments.length) {
            const error = new Error(
                "Department does not belong to this organization"
            );

            error.statusCode = 400;
            throw error;
        }

        if (departments[0].status !== "ACTIVE") {
            const error = new Error(
                "Cannot assign user to an inactive department"
            );

            error.statusCode = 400;
            throw error;
        }
    }


    // ---------------------------------------------------------
    // Validate team
    // ---------------------------------------------------------

    if (normalizedTeamId) {

        const [teams] = await db.query(
            `
            SELECT
                id,
                organization_id,
                department_id,
                status
            FROM teams
            WHERE id = ?
              AND organization_id = ?
            LIMIT 1
            `,
            [
                normalizedTeamId,
                organizationId
            ]
        );

        if (!teams.length) {
            const error = new Error(
                "Team does not belong to this organization"
            );

            error.statusCode = 400;
            throw error;
        }

        if (teams[0].status !== "ACTIVE") {
            const error = new Error(
                "Cannot assign user to an inactive team"
            );

            error.statusCode = 400;
            throw error;
        }

        // Critical relationship validation
        if (
            normalizedDepartmentId &&
            Number(teams[0].department_id) !==
            normalizedDepartmentId
        ) {
            const error = new Error(
                "Selected team does not belong to the selected department"
            );

            error.statusCode = 400;
            throw error;
        }
    }


    // ---------------------------------------------------------
    // Roles that should not have organizational assignment
    // ---------------------------------------------------------

    const unrestrictedRoles = [
        "ORG_ADMIN",
        "MANAGEMENT",
        "MIS_USER",
        "VIEWER"
    ];

    if (
        unrestrictedRoles.includes(roleName) &&
        normalizedTeamId &&
        !normalizedDepartmentId
    ) {
        const error = new Error(
            "A team cannot be assigned without a department"
        );

        error.statusCode = 400;
        throw error;
    }

    return {
        departmentId: normalizedDepartmentId,
        teamId: normalizedTeamId
    };
};


/*
|--------------------------------------------------------------------------
| Common SELECT
|--------------------------------------------------------------------------
*/

const USER_SELECT = `
    SELECT
        u.id,
        u.organization_id,
        u.department_id,
        u.team_id,
        u.name,
        u.email,
        u.status,
        u.last_login_at,
        u.created_at,
        u.updated_at,

        r.id AS role_id,
        r.name AS role_name,
        r.description AS role_description,

        d.name AS department_name,
        d.code AS department_code,

        t.name AS team_name,
        t.code AS team_code

    FROM users u

    INNER JOIN roles r
        ON r.id = u.role_id

    LEFT JOIN departments d
        ON d.id = u.department_id

    LEFT JOIN teams t
        ON t.id = u.team_id
`;


/*
|--------------------------------------------------------------------------
| Get Users
|--------------------------------------------------------------------------
*/

const getUsers = async (organizationId) => {

    const [rows] = await db.query(
        `
        ${USER_SELECT}

        WHERE u.organization_id = ?

        ORDER BY u.created_at DESC
        `,
        [organizationId]
    );

    return rows.map(mapUser);
};


/*
|--------------------------------------------------------------------------
| Get User By ID
|--------------------------------------------------------------------------
*/

const getUserById = async (
    organizationId,
    userId
) => {

    const [rows] = await db.query(
        `
        ${USER_SELECT}

        WHERE u.organization_id = ?
          AND u.id = ?

        LIMIT 1
        `,
        [
            organizationId,
            userId
        ]
    );

    return rows.length
        ? mapUser(rows[0])
        : null;
};


/*
|--------------------------------------------------------------------------
| Get Roles
|--------------------------------------------------------------------------
*/

const getRoles = async () => {

    const [rows] = await db.query(
        `
        SELECT
            id,
            name,
            description
        FROM roles
        WHERE name != 'SUPER_ADMIN'
        ORDER BY id ASC
        `
    );

    return rows.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description
    }));
};


/*
|--------------------------------------------------------------------------
| Get Role
|--------------------------------------------------------------------------
*/

const getRoleByName = async (roleName) => {

    const [rows] = await db.query(
        `
        SELECT
            id,
            name,
            description
        FROM roles
        WHERE name = ?
        LIMIT 1
        `,
        [roleName]
    );

    if (!rows.length) {
        const error = new Error(
            "Invalid role"
        );

        error.statusCode = 400;
        throw error;
    }

    return rows[0];
};


/*
|--------------------------------------------------------------------------
| Create User
|--------------------------------------------------------------------------
*/

const createUser = async (
    organizationId,
    data
) => {

    const role = await getRoleByName(data.role);

    const assignment = await validateAssignment(
        organizationId,
        role.name,
        data.departmentId,
        data.teamId
    );

    const passwordHash = await bcrypt.hash(
        data.password,
        10
    );

    try {

        const [result] = await db.query(
            `
            INSERT INTO users (
                organization_id,
                role_id,
                department_id,
                team_id,
                name,
                email,
                password_hash,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
            `,
            [
                organizationId,
                role.id,
                assignment.departmentId,
                assignment.teamId,
                data.name,
                data.email,
                passwordHash
            ]
        );

        return getUserById(
            organizationId,
            result.insertId
        );

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {

            const duplicateError = new Error(
                "A user with this email already exists"
            );

            duplicateError.statusCode = 409;

            throw duplicateError;
        }

        throw error;
    }
};


/*
|--------------------------------------------------------------------------
| Update User
|--------------------------------------------------------------------------
*/

const updateUser = async (
    organizationId,
    userId,
    data
) => {

    const role = await getRoleByName(data.role);

    const assignment = await validateAssignment(
        organizationId,
        role.name,
        data.departmentId,
        data.teamId
    );

    const [result] = await db.query(
        `
        UPDATE users
        SET
            role_id = ?,
            department_id = ?,
            team_id = ?,
            name = ?,
            email = ?
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            role.id,
            assignment.departmentId,
            assignment.teamId,
            data.name,
            data.email,
            organizationId,
            userId
        ]
    );

    if (result.affectedRows === 0) {

        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;

        throw error;
    }

    return getUserById(
        organizationId,
        userId
    );
};


/*
|--------------------------------------------------------------------------
| Update User Status
|--------------------------------------------------------------------------
*/

const updateUserStatus = async (
    organizationId,
    userId,
    status
) => {

    const [result] = await db.query(
        `
        UPDATE users
        SET status = ?
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            status,
            organizationId,
            userId
        ]
    );

    if (result.affectedRows === 0) {

        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;

        throw error;
    }

    return getUserById(
        organizationId,
        userId
    );
};


/*
|--------------------------------------------------------------------------
| Update User Role
|--------------------------------------------------------------------------
*/

const updateUserRole = async (
    organizationId,
    userId,
    roleName
) => {

    const role = await getRoleByName(roleName);

    // Get existing assignment
    const currentUser = await getUserById(
        organizationId,
        userId
    );

    if (!currentUser) {
        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;

        throw error;
    }

    const departmentId =
        currentUser.department?.id || null;

    const teamId =
        currentUser.team?.id || null;

    const assignment = await validateAssignment(
        organizationId,
        role.name,
        departmentId,
        teamId
    );

    const [result] = await db.query(
        `
        UPDATE users
        SET
            role_id = ?,
            department_id = ?,
            team_id = ?
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            role.id,
            assignment.departmentId,
            assignment.teamId,
            organizationId,
            userId
        ]
    );

    if (result.affectedRows === 0) {

        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;

        throw error;
    }

    return getUserById(
        organizationId,
        userId
    );
};


/*
|--------------------------------------------------------------------------
| Update Password
|--------------------------------------------------------------------------
*/

const updatePassword = async (
    organizationId,
    userId,
    password
) => {

    const passwordHash = await bcrypt.hash(
        password,
        10
    );

    const [result] = await db.query(
        `
        UPDATE users
        SET password_hash = ?
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            passwordHash,
            organizationId,
            userId
        ]
    );

    if (result.affectedRows === 0) {

        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;

        throw error;
    }
};


/*
|--------------------------------------------------------------------------
| Delete User
|--------------------------------------------------------------------------
*/

const deleteUser = async (
    organizationId,
    userId
) => {

    // Keep the existing last-admin protection
    const [targetRows] = await db.query(
        `
        SELECT
            u.id,
            r.name AS role_name,
            u.status
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE u.organization_id = ?
          AND u.id = ?
        LIMIT 1
        `,
        [
            organizationId,
            userId
        ]
    );

    if (!targetRows.length) {

        const error = new Error(
            "User not found"
        );

        error.statusCode = 404;

        throw error;
    }

    if (
        targetRows[0].role_name === "ORG_ADMIN" &&
        targetRows[0].status === "ACTIVE"
    ) {

        const [admins] = await db.query(
            `
            SELECT COUNT(*) AS count
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.organization_id = ?
              AND r.name = 'ORG_ADMIN'
              AND u.status = 'ACTIVE'
            `,
            [organizationId]
        );

        if (admins[0].count <= 1) {

            const error = new Error(
                "Cannot delete the last active organization administrator"
            );

            error.statusCode = 409;

            throw error;
        }
    }

    // Soft delete
    await db.query(
        `
        UPDATE users
        SET status = 'INACTIVE'
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            organizationId,
            userId
        ]
    );
};


module.exports = {
    getUsers,
    getUserById,
    getRoles,
    createUser,
    updateUser,
    updateUserStatus,
    updateUserRole,
    updatePassword,
    deleteUser
};