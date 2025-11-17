/*
 * File: authRoutes.js
 * Description: Secure authentication for ServiceDesk (hashed passwords, safe errors, no XSS).
 */

const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const { db, logEvent } = require("../db");

// Helper: redirect logged-in users away from login/register
function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) {
    return res.redirect("/tickets");
  }
  next();
}

// GET /register
router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("register", { error: null });
});

// POST /register (secure)
router.post("/register", redirectIfAuthenticated, async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password || password.length < 6) {
    return res.render("register", {
      error: "Username and password are required. Password must be at least 6 characters."
    });
  }

  try {
    // Hash password with bcrypt
    const hash = await bcrypt.hash(password, 10);

    const sql = "INSERT INTO users (username, password, role) VALUES (?, ?, 'user')";
    db.run(sql, [username, hash], function (err) {
      if (err) {
        logEvent("WARN", `Registration failed for ${username}: ${err.message}`);
        // Generic error message, no user-controlled HTML
        return res.render("register", {
          error: "Registration failed. Username may already be taken."
        });
      }

      logEvent("INFO", `New user registered: ${username}`);
      res.redirect("/login");
    });
  } catch (e) {
    logEvent("ERROR", `Registration error for ${username}: ${e.message}`);
    res.status(500).render("register", {
      error: "An internal error occurred. Please try again later."
    });
  }
});

// GET /login
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { error: null });
});

// POST /login (secure)
router.post("/login", redirectIfAuthenticated, (req, res) => {
  const { username, password } = req.body;

  const sql = "SELECT * FROM users WHERE username = ?";

  db.get(sql, [username], async (err, user) => {
    if (err) {
      logEvent("ERROR", `DB error during login for ${username}: ${err.message}`);
      return res.status(500).render("login", {
        error: "An internal error occurred. Please try again later."
      });
    }

    if (!user) {
      logEvent("WARN", `Login failed: unknown username ${username}`);
      return res.render("login", {
        error: "Invalid username or password."
      });
    }

    try {
      const passwordMatches = await bcrypt.compare(password, user.password);
      if (!passwordMatches) {
        logEvent("WARN", `Login failed: bad password for ${username}`);
        return res.render("login", {
          error: "Invalid username or password."
        });
      }

      // Minimal session data (no password or full user object)
      req.session.user = {
        id: user.id,
        username: user.username,
        role: user.role
      };

      logEvent("INFO", `User logged in: ${username}`);
      res.redirect("/tickets");
    } catch (e) {
      logEvent("ERROR", `Error comparing password for ${username}: ${e.message}`);
      res.status(500).render("login", {
        error: "An internal error occurred. Please try again later."
      });
    }
  });
});

// GET /logout
router.get("/logout", (req, res) => {
  const username = req.session.user?.username || "unknown";
  req.session.destroy(() => {
    logEvent("INFO", `User logged out: ${username}`);
    res.redirect("/login");
  });
});

module.exports = router;
