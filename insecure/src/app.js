/*
 * File: app.js
 * Description: Entry point for the insecure ServiceDesk Help Desk System.
 */

const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;

// Configure view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Body parser
app.use(bodyParser.urlencoded({ extended: false }));

// Insecure session (intentionally vulnerable)
app.use(
  session({
    secret: "insecure-secret",
    resave: false,
    saveUninitialized: false
  })
);

// Basic test route
app.get("/", (req, res) => {
  res.send("Insecure ServiceDesk App is running.");
});

// Start server
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
