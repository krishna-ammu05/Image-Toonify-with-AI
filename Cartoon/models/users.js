const { Schema, model } = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true, // required for passport-local-mongoose
  },
  fullname: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    enum: ["Free Plan", "Pro Plan", "Premium Plan"],
    default: "Free Plan",
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Banned"],
    default: "Active",
  },
  uploads: {
    type: Number,
    default: 0,
  },
  conversions: {
    type: Number,
    default: 0,
  },
});

userSchema.plugin(passportLocalMongoose);

const User = model("User", userSchema);
module.exports = User;
