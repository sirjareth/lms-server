const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();


// oauth
const session = require("express-session");
const passport = require("passport");
require("./passport.js"); 
// oauth

// Routes
const userRoutes = require("./routes/userRoutes");
const batchRoutes = require("./routes/batchRoutes");
const enrollmentRoutes = require("./routes/enrollmentRoutes");
const sessionRoutes = require("./routes/sessionRoutes");
const activityRoutes = require("./routes/activityRoutes");
const submissionRoutes = require("./routes/submissionRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");

const app = express();

// Render terminates TLS before forwarding requests to this service.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Middleware
app.use(express.json());

const clientOrigin = process.env.CLIENT_URL || "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
    optionsSuccessStatus: 200,
  })
);


// [SECTION] start of oauth
//setup session middleware
// creates a memory for each user when they visit our api
app.use(session({
  secret: process.env.SESSION_SECRET || process.env.JWT_SECRET_KEY,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}))

 
// Initialize the passport (starts authentication system)

// Turn on passports to it can handle logins
app.use(passport.initialize());
// Keep users logged in as they move between pages
app.use(passport.session());

// end of oauth

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
