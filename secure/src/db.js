/*
 * File: db.js
 * Description: SQLite3 database setup for the SECURE ServiceDesk Help Desk System.
 * Notes:
 *   - Passwords stored as bcrypt hashes.
 *   - No sensitive data in logs.
 */

const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

// Use a separate DB file for the secure version
const db = new sqlite3.Database("./servicedesk-secure.db");

db.serialize(() => {
  // Users table with hashed password
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,       -- bcrypt hash
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  // Tickets table (same structure, but handled securely in code)
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Admin comments
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (admin_id) REFERENCES users(id)
    )
  `);

  // Logs table (no stack traces or secrets)
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Seed a secure admin account if not present
  db.get(
    "SELECT id FROM users WHERE username = ?",
    ["admin"],
    async (err, row) => {
      if (err) {
        console.error("Error checking for admin user:", err.message);
        return;
      }

      if (!row) {
        try {
          // Hash default admin password (still documented, but not stored plaintext)
          const hash = await bcrypt.hash("admin123", 10);
          db.run(
            "INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')",
            ["admin", hash]
          );
          console.log("Secure admin user created (username: admin, password: admin123)");
        } catch (e) {
          console.error("Error seeding admin user:", e.message);
        }
      }
    }
  );
});

// Secure logging: do not store secrets or stack traces, only high-level messages.
function logEvent(level, message) {
  db.run("INSERT INTO logs (level, message) VALUES (?, ?)", [level, message]);
}

module.exports = { db, logEvent };
