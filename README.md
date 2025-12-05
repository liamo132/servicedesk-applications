INSECURE VERSION README

Overview

The insecure version of the ServiceDesk application was deliberately developed with multiple vulnerabilities based on the OWASP Top 10. Its purpose is to demonstrate how common security weaknesses occur, why they are dangerous, and how attackers could exploit them. This version is used for educational testing, scanning, and screenshots.

Key Vulnerabilities Implemented
1. SQL Injection

User input is not validated or sanitised, and raw input is directly placed into SQL statements.
This allows attackers to alter queries, bypass authentication or extract database contents.
In practice, a malicious user could input crafted text into a login or search form to dump tables or log in without a valid password.

2. Cross-Site Scripting (XSS)

User-generated content such as ticket descriptions or comments is rendered without escaping.
Attackers can inject script tags that run in other users’ browsers.
This could lead to stolen session cookies, account takeover, or forced actions on behalf of the victim.

3. Sensitive Data Exposure

Passwords are stored in a reversible or plain format.
Cookies are not protected using secure attributes.
No encryption or protective headers are used.
If an attacker gains access to the database or intercepts traffic, user information can be compromised.

4. Insecure Direct Object Reference (IDOR)

Ticket pages do not confirm that the logged-in user actually owns the ticket they request.
This means an attacker could manually change URLs to access another user’s data.

5. Missing Logging and Monitoring

There is no meaningful record of suspicious behaviour.
Attacks would go unnoticed, and incident investigation would be impossible.

6. Lack of CSRF Protection

Forms can be submitted by external websites without the user’s knowledge.
An attacker could force a logged-in user to create tickets or alter data without consent.

Why These Vulnerabilities Matter

These issues directly affect confidentiality, integrity, and availability.
A single exploit could expose user data, compromise accounts, or allow full system manipulation.
This insecure version exists purely for demonstration and is not intended for real-world use.
