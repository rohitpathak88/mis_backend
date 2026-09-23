const express = require("express");
const router = express.Router();
const controller = require("../controllers/payout.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");

router.use(authenticate);

router.get("/rules", allowRoles("ORG_ADMIN", "MANAGEMENT", "TEAM_LEADER"), controller.getRules);
router.post("/rules", allowRoles("ORG_ADMIN"), controller.createRule);

router.get("/periods", allowRoles("ORG_ADMIN", "MANAGEMENT", "TEAM_LEADER"), controller.getPeriods);
router.post("/periods", allowRoles("ORG_ADMIN"), controller.createPeriod);
router.post("/periods/:periodId/calculate", allowRoles("ORG_ADMIN"), controller.calculatePeriod);
router.get("/periods/:periodId", allowRoles("ORG_ADMIN", "MANAGEMENT", "TEAM_LEADER"), controller.getPayoutPeriod);
router.patch("/:id/status", allowRoles("ORG_ADMIN"), controller.updatePayoutStatus);

module.exports = router;
