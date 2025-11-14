/*
 * File: authRoutes.js
 * Description: Authentication module for the INSECURE ServiceDesk Help Desk System.
 * Author: Liam Connell
 * Date: 2025-11-14
 *
 * This file intentionally contains insecure practices required for the SAP project:
 *  - Plaintext password storage and comparison (Sensitive Data Exposure)
 *  - Reflected XSS in error messages
 *  - Insecure session handling
 *  - No rate limiting or brute-force protection
 *  - Poor validation and error handling
 */

const express = require("express");
const router = express.Router();
const { db, logEvent } = require("../db");

/* ------------------------------------------------------------------------- */
/*  Helper: Redirect if already logged in                                    */
/* ------------------------------------------------------------------------- */
function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    return res.redirect("/tickets");
  }
  next();
}

/* ------------------------------------------------------------------------- */
/*  GET /register - show registration page                                   */
/* ------------------------------------------------------------------------- */
router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("register", { error: null });
});

/* ------------------------------------------------------------------------- */
/*  POST /register - INSECURE user creation                                  */
/*  Vulnerabilities:
 *   - No validation
 *   - No hashing
 *   - Displaying unescaped username in error (Reflected XSS)
 *   - Duplicate username errors not hidden
 */
/* ------------------------------------------------------------------------- */
router.post("/register", (req, res) => {
  const { username, password } = req.body;

  const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')";

  db.run(sql, [username, password], function (err) {
    if (err) {
      logEvent("WARN", `Registration failed for ${username}: ${err.message}`);

      return res.render("register", {
        // Vulnerable reflected XSS
        error: `Registration failed for <b>${username}</b>. Error: ${err.message}`
      });
    }

    logEvent("INFO", `New user registered: ${username}`);
    res.redirect("/login");
  });
});

/* ------------------------------------------------------------------------- */
/*  GET /login - show login page                                             */
/* ------------------------------------------------------------------------- */
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { error: null });
});

/* ------------------------------------------------------------------------- */
/*  POST /login - INSECURE authentication                                    */
/*
 * Vulnerabilities:
 *   - Plaintext password comparison
 *   - Reflected XSS when login fails
 *   - Session stores full unfiltered user record
 *   - No brute-force protection or lockouts
 */
/* ------------------------------------------------------------------------- */
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ? AND password = ?";

  db.get(sql, [username, password], (err, user) => {
    if (err) {
      logEvent("ERROR", `DB error during login: ${err.message}`);

      return res.render("login", {
        error: `Unexpected error: <pre>${err.message}</pre>` // Unsafe output
      });
    }

    if (!user) {
      logEvent("WARN", `Failed login attempt for username: ${username}`);

      return res.render("login", {
        // Reflected XSS vulnerability
        error: `Login failed for user: <script>alert("${username}")</script>`
      });
    }

    // INSECURE: directly store full user object in session
    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role
    };

    logEvent("INFO", `User logged in: ${username}`);
    res.redirect("/tickets");
  });
});

/* ------------------------------------------------------------------------- */
/*  GET /logout - destroy session                                             */
/* ------------------------------------------------------------------------- */
router.get("/logout", (req, res) => {
  logEvent("INFO", `User logged out: ${req.session?.user?.username || "unknown"}`);

  req.session.destroy(() => {
    res.redirect("/login");
  });
});

module.exports = router;
