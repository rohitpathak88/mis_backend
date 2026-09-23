const reportService = require("../services/report.service");

const resolveOrganizationId = (req) => {
    if (req.user.role === "SUPER_ADMIN") {
        const selected = Number(req.query.organizationId);
        if (!selected || selected <= 0) {
            const error = new Error("Organization selection is required.");
            error.code = "REPORT_ORGANIZATION_REQUIRED";
            throw error;
        }
        return selected;
    }

    return Number(req.user.organizationId);
};

const getFilters = (req) => ({
    month: req.query.month || undefined,
    teamId: req.query.teamId || undefined,
    bank: req.query.bank || undefined,
    product: req.query.product || undefined,
    status: req.query.status || undefined
});

const getReport = async (req, res) => {
    try {
        const organizationId = resolveOrganizationId(req);
        const data = await reportService.getReportData({
            organizationId,
            filters: getFilters(req)
        });

        return res.json({ success: true, data });
    } catch (error) {
        console.error("Reports error:", error);
        const status = error.code === "REPORT_ORGANIZATION_REQUIRED" ? 400 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Unable to load report"
        });
    }
};

const exportReport = async (req, res) => {
    try {
        const organizationId = resolveOrganizationId(req);
        const buffer = await reportService.exportReport({
            organizationId,
            filters: getFilters(req)
        });

        const month = req.query.month || "all";
        const fileName = `MIS-Report-${month}.xlsx`;

        res.setHeader(
            "Content-Type",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        );
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="${fileName}"`
        );
        return res.send(buffer);
    } catch (error) {
        console.error("Reports export error:", error);
        const status = error.code === "REPORT_ORGANIZATION_REQUIRED" ? 400 : 500;
        return res.status(status).json({
            success: false,
            message: error.message || "Unable to export report"
        });
    }
};

module.exports = { getReport, exportReport };
