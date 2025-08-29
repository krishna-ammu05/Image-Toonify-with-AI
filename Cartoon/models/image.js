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
  style: {
    type: String,
    enum: ["pencil", "cartoon", "grayscale","sketch","ghibli"],
    default: "cartoon",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  //store which user uploaded this image
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const Image = mongoose.model("Image", imageSchema);
module.exports = Image;
