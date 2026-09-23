const express = require("express");
const controller = require("../controllers/organization.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);
router.use(allowRoles("SUPER_ADMIN"));

router.get("/", controller.getOrganizations);
router.get("/:id", controller.getOrganizationById);

module.exports = router;
