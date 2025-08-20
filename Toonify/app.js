const express = require("express");
const app = express();
const ejsMate = require('ejs-mate');
const path = require("path")

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views',path.join(__dirname,"/views"));
app.use(express.static(path.join(__dirname,"public/js")));
app.use(express.static(path.join(__dirname,"public/css")));



app.get("/",(req,res)=>{
    res.render("Home.ejs");
})

app.listen(8080,()=>{
    console.log("Server is running at port 8080");
})