const mongoose = require("mongoose");

const imageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  originalImage: {
    type: String,
    required: true,
  },
  cartoonImage: {
    type: String,
    required: true,
  },
  filter: {
    type: String,
    enum: ["cartoon", "sketch", "pencil"],
    default: "cartoon",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Image = mongoose.model("Image", imageSchema);
module.exports = Image;
