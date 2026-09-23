const dashboardService = require("../services/dashboard.service");

const getDashboard = async (req, res) => {
    try {
        const { month, organizationId: requestedOrganizationId } = req.query;

        let organizationId = req.user.organizationId;

        if (req.user.role === "SUPER_ADMIN") {
            organizationId = Number(requestedOrganizationId);

            if (!organizationId || organizationId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Organization selection is required"
                });
            }
        }

        const dashboard = await dashboardService.getDashboard({
            organizationId,
            userId: req.user.userId,
            month
        });

        return res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {
        console.error("Dashboard error:", error);

        if (error.code === "DASHBOARD_SCOPE_FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to load dashboard"
        });
    }
};

module.exports = {
    getDashboard
};
