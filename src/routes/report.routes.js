const express = require("express");
const controller = require("../controllers/report.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);
router.use(allowRoles("ORG_ADMIN", "SUPER_ADMIN"));

router.get("/summary", controller.getReport);
router.get("/export", controller.exportReport);

module.exports = router;
