const teamService = require("../services/team.service");

const getTeams = async (req, res) => {
    try {
        const { departmentId } = req.query;

        const data = await teamService.getTeams(
            req.user.organizationId,
            {
                departmentId: departmentId || null
            }
        );

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Get teams error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch teams"
        });
    }
};

const getTeamById = async (req, res) => {
    try {
        const data = await teamService.getTeamById(
            req.user.organizationId,
            req.params.id
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Team not found"
            });
        }

        return res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Get team error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch team"
        });
    }
};

const createTeam = async (req, res) => {
    try {
        const name = req.body.name?.trim();
        const code = req.body.code?.trim() || null;
        const departmentId = Number(req.body.departmentId);

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Team name is required"
            });
        }

        if (!departmentId || Number.isNaN(departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Valid departmentId is required"
            });
        }

        const data = await teamService.createTeam(
            req.user.organizationId,
            {
                name,
                code,
                departmentId
            }
        );

        return res.status(201).json({
            success: true,
            message: "Team created successfully",
            data
        });

    } catch (error) {
        console.error("Create team error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create team"
        });
    }
};

const updateTeam = async (req, res) => {
    try {
        const name = req.body.name?.trim();
        const code = req.body.code?.trim() || null;
        const departmentId = Number(req.body.departmentId);

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Team name is required"
            });
        }

        if (!departmentId || Number.isNaN(departmentId)) {
            return res.status(400).json({
                success: false,
                message: "Valid departmentId is required"
            });
        }

        const data = await teamService.updateTeam(
            req.user.organizationId,
            req.params.id,
            {
                name,
                code,
                departmentId
            }
        );

        return res.json({
            success: true,
            message: "Team updated successfully",
            data
        });

    } catch (error) {
        console.error("Update team error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update team"
        });
    }
};

const updateTeamStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ACTIVE or INACTIVE"
            });
        }

        const data = await teamService.updateTeamStatus(
            req.user.organizationId,
            req.params.id,
            status
        );

        return res.json({
            success: true,
            message: "Team status updated successfully",
            data
        });

    } catch (error) {
        console.error("Update team status error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update team status"
        });
    }
};

const deleteTeam = async (req, res) => {
    try {
        await teamService.deleteTeam(
            req.user.organizationId,
            req.params.id
        );

        return res.json({
            success: true,
            message: "Team deleted successfully"
        });

    } catch (error) {
        console.error("Delete team error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to delete team"
        });
    }
};

module.exports = {
    getTeams,
    getTeamById,
    createTeam,
    updateTeam,
    updateTeamStatus,
    deleteTeam
};