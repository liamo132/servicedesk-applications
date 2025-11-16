/*
 * File: adminRoutes.js
 * Description: Insecure admin module for the ServiceDesk Help Desk System.
 * Author: Liam Connell
 * Date: 2025-11-14
 *
 * INTENTIONAL VULNERABILITIES:
 *  - Weak role-based access control (simple in-memory check only)
 *  - Stored XSS in admin comments
 *  - Logs viewer exposes potentially sensitive data
 *  - No CSRF protection on state-changing routes
 *  - No validation or sanitisation of input
 */

const express = require("express");
const router = express.Router();
const { db, logEvent } = require("../db");


/*  Middleware: Require Admin                                                */
function requireAdmin(req, res, next) {
  // Insecure: role trust is entirely based on session value
  if (!req.session.user || req.session.user.role !== "admin") {
    logEvent("WARN", "Unauthorised access attempt to admin area");
    return res.status(403).send("Forbidden: Admins only.");
  }
  next();
}


/*  GET /admin - Admin dashboard listing all tickets                         */
router.get("/", requireAdmin, (req, res) => {
  const sql = `
    SELECT t.*, u.username AS owner_username
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `;

  db.all(sql, (err, tickets) => {
    if (err) {
      logEvent("ERROR", `Admin dashboard error: ${err.message}`);
      return res.status(500).send("Failed to load admin dashboard.");
    }

    res.render("admin/dashboard", {
      tickets: tickets || []
    });
  });
});


/*  GET /admin/tickets/:id - View ticket with admin comments                 */
router.get("/tickets/:id", requireAdmin, (req, res) => {
  const ticketId = req.params.id;

  const ticketSql = `
    SELECT t.*, u.username AS owner_username
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `;

  const commentsSql = `
    SELECT ac.*, u.username AS admin_username
    FROM admin_comments ac
    JOIN users u ON ac.admin_id = u.id
    WHERE ac.ticket_id = ?
    ORDER BY ac.created_at ASC
  `;

  db.get(ticketSql, [ticketId], (err, ticket) => {
    if (err || !ticket) {
      logEvent("WARN", `Admin ticket view: ticket not found ${ticketId}`);
      return res.status(404).send("Ticket not found.");
    }

    db.all(commentsSql, [ticketId], (err2, comments) => {
      if (err2) {
        logEvent("ERROR", `Admin ticket comments load error: ${err2.message}`);
        return res.status(500).send("Error loading comments.");
      }

      /*
       * Stored XSS:
       * Comments are rendered unescaped in the view using <%- %>.
       */
      res.render("admin/ticket_detail", {
        ticket,
        comments: comments || []
      });
    });
  });
});

/*  POST /admin/tickets/:id/status - Update ticket status (no CSRF)          */
router.post("/tickets/:id/status", requireAdmin, (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  const sql = `
    UPDATE tickets
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [status, ticketId], function (err) {
    if (err) {
      logEvent("ERROR", `Admin status update error: ${err.message}`);
      return res.status(500).send("Failed to update status.");
    }

    logEvent("INFO", `Admin updated status for ticket ${ticketId} to ${status}`);
    res.redirect(`/admin/tickets/${ticketId}`);
  });
});

/*  POST /admin/tickets/:id/comments - Add admin comment (Stored XSS)        */
router.post("/tickets/:id/comments", requireAdmin, (req, res) => {
  const ticketId = req.params.id;
  const adminId = req.session.user.id;
  const { comment } = req.body;

  const sql = `
    INSERT INTO admin_comments (ticket_id, admin_id, comment)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [ticketId, adminId, comment], function (err) {
    if (err) {
      logEvent("ERROR", `Admin comment insert error: ${err.message}`);
      return res.status(500).send("Failed to add comment.");
    }

    logEvent("INFO", `Admin ${adminId} added comment to ticket ${ticketId}`);
    res.redirect(`/admin/tickets/${ticketId}`);
  });
});

/* POST /admin/tickets/:id/status - Insecure status update (no validation)   */
router.post("/tickets/:id/status", (req, res) => {
  const ticketId = req.params.id;
  const newStatus = req.body.status;   // No validation → insecure

  const sql = `
    UPDATE tickets
    SET status = '${newStatus}'        -- SQL injection vulnerability
    WHERE id = ${ticketId}             -- IDOR + SQLi
  `;

  db.run(sql, function (err) {
    if (err) {
      console.log("Insecure admin status update error:", err.message);
      return res.status(500).send("Error updating status (insecure).");
    }

    res.redirect(`/admin/tickets/${ticketId}`);
  });
});


/*  GET /admin/logs - Insecure log viewer                                    */
/*  - Exposes all log messages including errors and possibly sensitive data. */
router.get("/logs", requireAdmin, (req, res) => {
  db.all("SELECT * FROM logs ORDER BY created_at DESC LIMIT 100", (err, logs) => {
    if (err) {
      logEvent("ERROR", `Admin logs view error: ${err.message}`);
      return res.status(500).send("Failed to load logs.");
    }

    res.render("admin/logs", { logs: logs || [] });
  });
});

module.exports = router;
