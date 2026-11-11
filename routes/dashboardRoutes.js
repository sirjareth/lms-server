const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { verify, verifyAdmin } = require("../auth");

const router = express.Router();

router.get("/batch/:batchId", verify, dashboardController.getTraineeDashboard);
router.get("/batch/:batchId/trainer", verify, verifyAdmin, dashboardController.getTrainerDashboard);

module.exports = router;
