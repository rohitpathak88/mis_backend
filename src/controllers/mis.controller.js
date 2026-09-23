const misService = require("../services/mis.service");

const importExcel = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Excel file is required"
            });
        }

        const result = await misService.importExcel({
            file: req.file,
            organizationId: req.user.organizationId,
            userId: req.user.userId,
            reportingMonth: req.body.reportingMonth,
            teamId: req.body.teamId || null
        });

        return res.status(200).json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "MIS import error:",
            error.message
        );

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const updateTransactionStatus = async (req, res) => {

    try {

        const result =
            await misService.updateTransactionStatus({
                organizationId: req.user.organizationId,
                userId: req.user.userId,
                loanId: Number(req.params.id),
                status: String(req.body.status || "").toUpperCase(),
                remarks: req.body.remarks || null
            });

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {

        console.error(
            "MIS transaction status error:",
            error
        );

        if (error.code === "MIS_STATUS_FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        if (error.code === "MIS_TRANSACTION_NOT_FOUND") {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }

        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

const getMISData = async (req, res) => {

    try {

        const {
            month,
            bank,
            product,
            team,
            seller,
            city
        } = req.query;

        const data = await misService.getMISData({
            organizationId: req.user.organizationId,
            userId: req.user.userId,
            month,
            bank,
            product,
            team,
            seller,
            city
        });

        return res.json({
            success: true,
            data
        });

    } catch (error) {

        console.error(
            "Get MIS data error:",
            error
        );

        if (error.code === "MIS_SCOPE_FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve MIS data"
        });
    }
};

const getAvailableMonths = async (req, res) => {

    try {

        const months =
            await misService.getAvailableMonths({
                organizationId: req.user.organizationId,
                userId: req.user.userId
            });

        return res.json({
            success: true,
            data: months
        });

    } catch (error) {

        console.error(
            "Available months error:",
            error
        );

        if (error.code === "MIS_SCOPE_FORBIDDEN") {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: "Unable to load available months"
        });
    }
};

module.exports = {
    importExcel,
    getMISData,
    getAvailableMonths,
    updateTransactionStatus
};