const mongoose = require("mongoose");
const User = require("../models/users.js");
const Image = require("../models/image");
const images = require("./data.js");

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/toonify");
  console.log("DB Connected Successfully 🚀");
}

async function seedDB() {
  try {
    await main();

    // Clear existing data
    // await User.deleteMany({});
    // await Image.deleteMany({});
    // console.log("Old data removed 🗑️");

    // Insert all images
    const insertedImages = await Image.insertMany(images);
    console.log(`${insertedImages.length} images inserted ✅`);

    // Create new user
    const user = new User({
      username: "johndoe",
      email: "johndoe@email.com",
      images: insertedImages.map((img) => img._id),
    });

    await User.register(user, "password123"); // passport-local-mongoose
    console.log("User created ✅");

    await mongoose.connection.close();
    console.log("DB connection closed 🚪");
  } catch (err) {
    console.error("Error seeding DB ❌", err);
  }
}

seedDB();
