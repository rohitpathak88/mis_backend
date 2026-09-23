const express = require("express");

const router = express.Router();

const userController =
    require("../controllers/user.controller");

const { authenticate } =
    require("../middleware/auth.middleware");

const { allowRoles } =
    require("../middleware/role.middleware");


router.use(authenticate);

router.use(
    allowRoles("ORG_ADMIN")
);


router.get(
    "/roles",
    userController.getRoles
);


router.get(
    "/",
    userController.getUsers
);


router.get(
    "/:id",
    userController.getUserById
);


router.post(
    "/",
    userController.createUser
);


router.put(
    "/:id",
    userController.updateUser
);


router.patch(
    "/:id/status",
    userController.updateUserStatus
);


router.patch(
    "/:id/role",
    userController.updateUserRole
);


router.patch(
    "/:id/password",
    userController.updatePassword
);


router.delete(
    "/:id",
    userController.deleteUser
);


module.exports = router;