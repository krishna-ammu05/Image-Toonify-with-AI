const { Schema, model } = require("mongoose");
const passportLocalMongoose = require("passport-local-mongoose");
const Image = require("./image.js");

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  images: [
    {
      type: Schema.Types.ObjectId,
      ref: "Image",
    },
  ],
});

userSchema.plugin(passportLocalMongoose);

const User = model("User", userSchema);

module.exports = User;
