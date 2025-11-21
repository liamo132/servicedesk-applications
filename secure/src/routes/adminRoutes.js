/*
 * File: adminRoutes.js
 * Description: Secure admin module for the ServiceDesk app.
 */

const express = require("express");
const router = express.Router();
const { db, logEvent } = require("../db");

/* ------------------------------------------------------------------------- */
/*  Middleware: Require Admin                                                */
/* ------------------------------------------------------------------------- */
function requireAdmin(req, res, next) {
  const user = req.session.user;
  if (!user || user.role !== "admin") {
    logEvent(
      "WARN",
      `Unauthorized admin access attempt: ${user ? user.username : "anonymous"}`
    );
    return res.status(403).send("Forbidden: Admins only.");
  }
  next();
}

/* ------------------------------------------------------------------------- */
/*  Admin Dashboard                                                           */
/* ------------------------------------------------------------------------- */
router.get("/", requireAdmin, (req, res) => {
  const sql = `
    SELECT t.*, u.username AS owner_username
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    ORDER BY t.created_at DESC
  `;

  db.all(sql, [], (err, tickets) => {
    if (err) {
      logEvent("ERROR", `Admin dashboard error: ${err.message}`);
      return res.status(500).send("Failed to load admin dashboard.");
    }

    res.render("admin/dashboard", {
      tickets: tickets || [],
      error: null,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      currentUser: req.session.user
    });
  });
});

/* ------------------------------------------------------------------------- */
/*  View Ticket + Comments                                                   */
/* ------------------------------------------------------------------------- */
router.get("/tickets/:id", requireAdmin, (req, res) => {
  const ticketId = req.params.id;

  const ticketSql = `
    SELECT t.*, u.username AS owner_username
    FROM tickets t
    JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `;

  const adminCommentsSql = `
    SELECT ac.*, u.username AS admin_username
    FROM admin_comments ac
    JOIN users u ON ac.admin_id = u.id
    WHERE ac.ticket_id = ?
    ORDER BY ac.created_at ASC
  `;

  const userCommentsSql = `
    SELECT uc.*, u.username AS commenter
    FROM user_comments uc
    JOIN users u ON u.id = uc.user_id
    WHERE uc.ticket_id = ?
    ORDER BY uc.created_at ASC
  `;

  db.get(ticketSql, [ticketId], (err, ticket) => {
    if (err) {
      logEvent("ERROR", `Admin ticket load error: ${err.message}`);
      return res.status(500).send("Error loading ticket.");
    }

    if (!ticket) {
      return res.status(404).send("Ticket not found.");
    }

    db.all(adminCommentsSql, [ticketId], (err2, adminComments) => {
      if (err2) {
        logEvent("ERROR", `Admin comments error: ${err2.message}`);
        return res.status(500).send("Error loading admin comments.");
      }

      db.all(userCommentsSql, [ticketId], (err3, userComments) => {
        if (err3) {
          logEvent("ERROR", `User comments error: ${err3.message}`);
          return res.status(500).send("Error loading user comments.");
        }

        res.render("admin/ticket_detail", {
          ticket,
          adminComments: adminComments || [],
          userComments: userComments || [],
          error: null,
          csrfToken: req.csrfToken ? req.csrfToken() : '',
          currentUser: req.session.user
        });
      });
    });
  });
});

/* ------------------------------------------------------------------------- */
/*  Update Ticket Status                                                     */
/* ------------------------------------------------------------------------- */
router.post("/tickets/:id/status", requireAdmin, (req, res) => {
  const ticketId = req.params.id;
  const { status } = req.body;

  const allowedStatuses = ["Open", "In Progress", "Waiting on User", "Resolved"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).send("Invalid status value.");
  }

  const sql = `
    UPDATE tickets
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `;

  db.run(sql, [status, ticketId], (err) => {
    if (err) {
      logEvent("ERROR", `Admin status update error: ${err.message}`);
      return res.status(500).send("Failed to update status.");
    }

    logEvent(
      "INFO",
      `Admin ${req.session.user.username} updated status for ticket ${ticketId} to ${status}`
    );
    res.redirect(`/admin/tickets/${ticketId}`);
  });
});

/* ------------------------------------------------------------------------- */
/*  Add Admin Comment                                                        */
/* ------------------------------------------------------------------------- */
router.post("/tickets/:id/comments", requireAdmin, (req, res) => {
  const ticketId = req.params.id;
  const adminId = req.session.user.id;
  const { comment } = req.body;

  if (!comment || comment.trim() === "") {
    return res.status(400).send("Comment cannot be empty.");
  }

  const sql = `
    INSERT INTO admin_comments (ticket_id, admin_id, comment)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [ticketId, adminId, comment.trim()], (err) => {
    if (err) {
      logEvent("ERROR", `Admin comment error: ${err.message}`);
      return res.status(500).send("Failed to add comment.");
    }

    res.redirect(`/admin/tickets/${ticketId}`);
  });
});

/* ------------------------------------------------------------------------- */
/*  System Logs                                                              */
/* ------------------------------------------------------------------------- */
router.get("/logs", requireAdmin, (req, res) => {
  db.all("SELECT * FROM logs ORDER BY created_at DESC LIMIT 200", [], (err, logs) => {
    if (err) {
      logEvent("ERROR", `Admin logs error: ${err.message}`);
      return res.status(500).send("Failed to load logs.");
    }

    res.render("admin/logs", {
      logs: logs || [],
      error: null,
      csrfToken: req.csrfToken ? req.csrfToken() : '',
      currentUser: req.session.user
    });
  });
});

/* ------------------------------------------------------------------------- */
module.exports = router;