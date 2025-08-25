const mongoose = require("mongoose");
const User = require("../models/users.js");
const Image = require("../models/image.js");
const images = require("./data.js");

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/toonify");
  console.log("DB Connected Successfully 🚀");
}

async function seedDB() {
  try {
    await main();

    // Clear existing data
    await User.deleteMany({});
    await Image.deleteMany({});
    console.log("Old data removed 🗑️");

    // Create new user
    const user = new User({
      username: "john",
      fullname: "john",
      email: "johndoe@email.com",
    });

    await User.register(user, "john"); // passport-local-mongoose
    console.log("User created ");

    // Insert all images and assign uploadedBy = user._id
    const imagesWithUser = images.map((img) => ({
      ...img,
      uploadedBy: user._id,
    }));

    const insertedImages = await Image.insertMany(imagesWithUser);
    console.log(`${insertedImages.length} images inserted `);

    await mongoose.connection.close();
    console.log("DB connection closed 🚪");
  } catch (err) {
    console.error("Error seeding DB ❌", err);
  }
}

seedDB();
