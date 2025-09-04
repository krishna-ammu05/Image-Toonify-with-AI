const { Schema, model } = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
  username: { type: String, required: true, unique: true },
  fullname: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  email: { type: String, required: true, unique: true },

  // Subscription details
  plan: {
    type: String,
    enum: ["Free Plan", "Monthly", "6Month", "Annual"],
    default: "Free Plan",
  },
  planExpiry: { type: Date },
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },

  status: {
    type: String,
    enum: ["Active", "Inactive", "Banned"],
    default: "Active",
  },

  uploads: { type: Number, default: 0 },
  conversions: { type: Number, default: 0 },
});

userSchema.plugin(passportLocalMongoose);
const User = model("User", userSchema);
module.exports = User;
