const express = require("express");

const teamController = require("../controllers/team.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);

// Only organization administrators can manage teams
router.use(allowRoles("ORG_ADMIN", "SUPER_ADMIN"));

router.get(
    "/",
    teamController.getTeams
);

router.get(
    "/:id",
    teamController.getTeamById
);

router.post(
    "/",
    teamController.createTeam
);

router.put(
    "/:id",
    teamController.updateTeam
);

router.patch(
    "/:id/status",
    teamController.updateTeamStatus
);

router.delete(
    "/:id",
    teamController.deleteTeam
);

module.exports = router;