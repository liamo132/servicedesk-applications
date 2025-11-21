/*
 * File: ticketRoutes.js
 * Description: Secure ticket routes with full OWASP protections:
 *  - Parameterised SQL queries (SQLi mitigation)
 *  - Output is escaped via EJS <%= %>
 *  - Strong access control (IDOR prevention)
 *  - Input validation
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
/*  GET /tickets - List tickets (safe search)                                */
/* ------------------------------------------------------------------------- */
router.get("/", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const search = req.query.search || "";

  const sql = `
    SELECT * FROM tickets
    WHERE user_id = ?
      AND title LIKE ?
    ORDER BY created_at DESC
  `;

  db.all(sql, [userId, `%${search}%`], (err, tickets) => {
    if (err) {
      logEvent("ERROR", `SQL error on listing tickets: ${err.message}`);
      return res.status(500).send("An error occurred.");
    }

    res.render("tickets/list", {
      tickets,
      search,
      error: null
    });
  });
});

/* ------------------------------------------------------------------------- */
/*  GET /tickets/new - Form for creating ticket                              */
/* ------------------------------------------------------------------------- */
router.get("/new", requireAuth, (req, res) => {
  res.render("tickets/new", { error: null });
});

/* ------------------------------------------------------------------------- */
/*  POST /tickets - Create ticket (VALIDATED + ESCAPED)                      */
/* ------------------------------------------------------------------------- */
router.post("/", requireAuth, (req, res) => {
  const userId = req.session.user.id;
  const { title, category, description } = req.body;

  // Basic validation
  if (!title || !category || !description) {
    return res.status(400).render("tickets/new", {
      error: "All fields are required."
    });
  }

  const sql = `
    INSERT INTO tickets (user_id, title, description, category)
    VALUES (?, ?, ?, ?)
  `;

  db.run(sql, [userId, title.trim(), description.trim(), category.trim()], function (err) {
    if (err) {
      logEvent("ERROR", `Ticket creation error: ${err.message}`);
      return res.status(500).render("tickets/new", {
        error: "Unable to create ticket at this time."
      });
    }

    logEvent("INFO", `Ticket created by user ${userId} (ID ${this.lastID})`);
    res.redirect("/tickets");
  });
});

/* ------------------------------------------------------------------------- */
/* POST /tickets/:id/comments — Add user comment                             */
/* ------------------------------------------------------------------------- */
router.post("/:id/comments", requireAuth, (req, res) => {
  const ticketId = req.params.id;
  const userId = req.session.user.id;
  const { comment } = req.body;

  if (!comment || comment.trim() === "") {
    return res.status(400).send("Comment cannot be empty.");
  }

  const sql = `
    INSERT INTO user_comments (ticket_id, user_id, comment)
    VALUES (?, ?, ?)
  `;

  db.run(sql, [ticketId, userId, comment.trim()], (err) => {
    if (err) {
      logEvent("ERROR", `User comment error: ${err.message}`);
      return res.status(500).send("Failed to add comment.");
    }

    res.redirect(`/tickets/${ticketId}`);
  });
});


/* ------------------------------------------------------------------------- */
/*  GET /tickets/:id - View ticket (IDOR PROTECTED + loads comments)          */
/* ------------------------------------------------------------------------- */
router.get("/:id", requireAuth, (req, res) => {
  const ticketId = req.params.id;
  const userId = req.session.user.id;

  const ticketSql = `
    SELECT * FROM tickets
    WHERE id = ? AND user_id = ?
  `;

  const commentsSql = `
    SELECT c.*, u.username AS commenter
    FROM user_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.ticket_id = ?
    ORDER BY c.created_at ASC
  `;

  db.get(ticketSql, [ticketId, userId], (err, ticket) => {
    if (err) {
      logEvent("ERROR", `Ticket fetch error: ${err.message}`);
      return res.status(500).send("Error loading ticket.");
    }

    if (!ticket) {
      logEvent("WARN", `Unauthorized ticket access attempt by user ${userId}`);
      return res.status(403).send("You do not have access to this ticket.");
    }

    // Fetch user comments for that ticket
    db.all(commentsSql, [ticketId], (err2, comments) => {
      if (err2) {
        logEvent("ERROR", `Comments fetch error: ${err2.message}`);
        return res.status(500).send("Error loading ticket comments.");
      }

      res.render("tickets/detail", {
        ticket,
        comments: comments || [],
        error: null
      });
    });
  });
});

module.exports = router;
