const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

// Routes
const userRoutes = require("./routes/userRoutes");
const batchRoutes = require("./routes/batchRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const activityRoutes = require("./routes/activityRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Middleware
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Database Connection
mongoose.connect(process.env.MONGODB_STRING);

mongoose.connection.once("open", () => {
  console.log("Now connected to MongoDB Atlas");
});

// Routes
app.use("/users", userRoutes);
app.use("/batches", batchRoutes);
app.use("/enrollments", enrollmentRoutes);
app.use("/sessions", sessionRoutes);
app.use("/activities", activityRoutes);
app.use("/submissions", submissionRoutes);
app.use("/dashboard", dashboardRoutes);

// Server
if (require.main === module) {
  app.listen(process.env.PORT || 4000, () => {
    console.log(
      `API is now online on port ${process.env.PORT || 4000}`
    );
  });
}

module.exports = { app, mongoose };
