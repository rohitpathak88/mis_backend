const userService = require("../services/user.service");


const getUsers = async (req, res) => {

    try {

        const users = await userService.getUsers(
            req.user.organizationId
        );

        res.json({
            success: true,
            data: users
        });

    } catch (error) {

        console.error("Get users error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch users"
        });
    }
};


const getUserById = async (req, res) => {

    try {

        const user = await userService.getUserById({
            organizationId: req.user.organizationId,
            userId: req.params.id
        });

        res.json({
            success: true,
            data: user
        });

    } catch (error) {

        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};


const getRoles = async (req, res) => {

    try {

        const roles = await userService.getRoles();

        res.json({
            success: true,
            data: roles
        });

    } catch (error) {

        console.error("Get roles error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch roles"
        });
    }
};

const createUser = async (req, res) => {
    try {
        const {
            name,
            email,
            password,
            role,
            departmentId,
            teamId
        } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        if (!email?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        if (!password) {
            return res.status(400).json({
                success: false,
                message: "Password is required"
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required"
            });
        }

        const user = await userService.createUser(
            req.user.organizationId,
            {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                password,
                role,
                departmentId: departmentId || null,
                teamId: teamId || null
            }
        );

        return res.status(201).json({
            success: true,
            message: "User created successfully",
            data: user
        });

    } catch (error) {
        console.error("Create user error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to create user"
        });
    }
};


const updateUser = async (req, res) => {
    try {
        const {
            name,
            email,
            role,
            departmentId,
            teamId
        } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Name is required"
            });
        }

        if (!email?.trim()) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            });
        }

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required"
            });
        }

        const user = await userService.updateUser(
            req.user.organizationId,
            req.params.id,
            {
                name: name.trim(),
                email: email.trim().toLowerCase(),
                role,
                departmentId: departmentId || null,
                teamId: teamId || null
            }
        );

        return res.json({
            success: true,
            message: "User updated successfully",
            data: user
        });

    } catch (error) {
        console.error("Update user error:", error);

        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Failed to update user"
        });
    }
};


const updateUserStatus = async (req, res) => {

    try {

        const { status } = req.body;

        const user = await userService.updateUserStatus({
            organizationId: req.user.organizationId,
            userId: req.params.id,
            status
        });

        res.json({
            success: true,
            data: user
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const updateUserRole = async (req, res) => {

    try {

        const { role } = req.body;

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "Role is required"
            });
        }

        const user = await userService.updateUserRole(
            req.user.organizationId,
            req.params.id,
            role
        );

        res.json({
            success: true,
            data: user
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const updatePassword = async (req, res) => {

    try {

        const { password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters"
            });
        }

        await userService.updatePassword({
            organizationId: req.user.organizationId,
            userId: req.params.id,
            password
        });

        res.json({
            success: true,
            message: "Password updated successfully"
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const deleteUser = async (req, res) => {

    try {

        await userService.deleteUser({
            organizationId: req.user.organizationId,
            userId: req.params.id
        });

        res.json({
            success: true,
            message: "User deactivated successfully"
        });

    } catch (error) {

        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


module.exports = {
    getUsers,
    getUserById,
    getRoles,
    createUser,
    updateUser,
    updateUserStatus,
    updateUserRole,
    updatePassword,
    deleteUser
};