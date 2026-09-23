const XLSX = require("xlsx");
const db = require("../config/database");

const getReportFilters = (filters = {}) => {
    const { month, teamId, bank, product, status } = filters;
    const conditions = ["ld.organization_id = ?"];
    const params = [];

    if (month) {
        conditions.push("DATE_FORMAT(ld.disbursement_month, '%Y-%m') = ?");
        params.push(month);
    }

    if (teamId) {
        conditions.push("ld.team_id = ?");
        params.push(Number(teamId));
    }

    if (bank) {
        conditions.push("ld.bank_name = ?");
        params.push(bank);
    }

    if (product) {
        conditions.push("ld.product = ?");
        params.push(product);
    }

    if (status) {
        conditions.push("COALESCE(lr.status, 'PENDING') = ?");
        params.push(status);
    }

    return { conditions, params };
};

const getReportData = async ({ organizationId, filters = {} }) => {
    if (!organizationId || Number(organizationId) <= 0) {
        throw new Error("A valid organization is required for reports.");
    }

    const { conditions, params } = getReportFilters(filters);
    const whereClause = conditions.join(" AND ");
    const queryParams = [Number(organizationId), ...params];

    const [organizationRows] = await db.query(`
        SELECT id, name, code
        FROM organizations
        WHERE id = ?
        LIMIT 1
    `, [Number(organizationId)]);

    if (!organizationRows.length) {
        throw new Error("Organization not found.");
    }

    const [summaryRows] = await db.query(`
        SELECT
            COUNT(*) AS totalLoans,
            COALESCE(SUM(ld.disbursement_amount), 0) AS totalDisbursement,
            COALESCE(SUM(CASE WHEN COALESCE(lr.status, 'PENDING') = 'APPROVED' THEN COALESCE(lr.approved_amount, ld.disbursement_amount) ELSE 0 END), 0) AS approvedAmount,
            COALESCE(SUM(CASE WHEN COALESCE(lr.status, 'PENDING') IN ('PENDING','MATCHED','VARIANCE','NOT_FOUND') THEN ld.disbursement_amount ELSE 0 END), 0) AS pendingAmount,
            COALESCE(SUM(CASE WHEN COALESCE(lr.status, 'PENDING') = 'REJECTED' THEN ld.disbursement_amount ELSE 0 END), 0) AS rejectedAmount,
            COALESCE(SUM(ld.cashback), 0) AS totalCashback,
            COALESCE(SUM(ld.subvention), 0) AS totalSubvention
        FROM loan_disbursements ld
        LEFT JOIN loan_reconciliations lr ON lr.loan_id = ld.id
        WHERE ${whereClause}
    `, queryParams);

    const [teamRows] = await db.query(`
        SELECT
            ld.team_id AS teamId,
            COALESCE(ld.team_name, t.name, 'Unassigned') AS teamName,
            COUNT(*) AS loans,
            COALESCE(SUM(ld.disbursement_amount), 0) AS disbursementAmount,
            COALESCE(SUM(CASE WHEN COALESCE(lr.status, 'PENDING') = 'APPROVED' THEN COALESCE(lr.approved_amount, ld.disbursement_amount) ELSE 0 END), 0) AS approvedAmount,
            COALESCE(SUM(CASE WHEN COALESCE(lr.status, 'PENDING') = 'APPROVED' THEN 1 ELSE 0 END), 0) AS approvedLoans
        FROM loan_disbursements ld
        LEFT JOIN loan_reconciliations lr ON lr.loan_id = ld.id
        LEFT JOIN teams t ON t.id = ld.team_id
        WHERE ${whereClause}
        GROUP BY ld.team_id, COALESCE(ld.team_name, t.name, 'Unassigned')
        ORDER BY disbursementAmount DESC
    `, queryParams);

    const [detailRows] = await db.query(`
        SELECT
            ld.id,
            ld.customer_name AS customerName,
            ld.loan_account_no AS loanAccountNo,
            ld.bank_name AS bankName,
            ld.product,
            ld.city,
            COALESCE(ld.team_name, t.name, 'Unassigned') AS teamName,
            ld.seller_name AS sellerName,
            ld.disbursement_amount AS disbursementAmount,
            ld.disbursement_month AS disbursementMonth,
            ld.cashback,
            ld.subvention,
            COALESCE(lr.status, 'PENDING') AS status,
            COALESCE(lr.approved_amount, 0) AS approvedAmount,
            lr.bank_approval_date AS bankApprovalDate,
            lr.remarks AS remarks
        FROM loan_disbursements ld
        LEFT JOIN loan_reconciliations lr ON lr.loan_id = ld.id
        LEFT JOIN teams t ON t.id = ld.team_id
        WHERE ${whereClause}
        ORDER BY ld.disbursement_month DESC, ld.id DESC
        LIMIT 5000
    `, queryParams);

    return {
        organization: organizationRows[0],
        summary: summaryRows[0] || {},
        teamPerformance: teamRows,
        rows: detailRows
    };
};

const exportReport = async ({ organizationId, filters = {} }) => {
    const report = await getReportData({ organizationId, filters });

    const summarySheet = [
        { Metric: "Total Loans", Value: Number(report.summary.totalLoans || 0) },
        { Metric: "Total Disbursement", Value: Number(report.summary.totalDisbursement || 0) },
        { Metric: "Approved Amount", Value: Number(report.summary.approvedAmount || 0) },
        { Metric: "Pending Amount", Value: Number(report.summary.pendingAmount || 0) },
        { Metric: "Rejected Amount", Value: Number(report.summary.rejectedAmount || 0) },
        { Metric: "Cashback", Value: Number(report.summary.totalCashback || 0) },
        { Metric: "Subvention", Value: Number(report.summary.totalSubvention || 0) }
    ];

    const teamSheet = report.teamPerformance.map((row) => ({
        Team: row.teamName,
        Loans: Number(row.loans),
        "Disbursement Amount": Number(row.disbursementAmount),
        "Approved Amount": Number(row.approvedAmount),
        "Approved Loans": Number(row.approvedLoans)
    }));

    const detailSheet = report.rows.map((row) => ({
        ID: row.id,
        Customer: row.customerName,
        "Loan Account": row.loanAccountNo,
        Bank: row.bankName,
        Product: row.product,
        City: row.city,
        Team: row.teamName,
        Seller: row.sellerName,
        "Disbursement Amount": Number(row.disbursementAmount),
        "Disbursement Month": row.disbursementMonth,
        Cashback: Number(row.cashback),
        Subvention: Number(row.subvention),
        Status: row.status,
        "Approved Amount": Number(row.approvedAmount),
        "Bank Approval Date": row.bankApprovalDate,
        Remarks: row.remarks
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summarySheet), "Summary");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(teamSheet), "Team Performance");
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(detailSheet), "MIS Details");

    return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
};

module.exports = {
    getReportData,
    exportReport
};
