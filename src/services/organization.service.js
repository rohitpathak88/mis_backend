const db = require("../config/database");

const getOrganizations = async () => {
    const [rows] = await db.query(`
        SELECT
            o.id,
            o.name,
            o.code,
            o.status,
            o.created_at AS createdAt,
            (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS userCount,
            (SELECT COUNT(*) FROM departments d WHERE d.organization_id = o.id AND d.status = 'ACTIVE') AS departmentCount,
            (SELECT COUNT(*) FROM teams t WHERE t.organization_id = o.id AND t.status = 'ACTIVE') AS teamCount,
            (SELECT COUNT(*) FROM loan_disbursements ld WHERE ld.organization_id = o.id) AS misRecordCount
        FROM organizations o
        ORDER BY o.created_at DESC, o.name ASC
    `);

    return rows;
};

const getOrganizationById = async (organizationId) => {
    const [rows] = await db.query(`
        SELECT
            o.id,
            o.name,
            o.code,
            o.status,
            o.created_at AS createdAt,
            (SELECT COUNT(*) FROM users u WHERE u.organization_id = o.id) AS userCount,
            (SELECT COUNT(*) FROM departments d WHERE d.organization_id = o.id AND d.status = 'ACTIVE') AS departmentCount,
            (SELECT COUNT(*) FROM teams t WHERE t.organization_id = o.id AND t.status = 'ACTIVE') AS teamCount,
            (SELECT COUNT(*) FROM loan_disbursements ld WHERE ld.organization_id = o.id) AS misRecordCount
        FROM organizations o
        WHERE o.id = ?
        LIMIT 1
    `, [organizationId]);

    if (!rows.length) {
        const error = new Error("Organization not found");
        error.statusCode = 404;
        throw error;
    }

    return rows[0];
};

module.exports = {
    getOrganizations,
    getOrganizationById
};
