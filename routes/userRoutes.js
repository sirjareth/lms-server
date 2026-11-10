const express = require("express");

const userController = require("../controllers/userController.js");

const { verify, verifyAdmin } = require("../auth.js");

const router = express.Router();

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.get("/details", verify, userController.getProfile);
router.get("/", verify, verifyAdmin, userController.getAllUsers);
router.patch("/:id/role", verify, verifyAdmin, userController.updateRole);
router.patch("/:id/deactivate", verify, verifyAdmin, userController.deactivateUser);

module.exports = router;