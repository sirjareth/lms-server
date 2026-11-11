const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// [SECTION] Import routes
const userRoutes = require("./routes/userRoutes");
const batchRoutes = require("./routes/batchRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const activityRoutes = require("./routes/activityRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

require('dotenv').config();

app.use(express.json());

const corsOption = {
  
  origin: ['http://localhost:8000'],
  credentials: true,
  optionSuccessStatus: 200
}

app.use(cors(corsOption));

// [SECTION] Database Connection
mongoose.connect(process.env.MONGODB_STRING);

mongoose.connection.once('open', () => 
  console.log(`Now connected to MongoDB Atlas`))

// [SECTION] Map Routes
app.use("/users", userRoutes);
app.use("/batches", batchRoutes);
app.use("/enrollments", enrollmentRoutes);
app.use("/sessions", sessionRoutes);
app.use("/activities", activityRoutes);
app.use("/submissions", submissionRoutes);
app.use("/dashboard", dashboardRoutes);

if (require.main === module) {

  app.listen(process.env.PORT ||3000, () => {
    console.log(`API is now online on port ${process.env.PORT || 3000}`);
  })
}

module.exports = {app, mongoose };
