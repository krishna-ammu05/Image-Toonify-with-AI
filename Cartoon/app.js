const express = require("express");
const app = express();
const ejsMate = require("ejs-mate");
const path = require("path");

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views/"));
app.use(express.static(path.join(__dirname, "public/js")));
app.use(express.static(path.join(__dirname, "public/css")));
app.use(express.static(path.join(__dirname, "public/images")));

app.get("/", (req, res) => {
  res.render("Home.ejs");
});

app.get("/auth/login", (req, res) => {
  res.render("auth/Login.ejs");
});

app.get("/auth/register", (req, res) => {
  res.render("auth/Register.ejs");
});

app.listen(3000, () => {
  console.log("Server is running at port 3000");
});
