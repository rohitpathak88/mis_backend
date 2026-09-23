const db = require("../config/database");

const DEFAULT_RULES = [
    { minAmount: 0, maxAmount: 1000000, rate: 0.5 },
    { minAmount: 1000000.01, maxAmount: 2000000, rate: 0.75 },
    { minAmount: 2000000.01, maxAmount: null, rate: 1.0 }
];

const getRoleScope = async (organizationId, userId) => {
    const [rows] = await db.query(`
        SELECT r.name AS role_name, u.department_id, u.team_id
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = ? AND u.organization_id = ? AND u.status = 'ACTIVE'
        LIMIT 1
    `, [userId, organizationId]);

    if (!rows.length) {
        const error = new Error("Active user was not found.");
        error.code = "PAYOUT_SCOPE_FORBIDDEN";
        throw error;
    }

    return rows[0];
};

const ensureDefaultRules = async (organizationId, userId) => {
    const [rows] = await db.query(`
        SELECT id FROM payout_rules
        WHERE organization_id = ? AND status = 'ACTIVE'
        LIMIT 1
    `, [organizationId]);

    if (rows.length) return;

    for (const rule of DEFAULT_RULES) {
        await db.query(`
            INSERT INTO payout_rules
                (organization_id, min_amount, max_amount, payout_rate, effective_from, created_by)
            VALUES (?, ?, ?, ?, DATE_FORMAT(CURRENT_DATE, '%Y-%m-01'), ?)
        `, [organizationId, rule.minAmount, rule.maxAmount, rule.rate, userId]);
    }
};

const getRules = async ({ organizationId, userId }) => {
    await ensureDefaultRules(organizationId, userId);

    const [rows] = await db.query(`
        SELECT id, min_amount AS minAmount, max_amount AS maxAmount,
               payout_rate AS payoutRate, effective_from AS effectiveFrom,
               effective_to AS effectiveTo, status, created_at AS createdAt
        FROM payout_rules
        WHERE organization_id = ?
        ORDER BY min_amount ASC
    `, [organizationId]);

    return rows;
};

const createRule = async ({ organizationId, userId, data }) => {
    const minAmount = Number(data.minAmount);
    const maxAmount = data.maxAmount === null || data.maxAmount === "" || data.maxAmount === undefined
        ? null : Number(data.maxAmount);
    const rate = Number(data.payoutRate);

    if (!Number.isFinite(minAmount) || minAmount < 0) throw new Error("Invalid minimum amount.");
    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount <= minAmount)) throw new Error("Maximum amount must be greater than minimum amount.");
    if (!Number.isFinite(rate) || rate < 0) throw new Error("Invalid payout rate.");

    const [result] = await db.query(`
        INSERT INTO payout_rules
            (organization_id, min_amount, max_amount, payout_rate, effective_from, effective_to, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
        organizationId,
        minAmount,
        maxAmount,
        rate,
        data.effectiveFrom || new Date().toISOString().slice(0, 10),
        data.effectiveTo || null,
        userId
    ]);

    return { id: result.insertId };
};

const createPeriod = async ({ organizationId, userId, periodMonth }) => {
    if (!/^\d{4}-\d{2}-01$/.test(periodMonth)) {
        throw new Error("Period month must be in YYYY-MM-01 format.");
    }

    const [existing] = await db.query(`
        SELECT id, status FROM payout_periods
        WHERE organization_id = ? AND period_month = ?
        LIMIT 1
    `, [organizationId, periodMonth]);

    if (existing.length) return existing[0];

    const [result] = await db.query(`
        INSERT INTO payout_periods (organization_id, period_month, created_by)
        VALUES (?, ?, ?)
    `, [organizationId, periodMonth, userId]);

    return { id: result.insertId, status: "DRAFT" };
};

const getPeriods = async ({ organizationId, userId }) => {
    const scope = await getRoleScope(organizationId, userId);
    const params = [organizationId];
    let teamJoin = "";
    let teamCondition = "";

    if (scope.role_name === "TEAM_LEADER") {
        teamJoin = "INNER JOIN payouts p_scope ON p_scope.payout_period_id = pp.id";
        teamCondition = "AND p_scope.team_id = ?";
        params.push(scope.team_id);
    }

    const [rows] = await db.query(`
        SELECT DISTINCT pp.id, pp.period_month AS periodMonth, pp.status,
               pp.created_at AS createdAt, pp.approved_at AS approvedAt
        FROM payout_periods pp
        ${teamJoin}
        WHERE pp.organization_id = ? ${teamCondition}
        ORDER BY pp.period_month DESC
    `, params);

    return rows;
};

const getRuleForAmount = (rules, amount) => {
    return rules.find((r) => {
        const min = Number(r.minAmount);
        const max = r.maxAmount === null ? null : Number(r.maxAmount);
        return amount >= min && (max === null || amount <= max);
    });
};

const calculatePeriod = async ({ organizationId, userId, periodId }) => {
    const scope = await getRoleScope(organizationId, userId);
    if (scope.role_name !== "ORG_ADMIN") {
        const error = new Error("Only an organization administrator can calculate payouts.");
        error.code = "PAYOUT_FORBIDDEN";
        throw error;
    }

    await ensureDefaultRules(organizationId, userId);

    const [periods] = await db.query(`
        SELECT id, period_month AS periodMonth, status
        FROM payout_periods
        WHERE id = ? AND organization_id = ?
        LIMIT 1
    `, [periodId, organizationId]);

    if (!periods.length) throw new Error("Payout period not found.");
    if (["APPROVED", "PAID", "LOCKED"].includes(periods[0].status)) {
        throw new Error("This payout period cannot be recalculated.");
    }

    const [rules] = await db.query(`
        SELECT id, min_amount AS minAmount, max_amount AS maxAmount, payout_rate AS payoutRate
        FROM payout_rules
        WHERE organization_id = ? AND status = 'ACTIVE'
          AND effective_from <= ?
          AND (effective_to IS NULL OR effective_to >= ?)
        ORDER BY min_amount ASC
    `, [organizationId, periods[0].periodMonth, periods[0].periodMonth]);

    if (!rules.length) throw new Error("No active payout rules exist for this period.");

    const [leaders] = await db.query(`
        SELECT u.id AS teamLeaderId, u.team_id AS teamId, u.name AS teamLeaderName,
               t.name AS teamName
        FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        INNER JOIN teams t ON t.id = u.team_id
        WHERE u.organization_id = ?
          AND u.status = 'ACTIVE'
          AND r.name = 'TEAM_LEADER'
          AND u.team_id IS NOT NULL
          AND t.status = 'ACTIVE'
    `, [organizationId]);

    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(`DELETE FROM payout_items WHERE payout_id IN (SELECT id FROM payouts WHERE payout_period_id = ? AND organization_id = ?)`, [periodId, organizationId]);
        await connection.query(`DELETE FROM payouts WHERE payout_period_id = ? AND organization_id = ?`, [periodId, organizationId]);

        for (const leader of leaders) {
            const [approved] = await connection.query(`
                SELECT ld.id AS loanId,
                       COALESCE(NULLIF(lr.approved_amount, 0), ld.disbursement_amount) AS approvedAmount,
                       lr.bank_approval_date AS bankApprovalDate
                FROM loan_disbursements ld
                INNER JOIN loan_reconciliations lr ON lr.loan_id = ld.id
                WHERE ld.organization_id = ?
                  AND ld.team_id = ?
                  AND lr.status = 'APPROVED'
                  AND lr.bank_approval_date >= ?
                  AND lr.bank_approval_date < DATE_ADD(?, INTERVAL 1 MONTH)
                ORDER BY lr.bank_approval_date ASC, ld.id ASC
            `, [organizationId, leader.teamId, periods[0].periodMonth, periods[0].periodMonth]);

            const total = approved.reduce((sum, row) => sum + Number(row.approvedAmount || 0), 0);
            const rule = getRuleForAmount(rules, total);
            const rate = rule ? Number(rule.payoutRate) : 0;
            const payoutAmount = Math.round((total * rate / 100) * 100) / 100;

            const [payoutResult] = await connection.query(`
                INSERT INTO payouts
                    (organization_id, payout_period_id, team_id, team_leader_id,
                     total_approved_amount, payout_rate, payout_amount, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'CALCULATED')
            `, [organizationId, periodId, leader.teamId, leader.teamLeaderId, total, rate, payoutAmount]);

            if (approved.length) {
                const values = approved.map((row) => [
                    organizationId,
                    payoutResult.insertId,
                    row.loanId,
                    Number(row.approvedAmount || 0),
                    row.bankApprovalDate
                ]);

                await connection.query(`
                    INSERT INTO payout_items
                        (organization_id, payout_id, loan_id, approved_amount, bank_approval_date)
                    VALUES ?
                `, [values]);
            }
        }

        await connection.query(`
            UPDATE payout_periods
            SET status = 'CALCULATED'
            WHERE id = ? AND organization_id = ?
        `, [periodId, organizationId]);

        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }

    return getPayoutPeriod({ organizationId, userId, periodId });
};

const getPayoutPeriod = async ({ organizationId, userId, periodId }) => {
    const scope = await getRoleScope(organizationId, userId);
    const params = [organizationId, periodId];
    let condition = "";
    if (scope.role_name === "TEAM_LEADER") {
        condition = "AND p.team_id = ?";
        params.push(scope.team_id);
    }

    const [rows] = await db.query(`
        SELECT p.id, p.team_id AS teamId, t.name AS teamName,
               p.team_leader_id AS teamLeaderId, u.name AS teamLeaderName,
               p.total_approved_amount AS totalApprovedAmount,
               p.payout_rate AS payoutRate, p.payout_amount AS payoutAmount,
               p.status, p.calculated_at AS calculatedAt,
               pp.period_month AS periodMonth, pp.status AS periodStatus
        FROM payouts p
        INNER JOIN payout_periods pp ON pp.id = p.payout_period_id
        INNER JOIN teams t ON t.id = p.team_id
        INNER JOIN users u ON u.id = p.team_leader_id
        WHERE p.organization_id = ? AND p.payout_period_id = ? ${condition}
        ORDER BY t.name ASC
    `, params);

    return rows;
};

const updatePayoutStatus = async ({ organizationId, userId, payoutId, status }) => {
    const scope = await getRoleScope(organizationId, userId);
    if (scope.role_name !== "ORG_ADMIN") throw new Error("Only an organization administrator can change payout status.");

    const allowed = ["REVIEWED", "APPROVED", "PAID", "LOCKED"];
    if (!allowed.includes(status)) throw new Error("Invalid payout status.");

    const [rows] = await db.query(`
        SELECT p.id, p.status, p.payout_period_id AS periodId
        FROM payouts p
        WHERE p.id = ? AND p.organization_id = ?
        LIMIT 1
    `, [payoutId, organizationId]);
    if (!rows.length) throw new Error("Payout not found.");

    const current = rows[0].status;
    const order = { CALCULATED: 1, REVIEWED: 2, APPROVED: 3, PAID: 4, LOCKED: 5 };
    if (order[status] < order[current]) throw new Error("Payout status cannot move backwards.");

    const approvedBy = status === "APPROVED" || status === "PAID" || status === "LOCKED" ? userId : null;
    const paidAt = status === "PAID" || status === "LOCKED" ? "NOW()" : "NULL";

    await db.query(`
        UPDATE payouts
        SET status = ?,
            approved_by = COALESCE(?, approved_by),
            approved_at = CASE WHEN ? IN ('APPROVED','PAID','LOCKED') THEN NOW() ELSE approved_at END,
            paid_at = CASE WHEN ? IN ('PAID','LOCKED') THEN NOW() ELSE paid_at END
        WHERE id = ? AND organization_id = ?
    `, [status, approvedBy, status, status, payoutId, organizationId]);

    if (status === "APPROVED" || status === "PAID" || status === "LOCKED") {
        await db.query(`UPDATE payout_periods SET status = ? WHERE id = ? AND organization_id = ?`, [status, rows[0].periodId, organizationId]);
    }

    return { id: payoutId, status };
};

module.exports = {
    getRules,
    createRule,
    createPeriod,
    getPeriods,
    calculatePeriod,
    getPayoutPeriod,
    updatePayoutStatus
};
