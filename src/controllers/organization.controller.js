const organizationService = require("../services/organization.service");

const getOrganizations = async (req, res) => {
    try {
        const data = await organizationService.getOrganizations();
        return res.json({ success: true, data });
    } catch (error) {
        console.error("Get organizations error:", error);
        return res.status(500).json({ success: false, message: "Unable to load organizations" });
    }
};

const getOrganizationById = async (req, res) => {
    try {
        const data = await organizationService.getOrganizationById(Number(req.params.id));
        return res.json({ success: true, data });
    } catch (error) {
        console.error("Get organization error:", error);
        return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Unable to load organization" });
    }
};

module.exports = { getOrganizations, getOrganizationById };
