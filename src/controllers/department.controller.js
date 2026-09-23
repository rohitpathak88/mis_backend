const departmentService = require("../services/department.service");

const getDepartments = async (req, res) => {
    try {
        const data = await departmentService.getDepartments(
            req.user.organizationId
        );

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Get departments error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch departments"
        });
    }
};

const getDepartmentById = async (req, res) => {
    try {
        const data = await departmentService.getDepartmentById(
            req.user.organizationId,
            req.params.id
        );

        if (!data) {
            return res.status(404).json({
                success: false,
                message: "Department not found"
            });
        }

        res.json({
            success: true,
            data
        });

    } catch (error) {
        console.error("Get department error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch department"
        });
    }
};

const createDepartment = async (req, res) => {
    try {
        const name = req.body.name?.trim();
        const code = req.body.code?.trim() || null;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Department name is required"
            });
        }

        const data = await departmentService.createDepartment(
            req.user.organizationId,
            {
                name,
                code
            }
        );

        res.status(201).json({
            success: true,
            message: "Department created successfully",
            data
        });

    } catch (error) {
        console.error("Create department error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create department"
        });
    }
};

const updateDepartment = async (req, res) => {
    try {
        const name = req.body.name?.trim();
        const code = req.body.code?.trim() || null;

        if (!name) {
            return res.status(400).json({
                success: false,
                message: "Department name is required"
            });
        }

        const data = await departmentService.updateDepartment(
            req.user.organizationId,
            req.params.id,
            {
                name,
                code
            }
        );

        res.json({
            success: true,
            message: "Department updated successfully",
            data
        });

    } catch (error) {
        console.error("Update department error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update department"
        });
    }
};

const updateDepartmentStatus = async (req, res) => {
    try {
        const { status } = req.body;

        if (!["ACTIVE", "INACTIVE"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Status must be ACTIVE or INACTIVE"
            });
        }

        const data = await departmentService.updateDepartmentStatus(
            req.user.organizationId,
            req.params.id,
            status
        );

        res.json({
            success: true,
            message: "Department status updated successfully",
            data
        });

    } catch (error) {
        console.error("Update department status error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update department status"
        });
    }
};

const deleteDepartment = async (req, res) => {
    try {
        await departmentService.deleteDepartment(
            req.user.organizationId,
            req.params.id
        );

        res.json({
            success: true,
            message: "Department deleted successfully"
        });

    } catch (error) {
        console.error("Delete department error:", error);

        res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to delete department"
        });
    }
};

module.exports = {
    getDepartments,
    getDepartmentById,
    createDepartment,
    updateDepartment,
    updateDepartmentStatus,
    deleteDepartment
};