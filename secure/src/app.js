/*
 * File: app.js
 * Description: Entry point for the SECURE ServiceDesk Help Desk System.
 */

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const bodyParser = require("body-parser");
const helmet = require("helmet");
const csurf = require("csurf");
const morgan = require("morgan");

const { logEvent } = require("./db");

const authRoutes = require("./routes/authRoutes");
const ticketRoutes = require("./routes/ticketRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3001;

// View engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));

// Logging (no sensitive payloads)
app.use(
  morgan("combined", {
    stream: {
      write: (msg) => logEvent("INFO", msg.trim())
    }
  })
);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "script-src": ["'self'"], 
        "default-src": ["'self'"]
      }
    },
    referrerPolicy: { policy: "no-referrer" }
  })
);

// Parse form data
app.use(bodyParser.urlencoded({ extended: false }));

// Secure session
app.use(
  session({
    secret: process.env.SESSION_SECRET || "change_this_secret_for_production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // set true for HTTPS in production
      sameSite: "lax"
    }
  })
);

// Expose session user to views
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// CSRF protection
app.use(csurf());

// Expose CSRF token to views
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// DEBUG LOGGER: shows each request path
app.use((req, res, next) => {
  console.log("Rendering path:", req.path);
  next();
});

// Routes
app.use("/", authRoutes);
app.use("/tickets", ticketRoutes);
app.use("/admin", adminRoutes);

// Root redirect
app.get("/", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.redirect("/tickets");
});

// Global secure error handler
app.use((err, req, res, next) => {
  // CSRF error
  if (err.code === "EBADCSRFTOKEN") {
    logEvent("WARN", "CSRF token error on path: " + req.path);
    return res.status(403).send("Form tampered with or session expired.");
  }

  // Other errors
  logEvent("ERROR", `Unexpected error on ${req.path}: ${err.message}`);
  console.error(err);

  res.status(500).send("An unexpected error occurred.");
});

app.listen(PORT, () => {
  console.log(`Secure ServiceDesk app running on http://localhost:${PORT}`);
});
