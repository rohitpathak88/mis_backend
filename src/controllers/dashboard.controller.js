const dashboardService = require("../services/dashboard.service");

const getDashboard = async (req, res) => {

    try {

        const {
            month
        } = req.query;

        const dashboard =
            await dashboardService.getDashboard({
                organizationId: req.user.organizationId,
                userId: req.user.userId,
                month
            });

        return res.json({
            success: true,
            data: dashboard
        });

    } catch (error) {

        console.error(
            "Dashboard error:",
            error
        );

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
