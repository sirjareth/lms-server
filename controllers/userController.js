const User = require("../models/User");
const bcrypt = require("bcryptjs");
const { createAccessToken, errorHandler } = require("../auth.js");

module.exports.registerUser = async (req, res) => {
  try {
    if (
      typeof req.body.firstName !== "string" ||
      typeof req.body.lastName !== "string" ||
      req.body.firstName.trim() === "" ||
      req.body.lastName.trim() === ""
    ) {
      return res.status(400).send({
        message: "Check the details and try again."
      });
    }

    if (!req.body.email.includes("@")) {
      return res.status(400).send({
        message: "Invalid Email Format"
      });
    }

    if (req.body.mobileNo.length !== 11) {
      return res.status(400).send({
        message: "Mobile number is invalid"
      });
    }

    if (req.body.password.length < 7) {
      return res.status(400).send({
        message: "Password must be at least 7 characters long."
      });
    }

    const existingEmail = await User.findOne({ email: req.body.email });

    if (existingEmail) {
      return res.status(409).send({
        message: "Email already exists."
      });
    }

    const newUser = await User.create({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      mobileNo: req.body.mobileNo,
      password: bcrypt.hashSync(req.body.password, 10),
      isAdmin: false
    });

    const result = newUser.toObject();
    delete result.password;

    return res.status(201).send({
      message: "User registered successfully",
      result
    });

  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== "string" || typeof password !== "string" || !email.includes("@")) {
      return res.status(400).send({ message: "Invalid email format." });
    }

    const result = await User.findOne({ email: email });

    if (!result) {
      return res.status(404).send({ message: "No email found." });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, result.password);

    if (!isPasswordCorrect) {
      return res.status(401).send({ message: "Invalid email or password." });
    }

    if (!result.isActive) {
      return res.status(403).send({ message: "This account has been deactivated." });
    }

    return res.status(200).send({
      access: createAccessToken(result)
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await User.findById(userId);

    if (!result) {
      return res.status(404).send({ message: "Profile not found." });
    }

    result.password = "";

    return res.status(200).send(result);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password");
    return res.status(200).send(users);
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.updateRole = async (req, res) => {
  try {
    const { isAdmin } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isAdmin: isAdmin },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    return res.status(200).send({
      message: "User role updated successfully",
      updatedUser
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};

module.exports.deactivateUser = async (req, res) => {
  try {
    const deactivatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!deactivatedUser) {
      return res.status(404).send({ message: "User not found" });
    }

    return res.status(200).send({
      message: "User deactivated successfully",
      deactivatedUser
    });
  } catch (error) {
    return errorHandler(error, req, res);
  }
};
