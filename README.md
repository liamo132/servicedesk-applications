# servicedesk-applications
#MAIN README
#ServiceDesk Help Desk System – Insecure & Secure Versions

#This project contains two versions of the same help-desk web application:

#Insecure Version– intentionally vulnerable for learning and demonstration.

#Secure Version– fully remediated using proper secure coding practices.

#The goal is to demonstrate common OWASP vulnerabilities, show how attackers could exploit them, and then show how to fix them using real security controls.

#The system is built using Node.js, Express, SQLite and EJS.

#*Features (Both Versions)

#User Account

#Register an account (insecure = unsafe, secure = validated + hashed)

#Login/logout

#Create support tickets

#View your own tickets

#Add comments (secure version supports user comments safely)


#Admin Account

#View all tickets in the system

#Update ticket status

#Leave admin comments

#View system logs (secure version only)

#How the Application Works (User Journey)

#Register or login

#Create a ticket (title, category, description)

#View all your tickets

#Click into “ticket detail” to read description + comments

#*Admin Journey

#Login with the admin account

#Access the Admin Dashboard

#View every ticket in the system

#Update ticket status

Add admin comments

#View system logs (secure version)

#*Pages / Screens

#User

#/login

#/register

#/tickets (my tickets)
#
#/tickets/new

#/tickets/:id


#Admin

#/admin

#/admin/tickets/:id

#/admin/logs

#*Technologies

#Node.js

#Express.js

#SQLite

#EJS templating

#Playwright for UI testing

#Helmet (secure version only)

#Bcrypt (secure version only)
