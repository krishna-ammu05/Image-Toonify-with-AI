import mongoose from "mongoose";
import User from "../models/users.js";
import Image from "../models/image.js";
import { images } from "./data.js";

async function main() {
  await mongoose.connect("mongodb://127.0.0.1:27017/toonify");
  console.log("DB Connected ✅");
}

async function seedDB() {
  await main();

  await User.deleteMany({});
  await Image.deleteMany({});
  console.log("Old data removed 🗑️");

  const insertedImages = await Image.insertMany(images);
  console.log(`${insertedImages.length} images inserted 📸`);

  const user = new User({
    username: "johndoe",
    email: "johndoe@email.com",
    images: insertedImages.map((img) => img._id),
  });

  await User.register(user, "password123");
  console.log("Sample user created 👤 with linked images");

  await mongoose.connection.close();
  console.log("DB connection closed 🚪");
}

seedDB().catch(console.error);
