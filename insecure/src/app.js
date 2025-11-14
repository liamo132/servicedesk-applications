/*
 * File: app.js
 * Description: Entry point for the insecure ServiceDesk Help Desk System.
 * Author: Liam Connell
 * Date: 2025-11-14
 *
 * IMPORTANT:
 *  This file must load Express BEFORE loading routes.
 *  Your current version loaded routes first, which breaks the app.
 */

const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");

const app = express();
const PORT = 3000;


/*  VIEW ENGINE SETUP                                                        */

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


/*  STATIC FILES                                                             */
app.use(express.static(path.join(__dirname, "public")));

/*  PARSE FORM DATA                                                          */
app.use(bodyParser.urlencoded({ extended: false }));

/*  INSECURE SESSION CONFIG                                                  */
app.use(
  session({
    secret: "insecure-secret",  // intentionally weak
    resave: false,
    saveUninitialized: false
  })
);

/*  ROUTES (Correct Order: Express app must exist first)                     */
const authRoutes = require("./routes/authRoutes.js");
const ticketRoutes = require("./routes/ticketRoutes");
const adminRoutes = require("./routes/adminRoutes");

app.use("/", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/admin", adminRoutes);

/*  BASIC ROOT CHECK                                                         */
app.get("/", (req, res) => {
  res.send("Insecure ServiceDesk App is running.");
});

/*  START SERVER                                                             */
app.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
});
