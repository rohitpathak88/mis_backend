const authService = require("../services/auth.service");

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });
        }

        const result = await authService.login(
            email.trim().toLowerCase(),
            password
        );

        return res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(401).json({
            success: false,
            message: error.message
        });
    }
};

const me = async (req, res) => {
    try {
        const [users] = await require("../config/database").query(
            `
            SELECT
                u.id,
                u.organization_id,
                u.name,
                u.email,
                u.status,
                r.name AS role
            FROM users u
            INNER JOIN roles r
                ON r.id = u.role_id
            WHERE u.id = ?
            LIMIT 1
            `,
            [req.user.userId]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const user = users[0];

        return res.json({
            success: true,
            data: {
                id: user.id,
                organizationId: user.role === "SUPER_ADMIN" ? null : user.organization_id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status
            }
        });

    } catch (error) {
        console.error("Get user error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve user"
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

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve MIS data"
        });
    }
};

const registerOrganization = async (req, res) => {

    try {

        const {
            organizationName,
            adminName,
            email,
            password
        } = req.body;

        // Required fields
        if (
            !organizationName ||
            !adminName ||
            !email ||
            !password
        ) {

            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // Basic password requirement
        if (password.length < 8) {

            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 8 characters"
            });
        }

        const result =
            await authService.registerOrganization({
                organizationName,
                adminName,
                email,
                password
            });

        return res.status(201).json({
            success: true,
            message:
                "Organization registered successfully",
            data: result
        });

    } catch (error) {

        console.error(
            "Organization registration error:",
            error
        );


        if (
            error.message ===
            "Email address is already registered"
        ) {

            return res.status(409).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message:
                "Unable to register organization"
        });
    }
};

module.exports = {
    login,
    me,
    getMISData,
    registerOrganization
};