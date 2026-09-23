const XLSX = require("xlsx");
const fs = require("fs");

const db = require("../config/database");

const COLUMN_ALIASES = {
    customerName: [
        "Customer Name",
        "Customer",
        "Customer Full Name"
    ],

    contactNumber: [
        "Contact Number",
        "Mobile",
        "Mobile Number",
        "Phone Number"
    ],

    employerName: [
        "Employer Name",
        "Employer",
        "Company Name"
    ],

    bankName: [
        "Bank Name",
        "Bank"
    ],

    city: [
        "City",
        "Location"
    ],

    product: [
        "Product",
        "Product Type"
    ],

    loanAccountNo: [
        "Loan A/c No",
        "Loan Account No",
        "Loan Account Number",
        "Loan A/C No"
    ],

    disbursementAmount: [
        "Disbursement Amount",
        "Disbursement Amount (Rs.)",
        "Disbursement Amount (Rs)",
        "Loan Amount",
        "Disbursed Amount"
    ],

    disbursementMonth: [
        "Disbursement Month",
        "Disbursement Date",
        "Disbursal Month"
    ],

    sellerName: [
        "Seller Name",
        "Seller",
        "Sales Person"
    ],

    teamName: [
        "Team",
        "Team Name"
    ],

    dsaCode: [
        "DSA Code",
        "DSA",
        "DSA ID"
    ],

    cashback: [
        "CashBack",
        "Cashback",
        "Cash Back"
    ],

    subvention: [
        "Subvention",
        "Subvention Amount"
    ]
};

const normalizeHeader = (value) => {
    return String(value || "")
        .trim()
        .replace(/\s+/g, " ");
};

const resolveColumns = (row) => {

    const availableColumns = Object.keys(row);

    const resolved = {};

    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {

        const matchedColumn = availableColumns.find(
            (column) =>
                aliases
                    .map(normalizeHeader)
                    .includes(normalizeHeader(column))
        );

        resolved[field] = matchedColumn || null;
    }

    return resolved;
};

const normalizeRow = (row) => {
    const normalized = {};

    Object.keys(row).forEach((key) => {
        normalized[normalizeHeader(key)] = row[key];
    });

    return normalized;
};

const parseAmount = (value) => {
    if (value === null || value === undefined || value === "") {
        return 0;
    }

    if (typeof value === "number") {
        return value;
    }

    const cleaned = String(value)
        .replace(/,/g, "")
        .replace(/[₹$]/g, "")
        .trim();

    const amount = Number(cleaned);

    return Number.isFinite(amount) ? amount : NaN;
};

const parseMonth = (value) => {
    if (value instanceof Date && !isNaN(value)) {
        return value;
    }

    if (typeof value === "number") {
        const date = XLSX.SSF.parse_date_code(value);

        if (date) {
            return new Date(
                date.y,
                date.m - 1,
                date.d || 1
            );
        }
    }

    const text = String(value || "").trim();

    if (!text) {
        return null;
    }

    const match = text.match(
        /^([A-Za-z]+)[\s'-]*(\d{2,4})$/
    );

    if (match) {
        const monthName = match[1];
        let year = Number(match[2]);

        if (year < 100) {
            year += 2000;
        }

        const month = new Date(
            `${monthName} 1, ${year}`
        );

        if (!isNaN(month)) {
            return month;
        }
    }

    const parsed = new Date(text);

    return isNaN(parsed) ? null : parsed;
};

const formatDate = (date) => {
    if (!date) {
        return null;
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const importExcel = async ({
    file,
    organizationId,
    userId,
    reportingMonth,
    teamId
}) => {

    let connection;

    try {
        const workbook = XLSX.readFile(file.path, {
            cellDates: true
        });

        if (!workbook.SheetNames.length) {
            throw new Error("Excel file contains no worksheets");
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const rows = XLSX.utils.sheet_to_json(
            worksheet,
            { defval: null }
        );

        if (!rows.length) {
            throw new Error("Excel file contains no data");
        }

        const firstRow = normalizeRow(rows[0]);
        const columns = resolveColumns(firstRow);

        const requiredFields = [
            "customerName",
            "loanAccountNo",
            "disbursementAmount",
            "disbursementMonth"
        ];

        const missingColumns = requiredFields.filter(
            (field) => !columns[field]
        );

        if (missingColumns.length) {
            throw new Error(
                `Unable to map required fields: ${missingColumns.join(", ")}`
            );
        }

        const parsedRows = [];
        const validationErrors = [];

        rows.forEach((rawRow, index) => {
            const rowNumber = index + 2;
            const row = normalizeRow(rawRow);

            const customerName = String(
                row[columns.customerName] || ""
            ).trim();

            const loanAccountNo = String(
                row[columns.loanAccountNo] || ""
            ).trim();

            const amount = parseAmount(
                row[columns.disbursementAmount]
            );

            const month = parseMonth(
                row[columns.disbursementMonth]
            );

            if (!customerName) {
                validationErrors.push(
                    `Row ${rowNumber}: Customer Name is required`
                );
            }

            if (!loanAccountNo) {
                validationErrors.push(
                    `Row ${rowNumber}: Loan A/c No is required`
                );
            }

            if (!Number.isFinite(amount) || amount < 0) {
                validationErrors.push(
                    `Row ${rowNumber}: Invalid Disbursement Amount`
                );
            }

            if (!month) {
                validationErrors.push(
                    `Row ${rowNumber}: Invalid Disbursement Month`
                );
            }

            const cashback = columns.cashback
                ? parseAmount(row[columns.cashback])
                : 0;

            const subvention = columns.subvention
                ? parseAmount(row[columns.subvention])
                : 0;

            if (!Number.isFinite(cashback)) {
                validationErrors.push(
                    `Row ${rowNumber}: Invalid CashBack`
                );
            }

            if (!Number.isFinite(subvention)) {
                validationErrors.push(
                    `Row ${rowNumber}: Invalid Subvention`
                );
            }

            parsedRows.push({
                customerName,
                contactNumber: columns.contactNumber
                    ? row[columns.contactNumber]
                    : null,
                employerName: columns.employerName
                    ? row[columns.employerName]
                    : null,
                bankName: columns.bankName
                    ? row[columns.bankName]
                    : null,
                city: columns.city
                    ? row[columns.city]
                    : null,
                product: columns.product
                    ? row[columns.product]
                    : null,
                loanAccountNo,
                disbursementAmount: amount,
                disbursementMonth: formatDate(month),
                sellerName: columns.sellerName
                    ? row[columns.sellerName]
                    : null,
                teamName: columns.teamName
                    ? row[columns.teamName]
                    : null,
                dsaCode: columns.dsaCode
                    ? row[columns.dsaCode]
                    : null,
                cashback,
                subvention
            });
        });

        if (validationErrors.length) {
            throw new Error(
                `Validation failed:\n${validationErrors.join("\n")}`
            );
        }

        const importMonth =
            reportingMonth ||
            parsedRows[0].disbursementMonth;

        connection = await db.getConnection();

        await connection.beginTransaction();

        /*
         * Team Leaders use their assigned team automatically.
         * Organization-level users must provide teamId.
         */
        const [userRows] = await connection.query(
            `
                SELECT
                    u.team_id AS userTeamId,
                    u.department_id AS userDepartmentId,
                    r.name AS roleName
                FROM users u
                INNER JOIN roles r
                    ON r.id = u.role_id
                WHERE u.id = ?
                  AND u.organization_id = ?
                  AND u.status = 'ACTIVE'
                LIMIT 1
            `,
            [userId, organizationId]
        );

        if (!userRows.length) {
            throw new Error(
                "Uploading user was not found or is inactive"
            );
        }

        const uploader = userRows[0];

        /*
         * Team Leaders are permanently scoped to their assigned team.
         * The frontend may disable the team selector, but the backend
         * must enforce the restriction as well.
         */
        let resolvedTeamId;

        if (uploader.roleName === "TEAM_LEADER") {

            if (!uploader.userTeamId) {
                throw new Error(
                    "Team Leader is not assigned to a team."
                );
            }

            resolvedTeamId = uploader.userTeamId;

        } else {

            resolvedTeamId =
                teamId ||
                uploader.userTeamId;

            if (!resolvedTeamId) {
                throw new Error(
                    "Team is required for MIS import. Select a team before uploading the MIS."
                );
            }
        }

        const [teamRows] = await connection.query(
            `
                SELECT
                    id,
                    organization_id,
                    department_id,
                    name,
                    status
                FROM teams
                WHERE id = ?
                  AND organization_id = ?
                  AND status = 'ACTIVE'
                LIMIT 1
            `,
            [resolvedTeamId, organizationId]
        );

        if (!teamRows.length) {
            throw new Error(
                "Selected team was not found, is inactive, or does not belong to the organization."
            );
        }

        const team = teamRows[0];

        /*
         * Find or create the business-level MIS period.
         */
        const [periodRows] = await connection.query(
            `
                SELECT
                    id,
                    status
                FROM mis_periods
                WHERE organization_id = ?
                  AND team_id = ?
                  AND reporting_month = ?
                LIMIT 1
            `,
            [organizationId, resolvedTeamId, importMonth]
        );

        let misPeriodId;

        if (periodRows.length) {
            misPeriodId = periodRows[0].id;

            if (
                [
                    "SUBMITTED",
                    "UNDER_REVIEW",
                    "RECONCILED",
                    "APPROVED",
                    "LOCKED"
                ].includes(periodRows[0].status)
            ) {
                throw new Error(
                    `MIS period is already ${periodRows[0].status} and cannot accept another import.`
                );
            }

            const [existingImports] = await connection.query(
                `
                    SELECT id
                    FROM mis_imports
                    WHERE organization_id = ?
                      AND mis_period_id = ?
                      AND status = 'COMPLETED'
                    LIMIT 1
                `,
                [organizationId, misPeriodId]
            );

            if (existingImports.length) {
                throw new Error(
                    `A completed MIS import already exists for ${importMonth} for the selected team.`
                );
            }
        } else {
            const [periodResult] = await connection.query(
                `
                    INSERT INTO mis_periods
                    (
                        organization_id,
                        team_id,
                        reporting_month,
                        status,
                        created_by
                    )
                    VALUES (?, ?, ?, 'DRAFT', ?)
                `,
                [
                    organizationId,
                    resolvedTeamId,
                    importMonth,
                    userId
                ]
            );

            misPeriodId = periodResult.insertId;
        }

        const [importResult] = await connection.query(
            `
                INSERT INTO mis_imports
                (
                    organization_id,
                    mis_period_id,
                    imported_by,
                    file_name,
                    original_file_name,
                    reporting_month,
                    total_rows,
                    status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSING')
            `,
            [
                organizationId,
                misPeriodId,
                userId,
                file.originalname,
                file.originalname,
                importMonth,
                parsedRows.length
            ]
        );

        const importId = importResult.insertId;

        /*
         * Every loan now belongs to:
         * organization -> team -> MIS period -> import
         */
        for (const row of parsedRows) {
            await connection.query(
                `
                    INSERT INTO loan_disbursements
                    (
                        organization_id,
                        department_id,
                        team_id,
                        mis_period_id,
                        import_id,
                        customer_name,
                        contact_number,
                        employer_name,
                        bank_name,
                        city,
                        product,
                        loan_account_no,
                        disbursement_amount,
                        disbursement_month,
                        seller_name,
                        team_name,
                        dsa_code,
                        cashback,
                        subvention
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    organizationId,
                    team.department_id,
                    resolvedTeamId,
                    misPeriodId,
                    importId,
                    row.customerName,
                    row.contactNumber,
                    row.employerName,
                    row.bankName,
                    row.city,
                    row.product,
                    row.loanAccountNo,
                    row.disbursementAmount,
                    row.disbursementMonth,
                    row.sellerName,
                    row.teamName,
                    row.dsaCode,
                    row.cashback,
                    row.subvention
                ]
            );
        }

        await connection.query(
            `
                UPDATE mis_imports
                SET
                    successful_rows = ?,
                    status = 'COMPLETED',
                    completed_at = NOW()
                WHERE id = ?
            `,
            [parsedRows.length, importId]
        );

        await connection.commit();

        return {
            importId,
            misPeriodId,
            teamId: resolvedTeamId,
            fileName: file.originalname,
            reportingMonth: importMonth,
            totalRows: rows.length,
            successfulRows: parsedRows.length,
            failedRows: 0,
            status: "COMPLETED"
        };

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }

        throw error;

    } finally {
        if (connection) {
            connection.release();
        }

        if (file?.path && fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
    }
};


const updateTransactionStatus = async ({
    organizationId,
    userId,
    loanId,
    status,
    remarks
}) => {

    const allowedStatuses = [
        "PENDING",
        "MATCHED",
        "VARIANCE",
        "NOT_FOUND",
        "APPROVED",
        "REJECTED"
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error(`Invalid transaction status: ${status}`);
    }

    const [users] = await db.query(
        `
        SELECT r.name AS roleName
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = ?
          AND u.organization_id = ?
          AND u.status = 'ACTIVE'
        LIMIT 1
        `,
        [userId, organizationId]
    );

    if (!users.length || !['ORG_ADMIN', 'SUPER_ADMIN'].includes(users[0].roleName)) {
        const error = new Error(
            "Only an organization administrator can change transaction status."
        );
        error.code = "MIS_STATUS_FORBIDDEN";
        throw error;
    }

    const [loans] = await db.query(
        `
        SELECT
            ld.id,
            lr.id AS reconciliationId,
            COALESCE(lr.status, 'PENDING') AS currentStatus
        FROM loan_disbursements ld
        LEFT JOIN loan_reconciliations lr
            ON lr.loan_id = ld.id
        WHERE ld.id = ?
          AND ld.organization_id = ?
        LIMIT 1
        `,
        [loanId, organizationId]
    );

    if (!loans.length) {
        const error = new Error("MIS transaction was not found.");
        error.code = "MIS_TRANSACTION_NOT_FOUND";
        throw error;
    }

    const currentStatus = loans[0].currentStatus;

    if (currentStatus === "APPROVED" && status !== "APPROVED") {
        throw new Error(
            "An approved transaction cannot be moved back to another status."
        );
    }

    if (loans[0].reconciliationId) {
        await db.query(
            `
            UPDATE loan_reconciliations
            SET
                status = ?,
                remarks = ?,
                approved_by = CASE
                    WHEN ? = 'APPROVED' THEN ?
                    ELSE approved_by
                END,
                approved_at = CASE
                    WHEN ? = 'APPROVED' THEN NOW()
                    ELSE approved_at
                END,
                bank_approval_date = CASE
                    WHEN ? = 'APPROVED' THEN NOW()
                    ELSE bank_approval_date
                END,
                updated_at = NOW()
            WHERE id = ?
              AND loan_id = ?
            `,
            [
                status,
                remarks || null,
                status,
                userId,
                status,
                status,
                loans[0].reconciliationId,
                loanId
            ]
        );
    } else {
        await db.query(
            `
            INSERT INTO loan_reconciliations
            (
                organization_id,
                loan_id,
                status,
                remarks,
                approved_by,
                approved_at,
                bank_approval_date
            )
            VALUES (?, ?, ?, ?, ?, CASE WHEN ? = 'APPROVED' THEN NOW() ELSE NULL END, CASE WHEN ? = 'APPROVED' THEN NOW() ELSE NULL END)
            `,
            [
                organizationId,
                loanId,
                status,
                remarks || null,
                status === "APPROVED" ? userId : null,
                status,
                status
            ]
        );
    }

    return {
        loanId,
        previousStatus: currentStatus,
        status,
        updatedBy: userId
    };
};

const getMISScope = async ({
    organizationId,
    userId
}) => {

    const [rows] = await db.query(
        `
        SELECT
            u.department_id AS departmentId,
            u.team_id AS teamId,
            r.name AS roleName
        FROM users u
        INNER JOIN roles r
            ON r.id = u.role_id
        WHERE
            u.id = ?
            AND (u.organization_id = ? OR r.name = 'SUPER_ADMIN')
            AND u.status = 'ACTIVE'
        LIMIT 1
        `,
        [userId, organizationId]
    );

    if (!rows.length) {
        const error = new Error(
            "User is not active or does not belong to this organization."
        );

        error.code = "MIS_SCOPE_FORBIDDEN";

        throw error;
    }

    const user = rows[0];

    if (user.roleName === "TEAM_LEADER") {

        if (!user.teamId) {
            const error = new Error(
                "Team Leader is not assigned to a team."
            );

            error.code = "MIS_SCOPE_FORBIDDEN";

            throw error;
        }

        return {
            type: "TEAM",
            teamId: user.teamId
        };
    }

    if (user.roleName === "DEPARTMENT_HEAD") {

        if (!user.departmentId) {
            const error = new Error(
                "Department Head is not assigned to a department."
            );

            error.code = "MIS_SCOPE_FORBIDDEN";

            throw error;
        }

        return {
            type: "DEPARTMENT",
            departmentId: user.departmentId
        };
    }

    if (user.roleName === "SUPER_ADMIN") {
        return { type: "ORGANIZATION" };
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

    const error = new Error(
        "This role does not have MIS data access."
    );

    error.code = "MIS_SCOPE_FORBIDDEN";

    throw error;
};

const getMISData = async ({
    organizationId,
    userId,
    month,
    bank,
    product,
    team,
    seller,
    city
}) => {

    const scope = await getMISScope({
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
     * Role scope is applied to database columns, not team_name
     * supplied by the client. This prevents a Team Leader from
     * changing a query parameter to see another team's data.
     */
    if (scope.type === "TEAM") {

        conditions.push(
            "ld.team_id = ?"
        );

        params.push(
            scope.teamId
        );
    }

    if (scope.type === "DEPARTMENT") {

        conditions.push(
            "ld.department_id = ?"
        );

        params.push(
            scope.departmentId
        );
    }

    if (month) {

        conditions.push(
            "ld.disbursement_month = ?"
        );

        params.push(month);
    }

    if (bank) {

        conditions.push(
            "ld.bank_name = ?"
        );

        params.push(bank);
    }

    if (product) {

        conditions.push(
            "ld.product = ?"
        );

        params.push(product);
    }

    /*
     * team is retained as a filter for organization-wide users.
     * For TEAM_LEADER, the database scope above takes precedence,
     * so a client cannot use team=OtherTeam to escape their scope.
     */
    if (team && scope.type !== "TEAM") {

        conditions.push(
            "ld.team_name = ?"
        );

        params.push(team);
    }

    if (seller) {

        conditions.push(
            "ld.seller_name = ?"
        );

        params.push(seller);
    }

    if (city) {

        conditions.push(
            "ld.city = ?"
        );

        params.push(city);
    }

    const query = `
        SELECT
            ld.id,
            ld.customer_name AS customerName,
            ld.contact_number AS contactNumber,
            ld.employer_name AS employerName,
            ld.bank_name AS bankName,
            ld.city,
            ld.product,
            ld.loan_account_no AS loanAccountNo,
            ld.disbursement_amount AS disbursementAmount,
            ld.disbursement_month AS disbursementMonth,
            ld.seller_name AS sellerName,
            ld.team_name AS teamName,
            ld.dsa_code AS dsaCode,
            ld.cashback,
            ld.subvention,
            ld.import_id AS importId,

            COALESCE(
                lr.status,
                'PENDING'
            ) AS reconciliationStatus,

            lr.bank_amount AS bankAmount,
            lr.approved_amount AS approvedAmount,
            lr.bank_approval_date AS bankApprovalDate,
            lr.remarks AS reconciliationRemarks,

            ld.created_at AS createdAt
        FROM loan_disbursements ld

        LEFT JOIN loan_reconciliations lr
            ON lr.loan_id = ld.id

        WHERE ${conditions.join(" AND ")}

        ORDER BY ld.disbursement_month DESC, ld.id DESC
    `;

    const [rows] = await db.query(
        query,
        params
    );

    return {
        scope: scope.type,
        rows
    };
};

const getAvailableMonths = async ({
    organizationId,
    userId
}) => {

    const scope = await getMISScope({
        organizationId,
        userId
    });

    const conditions = [
        "ld.organization_id = ?"
    ];

    const params = [
        organizationId
    ];

    if (scope.type === "TEAM") {

        conditions.push(
            "ld.team_id = ?"
        );

        params.push(
            scope.teamId
        );
    }

    if (scope.type === "DEPARTMENT") {

        conditions.push(
            "ld.department_id = ?"
        );

        params.push(
            scope.departmentId
        );
    }

    const [rows] = await db.query(
        `
        SELECT DISTINCT
            DATE_FORMAT(
                ld.disbursement_month,
                '%Y-%m-01'
            ) AS month
        FROM loan_disbursements ld
        WHERE ${conditions.join(" AND ")}
        ORDER BY month DESC
        `,
        params
    );

    return rows.map(
        row => row.month
    );
};

module.exports = {
    importExcel,
    getMISData,
    getAvailableMonths,
    getMISScope,
    updateTransactionStatus
};