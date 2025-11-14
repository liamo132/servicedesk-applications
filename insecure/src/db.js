/*
 * Description: SQLite3 database connection and schema for the insecure ServiceDesk Help Desk System.
 * Notes: This version intentionally includes insecure practices for SAP assessment:
 *        - Plaintext passwords
 *        - Hardcoded admin credentials
 *        - No input sanitisation
 *        - Logs may store sensitive event data
 */

const sqlite3 = require("sqlite3").verbose();

// Create or open database file
const db = new sqlite3.Database("./servicedesk-insecure.db");

// Create all required tables
db.serialize(() => {
  /*
   * USERS TABLE
   * - Stores username, plaintext password, and role.
   * - Passwords stored insecurely to demonstrate Sensitive Data Exposure.
   */
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,       -- Insecure: Plaintext
      role TEXT NOT NULL DEFAULT 'user'
    )
  `);

  /*
   * TICKETS TABLE
   * - Stores ticket data including title, description, and category.
   * - Description is rendered unsafely → Stored XSS vulnerability.
   */
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,   -- Stored XSS vulnerability
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  /*
   * ADMIN COMMENTS TABLE
   * - Allows admins to leave internal comments.
   * - Stored XSS vulnerabilities apply here.
   */
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      admin_id INTEGER NOT NULL,
      comment TEXT NOT NULL,       -- Stored XSS vulnerability
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /*
   * LOGS TABLE
   * - Insecure version logs sensitive details.
   */
  db.run(`
    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Hardcoded admin account — intentionally insecure
  db.run(`
    INSERT OR IGNORE INTO users (id, username, password, role)
    VALUES (1, 'admin', 'admin123', 'admin')
  `);
});

/*
 * Function: logEvent
 * Purpose: Store logs in database (insecure: logs may reveal sensitive info)
 */
function logEvent(level, message) {
  db.run("INSERT INTO logs (level, message) VALUES (?, ?)", [level, message]);
}

module.exports = { db, logEvent };
