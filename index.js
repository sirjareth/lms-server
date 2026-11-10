const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// [SECTION] Import routes
const userRoutes = require("./routes/userRoutes");

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

if (require.main === module) {

  app.listen(process.env.PORT ||3000, () => {
    console.log(`API is now online on port ${process.env.PORT || 3000}`);
  })
}

module.exports = {app, mongoose };
