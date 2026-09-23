const db = require("../config/database");

const mapDepartment = (row) => ({
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    code: row.code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

const getDepartments = async (organizationId) => {
    const [rows] = await db.query(
        `
        SELECT
            id,
            organization_id,
            name,
            code,
            status,
            created_at,
            updated_at
        FROM departments
        WHERE organization_id = ?
        ORDER BY name ASC
        `,
        [organizationId]
    );

    return rows.map(mapDepartment);
};

const getDepartmentById = async (organizationId, departmentId) => {
    const [rows] = await db.query(
        `
        SELECT
            id,
            organization_id,
            name,
            code,
            status,
            created_at,
            updated_at
        FROM departments
        WHERE organization_id = ?
          AND id = ?
        LIMIT 1
        `,
        [organizationId, departmentId]
    );

    return rows.length ? mapDepartment(rows[0]) : null;
};

const createDepartment = async (organizationId, data) => {
    try {
        const [result] = await db.query(
            `
            INSERT INTO departments (
                organization_id,
                name,
                code
            )
            VALUES (?, ?, ?)
            `,
            [
                organizationId,
                data.name,
                data.code
            ]
        );

        return getDepartmentById(
            organizationId,
            result.insertId
        );

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            const duplicateError = new Error(
                "A department with this name or code already exists"
            );

            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw error;
    }
};

const updateDepartment = async (
    organizationId,
    departmentId,
    data
) => {
    try {
        const [result] = await db.query(
            `
            UPDATE departments
            SET
                name = ?,
                code = ?
            WHERE organization_id = ?
              AND id = ?
            `,
            [
                data.name,
                data.code,
                organizationId,
                departmentId
            ]
        );

        if (result.affectedRows === 0) {
            const error = new Error("Department not found");
            error.statusCode = 404;
            throw error;
        }

        return getDepartmentById(
            organizationId,
            departmentId
        );

    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            const duplicateError = new Error(
                "A department with this name or code already exists"
            );

            duplicateError.statusCode = 409;
            throw duplicateError;
        }

        throw error;
    }
};

const updateDepartmentStatus = async (
    organizationId,
    departmentId,
    status
) => {
    const [result] = await db.query(
        `
        UPDATE departments
        SET status = ?
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            status,
            organizationId,
            departmentId
        ]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Department not found");
        error.statusCode = 404;
        throw error;
    }

    return getDepartmentById(
        organizationId,
        departmentId
    );
};

const deleteDepartment = async (
    organizationId,
    departmentId
) => {
    const [teams] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM teams
        WHERE organization_id = ?
          AND department_id = ?
        `,
        [
            organizationId,
            departmentId
        ]
    );

    if (teams[0].count > 0) {
        const error = new Error(
            "Department cannot be deleted because teams are assigned to it"
        );

        error.statusCode = 409;
        throw error;
    }

    const [users] = await db.query(
        `
        SELECT COUNT(*) AS count
        FROM users
        WHERE organization_id = ?
          AND department_id = ?
        `,
        [
            organizationId,
            departmentId
        ]
    );

    if (users[0].count > 0) {
        const error = new Error(
            "Department cannot be deleted because users are assigned to it"
        );

        error.statusCode = 409;
        throw error;
    }

    const [result] = await db.query(
        `
        DELETE FROM departments
        WHERE organization_id = ?
          AND id = ?
        `,
        [
            organizationId,
            departmentId
        ]
    );

    if (result.affectedRows === 0) {
        const error = new Error("Department not found");
        error.statusCode = 404;
        throw error;
    }
};

module.exports = {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    updateDepartmentStatus,
    deleteDepartment
};