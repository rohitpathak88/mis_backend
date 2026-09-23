const express = require("express");

const departmentController = require("../controllers/department.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { allowRoles } = require("../middleware/role.middleware");

const router = express.Router();

router.use(authenticate);
router.use(allowRoles("ORG_ADMIN"));

router.get("/", departmentController.getDepartments);
router.get("/:id", departmentController.getDepartmentById);

router.post("/", departmentController.createDepartment);

router.put("/:id", departmentController.updateDepartment);

router.patch(
    "/:id/status",
    departmentController.updateDepartmentStatus
);

router.delete(
    "/:id",
    departmentController.deleteDepartment
);

module.exports = router;