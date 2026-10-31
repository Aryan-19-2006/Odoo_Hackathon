const mongoose = require("mongoose");

const USER_ROLES = Object.freeze(["admin", "staff", "customer"]);

const userSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: USER_ROLES,
      default: "customer",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      required: true,
    },
  },
  {
    collection: "users",
    timestamps: true,
  },
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = { USER_ROLES, User };
