const express = require("express");

const router = express.Router();

const misController = require("../controllers/mis.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");
const upload = require("../middleware/upload.middleware");

// Existing routes
router.post(
    "/import",
    authenticate,
    upload.single("file"),
    misController.importExcel
);

// Admin transaction status update
router.patch(
    "/data/:id/status",
    authenticate,
    allowRoles("ORG_ADMIN", "SUPER_ADMIN"),
    misController.updateTransactionStatus
);

router.get(
    "/data",
    authenticate,
    misController.getMISData
);

router.get(
    "/months",
    authenticate,
    misController.getAvailableMonths
);

module.exports = router;