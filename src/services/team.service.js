const db = require("../config/database");

const mapTeam = (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    departmentId: row.department_id,
    departmentName: row.department_name,
    name: row.name,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const getTeams = async (organizationId, filters = {}) => {
    const conditions = [
        "t.organization_id = ?"
    ];

    const params = [
        organizationId
    ];

    if (filters.departmentId) {
        conditions.push("t.department_id = ?");
        params.push(filters.departmentId);
    }

    const [rows] = await db.query(
        `
        SELECT
            t.id,
            t.organization_id,
            t.department_id,
            d.name AS department_name,
            t.name,
            t.code,
            t.status,
            t.created_at,
            t.updated_at
        FROM teams t
        INNER JOIN departments d
            ON d.id = t.department_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY d.name ASC, t.name ASC
        `,
        params
    );

    return rows.map(mapTeam);
};

const getTeamById = async (
    organizationId,
    teamId
) => {
    const [rows] = await db.query(
        `
        SELECT
            t.id,
            t.organization_id,
            t.department_id,
            d.name AS department_name,
            t.name,
            t.code,
            t.status,
            t.created_at,
            t.updated_at
        FROM teams t
        INNER JOIN departments d
            ON d.id = t.department_id
        WHERE t.organization_id = ?
          AND t.id = ?
        LIMIT 1
        `,
        [
            organizationId,
            teamId
        ]
    );

    return rows.length
        ? mapTeam(rows[0])
        : null;
};

const validateDepartment = async (
    organizationId,
    departmentId
) => {
    const [rows] = await db.query(
        `
        SELECT
            id,
            name,
            status
        FROM departments
        WHERE id = ?
          AND organization_id = ?
        LIMIT 1
        `,
        [
            departmentId,
            organizationId
        ]
    );

    if (!rows.length) {
        const error = new Error(
            "Department not found"
        );

        error.statusCode = 404;

        throw error;
    }

    if (rows[0].status !== "ACTIVE") {
        const error = new Error(
            "Cannot assign team to an inactive department"
        );

        error.statusCode = 400;

        throw error;
    }

    return rows[0];
};

const createTeam = async (
    organizationId,
    data
) => {
    await validateDepartment(
        organizationId,
        data.departmentId
    );

    try {
        const [result] = await db.query(
            `
            INSERT INTO teams (
                organization_id,
                department_id,
                name,
                code
            )
            VALUES (?, ?, ?, ?)
            `,
            [
                organizationId,
                data.departmentId,
                data.name,
                data.code
            ]
        );

        return getTeamById(
            organizationId,
            result.insertId
        );

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            const duplicateError = new Error(
                "A team with this name or code already exists in this department"
            );

            duplicateError.statusCode = 409;

            throw duplicateError;
        }

        throw error;
    }
};

const updateTeam = async (
    organizationId,
    teamId,
    data
) => {
    await validateDepartment(
        organizationId,
        data.departmentId
    );

    try {
        const [result] = await db.query(
            `
            UPDATE teams
            SET
                department_id = ?,
                name = ?,
                code = ?
            WHERE organization_id = ?
              AND id = ?
            `,
            [
                data.departmentId,
                data.name,
                data.code,
                organizationId,
                teamId
            ]
        );

        if (result.affectedRows === 0) {
            const error = new Error(
                "Team not found"
            );

            error.statusCode = 404;

            throw error;
        }

        return getTeamById(
            organizationId,
            teamId
        );

    } catch (error) {

        if (error.code === "ER_DUP_ENTRY") {
            const duplicateError = new Error(
                "A team with this name or code already exists in this department"
            );

            duplicateError.statusCode = 409;

            throw duplicateError;
        }

        throw error;
    }
};

const updateTeamStatus = async (
    organizationId,
    teamId,
    status
) => {
    const [result] = await db.query(
        `
        UPDATE teams
        SET status = ?
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            status,
            organizationId,
            teamId
        ]
    );

    if (result.affectedRows === 0) {
        const error = new Error(
            "Team not found"
        );

        error.statusCode = 404;

        throw error;
    }

    return getTeamById(
        organizationId,
        teamId
    );
};

const deleteTeam = async (
    organizationId,
    teamId
) => {
    // Check whether users are assigned to this team
    const [users] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM users
        WHERE organization_id = ?
          AND team_id = ?
        `,
        [
            organizationId,
            teamId
        ]
    );

    if (users[0].count > 0) {
        const error = new Error(
            "Team cannot be deleted because users are assigned to it"
        );

        error.statusCode = 409;

        throw error;
    }

    // Check whether MIS records reference this team
    const [misRecords] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM loan_disbursements
        WHERE organization_id = ?
          AND team_id = ?
        `,
        [
            organizationId,
            teamId
        ]
    );

    if (misRecords[0].count > 0) {
        const error = new Error(
            "Team cannot be deleted because MIS records are associated with it"
        );

        error.statusCode = 409;

        throw error;
    }

    const [result] = await db.query(
        `
        DELETE FROM teams
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            organizationId,
            teamId
        ]
    );

    if (result.affectedRows === 0) {
        const error = new Error(
            "Team not found"
        );

        error.statusCode = 404;

        throw error;
    }
};

module.exports = {
    getTeams,
    getTeamById,
    createTeam,
    updateTeam,
    updateTeamStatus,
    deleteTeam
};