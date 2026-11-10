const express = require("express");
const enrollmentController = require("../controllers/enrollmentController");
const { verify, verifyAdmin } = require("../auth");

const router = express.Router();

router.post("/", verify, verifyAdmin, enrollmentController.enrollUser);
router.get("/", verify, verifyAdmin, enrollmentController.getAllEnrollments);
router.get("/my-enrollments", verify, enrollmentController.getUserEnrollments);
router.get("/batch/:batchId", verify, verifyAdmin, enrollmentController.getBatchRoster);
router.patch("/:id/status", verify, verifyAdmin, enrollmentController.updateEnrollmentStatus);

module.exports = router;
