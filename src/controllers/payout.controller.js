const payoutService = require("../services/payout.service");

const handle = (fn) => async (req, res) => {
    try {
        const data = await fn(req);
        return res.json({ success: true, data });
    } catch (error) {
        console.error("Payout error:", error);
        const status = error.code === "PAYOUT_FORBIDDEN" || error.code === "PAYOUT_SCOPE_FORBIDDEN" ? 403 : 400;
        return res.status(status).json({ success: false, message: error.message });
    }
};

const getRules = handle((req) => payoutService.getRules({
    organizationId: req.user.organizationId,
    userId: req.user.userId
}));

const createRule = handle((req) => payoutService.createRule({
    organizationId: req.user.organizationId,
    userId: req.user.userId,
    data: req.body
}));

const createPeriod = handle((req) => payoutService.createPeriod({
    organizationId: req.user.organizationId,
    userId: req.user.userId,
    periodMonth: req.body.periodMonth
}));

const getPeriods = handle((req) => payoutService.getPeriods({
    organizationId: req.user.organizationId,
    userId: req.user.userId
}));

const calculatePeriod = handle((req) => payoutService.calculatePeriod({
    organizationId: req.user.organizationId,
    userId: req.user.userId,
    periodId: Number(req.params.periodId)
}));

const getPayoutPeriod = handle((req) => payoutService.getPayoutPeriod({
    organizationId: req.user.organizationId,
    userId: req.user.userId,
    periodId: Number(req.params.periodId)
}));

const updatePayoutStatus = handle((req) => payoutService.updatePayoutStatus({
    organizationId: req.user.organizationId,
    userId: req.user.userId,
    payoutId: Number(req.params.id),
    status: String(req.body.status || "").toUpperCase()
}));

module.exports = {
    getRules,
    createRule,
    createPeriod,
    getPeriods,
    calculatePeriod,
    getPayoutPeriod,
    updatePayoutStatus
};
