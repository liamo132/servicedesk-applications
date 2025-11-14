/*
 * File: ticketRoutes.js
 * Description: Insecure ticket management system for the ServiceDesk application.
 * Author: Liam Connell
 * Date: 2025-11-14
 *
 * INTENTIONAL VULNERABILITIES (SAP REQUIREMENTS):
 * ------------------------------------------------
 * 1. SQL Injection in search:
 *      SELECT * FROM tickets WHERE user_id = ${userId} AND title LIKE '%${search}%'
 *
 * 2. Stored XSS:
 *      - Ticket descriptions rendered with <%- %>
 *      - Admin comments rendered unescaped
 *
 * 3. No access control:
 *      - Users can manually access tickets that aren't theirs (IDOR vulnerability)
 *
 * 4. No input validation:
 *      - Any HTML/JS allowed in ticket description
 *
 * 5. No sanitisation, no escaping, no CSRF tokens
 *
 * 6. Error messages are vague or missing entirely
 */

const express = require("express");
const router = express.Router();
const { db, logEvent } = require("../db");

/* ------------------------------------------------------------------------- */
/*  Middleware: Require User Authentication                                  */
/* ------------------------------------------------------------------------- */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  next();
}

/* ------------------------------------------------------------------------- */
/*  GET /tickets - List tickets for the user (SQLi vulnerability)            */
/* ------------------------------------------------------------------------- */
router.get("/", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const search = req.query.search || "";

  /*
   * SQL INJECTION:
   * No prepared statements. User controls `search` directly.
   * An attacker can input:
   *
   *     ' OR 1=1 --
   *
   * and return ALL tickets regardless of user ID.
   */
  const sql = `
    SELECT * FROM tickets
    WHERE user_id = ${userId}
      AND title LIKE '%${search}%'
    ORDER BY created_at DESC
  `;

  db.all(sql, (err, tickets) => {
    if (err) {
      logEvent("ERROR", `Ticket list SQL error: ${err.message}`);
      return res.status(500).send("Database error.");
    }

    res.render("tickets/list", {
      tickets: tickets || [],
      search
    });
  });
});

/* ------------------------------------------------------------------------- */
/*  GET /tickets/new - Show new ticket form                                 */
/* ------------------------------------------------------------------------- */
router.get("/new", requireAuth, (req, res) => {
  res.render("tickets/new");
});

/* ------------------------------------------------------------------------- */
/*  POST /tickets - Create ticket (Stored XSS vulnerability)                 */
/* ------------------------------------------------------------------------- */
router.post("/", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { title, description, category } = req.body;

  /*
   * Stored XSS:
   * We store whatever the user submits — HTML, JS, <script>, onload, onclick, etc.
   * It will be rendered unescaped in ticket detail.
   */
  const sql = `
    INSERT INTO tickets (user_id, title, description, category)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [userId, title, description, category], function (err) {
    if (err) {
      logEvent("ERROR", `Error creating ticket: ${err.message}`);
      return res.status(500).send("Failed to create ticket.");
    }

    logEvent("INFO", `Ticket created with ID: ${this.lastID}`);
    res.redirect("/tickets");
  });
});

/* ------------------------------------------------------------------------- */
/*  GET /tickets/:id - View ticket detail (IDOR + Stored XSS)                */
/* ------------------------------------------------------------------------- */
router.get("/:id", requireAuth, (req, res) => {
  const ticketId = req.params.id;

  /*
   * IDOR VULNERABILITY:
   * This query does NOT check if the ticket actually belongs to the user.
   *
   * Users can manually access:
   *     /tickets/1
   *     /tickets/2
   *
   * Even if these tickets belong to someone else.
   */
  const sql = "SELECT * FROM tickets WHERE id = ?";

  db.get(sql, [ticketId], (err, ticket) => {
    if (err || !ticket) {
      logEvent("WARN", `Ticket not found: ${ticketId}`);
      return res.status(404).send("Ticket not found.");
    }

    /*
     * Stored XSS:
     * Ticket description rendered using <%- %> in EJS.
     * This prints RAW HTML/JS into the page.
     */
    res.render("tickets/detail", {
      ticket
    });
  });
});

module.exports = router;
