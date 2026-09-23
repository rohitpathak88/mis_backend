const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication token required"
            });
        }

        const token = authHeader.split(" ")[1];

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decoded;

        // SUPER_ADMIN can work inside a selected organization.
        // The organization is always validated server-side.
        if (decoded.role === "SUPER_ADMIN" && req.query.organizationId) {
            const organizationId = Number(req.query.organizationId);

            if (!Number.isInteger(organizationId) || organizationId <= 0) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid organizationId"
                });
            }

            const [organizations] = await db.query(
                `SELECT id FROM organizations WHERE id = ? AND status = 'ACTIVE' LIMIT 1`,
                [organizationId]
            );

            if (!organizations.length) {
                return res.status(404).json({
                    success: false,
                    message: "Organization not found or inactive"
                });
            }

            req.user.organizationId = organizationId;
        }

        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token"
        });
    }
};

module.exports = {
    authenticate
};