const db = require("../config/database");

/**
 * Resolve dashboard scope from the authenticated user.
 *
 * Organization-wide roles:
 *   ORG_ADMIN, MANAGEMENT, MIS_USER, VIEWER
 *
 * Department scope:
 *   DEPARTMENT_HEAD
 *
 * Team scope:
 *   TEAM_LEADER
 *
 * Scope is always derived from the authenticated user's database
 * assignment. No teamId/departmentId is accepted from the client.
 */
const getDashboardScope = async ({
    organizationId,
    userId
}) => {

    const [rows] = await db.query(
        `
        SELECT
            u.id,
            u.organization_id AS organizationId,
            u.department_id AS departmentId,
            u.team_id AS teamId,
            r.name AS roleName

        FROM users u

        INNER JOIN roles r
            ON r.id = u.role_id

        WHERE
            u.id = ?
            AND u.organization_id = ?
            AND u.status = 'ACTIVE'

        LIMIT 1
        `,
        [
            userId,
            organizationId
        ]
    );

    if (!rows.length) {
        const error = new Error(
            "User is not active or does not belong to this organization"
        );

        error.code = "DASHBOARD_SCOPE_FORBIDDEN";

        throw error;
    }

    const user = rows[0];

    if (
        user.roleName === "DEPARTMENT_HEAD"
    ) {

        if (!user.departmentId) {
            const error = new Error(
                "Department Head is not assigned to a department"
            );

            error.code = "DASHBOARD_SCOPE_FORBIDDEN";

            throw error;
        }

        return {
            type: "DEPARTMENT",
            departmentId: user.departmentId
        };
    }

    if (
        user.roleName === "TEAM_LEADER"
    ) {

        if (!user.teamId) {
            const error = new Error(
                "Team Leader is not assigned to a team"
            );

            error.code = "DASHBOARD_SCOPE_FORBIDDEN";

            throw error;
        }

        return {
            type: "TEAM",
            teamId: user.teamId
        };
    }

    if (
        [
            "ORG_ADMIN",
            "MANAGEMENT",
            "MIS_USER",
            "VIEWER"
        ].includes(user.roleName)
    ) {

        return {
            type: "ORGANIZATION"
        };
    }

    // Any future/unrecognized role should fail closed.
    const error = new Error(
        "This role does not have dashboard access"
    );

    error.code = "DASHBOARD_SCOPE_FORBIDDEN";

    throw error;
};

const getDashboard = async ({
    organizationId,
    userId,
    month
}) => {

    const scope = await getDashboardScope({
        organizationId,
        userId
    });

    const conditions = [
        "ld.organization_id = ?"
    ];

    const params = [
        organizationId
    ];

    /*
     * IMPORTANT:
     * Scope is applied to the underlying loan_disbursements rows.
     * Therefore every dashboard section automatically uses the
     * same security boundary.
     */
    if (scope.type === "DEPARTMENT") {

        conditions.push(
            "ld.department_id = ?"
        );

        params.push(
            scope.departmentId
        );
    }

    if (scope.type === "TEAM") {

        conditions.push(
            "ld.team_id = ?"
        );

        params.push(
            scope.teamId
        );
    }

    if (month) {

        conditions.push(
            "ld.disbursement_month = ?"
        );

        params.push(month);
    }

    const whereClause = conditions.join(" AND ");

    // --------------------------------------------------
    // SUMMARY
    // --------------------------------------------------

    const [summaryRows] = await db.query(
        `
        SELECT
            COUNT(*) AS totalLoans,

            COALESCE(
                SUM(ld.disbursement_amount),
                0
            ) AS totalDisbursement,

            COALESCE(
                AVG(ld.disbursement_amount),
                0
            ) AS averageLoanAmount,

            COALESCE(
                SUM(ld.cashback),
                0
            ) AS totalCashback,

            COALESCE(
                SUM(ld.subvention),
                0
            ) AS totalSubvention

        FROM loan_disbursements ld

        WHERE ${whereClause}
        `,
        params
    );

    // --------------------------------------------------
    // BANK
    // --------------------------------------------------

    const [bankRows] = await db.query(
        `
        SELECT
            ld.bank_name AS name,
            COUNT(*) AS loans,
            COALESCE(
                SUM(ld.disbursement_amount),
                0
            ) AS amount

        FROM loan_disbursements ld

        WHERE ${whereClause}

        GROUP BY ld.bank_name

        ORDER BY amount DESC
        `,
        params
    );

    // --------------------------------------------------
    // PRODUCT
    // --------------------------------------------------

    const [productRows] = await db.query(
        `
        SELECT
            ld.product AS name,
            COUNT(*) AS loans,
            COALESCE(
                SUM(ld.disbursement_amount),
                0
            ) AS amount

        FROM loan_disbursements ld

        WHERE ${whereClause}

        GROUP BY ld.product

        ORDER BY amount DESC
        `,
        params
    );

    // --------------------------------------------------
    // TEAM
    // --------------------------------------------------

    const [teamRows] = await db.query(
        `
        SELECT
            ld.team_name AS name,
            COUNT(*) AS loans,
            COALESCE(
                SUM(ld.disbursement_amount),
                0
            ) AS amount

        FROM loan_disbursements ld

        WHERE ${whereClause}

        GROUP BY ld.team_name

        ORDER BY amount DESC
        `,
        params
    );

    // --------------------------------------------------
    // SELLER
    // --------------------------------------------------

    const [sellerRows] = await db.query(
        `
        SELECT
            ld.seller_name AS name,
            COUNT(*) AS loans,
            COALESCE(
                SUM(ld.disbursement_amount),
                0
            ) AS amount

        FROM loan_disbursements ld

        WHERE ${whereClause}

        GROUP BY ld.seller_name

        ORDER BY amount DESC
        `,
        params
    );

    // --------------------------------------------------
    // CITY
    // --------------------------------------------------

    const [cityRows] = await db.query(
        `
        SELECT
            ld.city AS name,
            COUNT(*) AS loans,
            COALESCE(
                SUM(ld.disbursement_amount),
                0
            ) AS amount

        FROM loan_disbursements ld

        WHERE ${whereClause}

        GROUP BY ld.city

        ORDER BY amount DESC
        `,
        params
    );

    return {
        scope: scope.type,

        summary: summaryRows[0],

        bankWise: bankRows,

        productWise: productRows,

        teamWise: teamRows,

        sellerWise: sellerRows,

        cityWise: cityRows
    };
};

module.exports = {
    getDashboard
};
