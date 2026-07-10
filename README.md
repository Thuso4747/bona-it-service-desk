# Service Desk App - Documentation

A service desk portal featuring a client dahboard, user authentications, and an admin/agent management dashboard. 

---

##  Live Deployment

- **Deployed URL:** https://bona-it-service-desk-system.vercel.app/
- **Agent Login:** admin@portal.com / admin123

---

## Demo Video

The project demo video is available on Google Drive:

- **Demo Video:** https://drive.google.com/drive/folders/1ZNjpOvzv9FUDjnMlTkQ3P-AgOnQilM8n?usp=sharing

---

##  Admin / Agent Credentials

The system is pre-seeded with a default super admin agent account. Use the credentials below to log in:

- **Email Address:** `admin@portal.com`
- **Password:** `admin123`
- **Role:** Agent / Admin

---

##  Client Features & Instructions

The portal allows users to submit support tickets and track them in real-time.

1. **Self-Service Support Request**:
   - Access the portal and select or register a client account.
   - Click on the **New Support Ticket** form.
   - Enter the user information (name & email), choose a email subject and provide detailed description.
   - Click submit to generate a ticket.

2. **Real-time Tracker**:
   - View submitted tickets and their current status (`CREATED`, `PROCCESSING`, `COMPLETED`).
   - Review all submitted tickets with status and date submitted/updated via ticket token.

---

##  Admin & Support Agent Features & Instructions

The Agent Dashboard provides service management capabilities to organize, assign and resolve user tickets.

1. **Unified Dashboard**:
   - Toggle between **Tickets Table** and **Users Table** to view structural records.
   - Use the smart search bar to filter tickets or users by keywords, categories, or references.

2. **User Password Visibility (Read-Only)**:
   - For auditing and management purposes, administrators can view the exact user passwords directly in the **Users Table** and the **User Inspector** tab.
   - To prevent accidental modifications, password inputs are greyed out, marked read-only, and disabled for editing.

3. **Inline Record Inspection**:
   - Click on any row/ticket to open the inspector tab.
   - Review ticket details and update ticket status or deleteticket/row in inspector tab.

4. **Status & Role Updates**:
   - Manage ticket assignments and update status.
   - Modify user classifications and system access (updating client/agent roles) directly from the admin view.
   - Save modifications seamlessly.

---

##  Ticket Tracking API & Reference Normalization

The portal supports a dedicated serverless and container-compatible endpoint for tracking support tickets by token or code.

- **Status Tracking Endpoint**: `GET /api/tickets/status/:token`
- **Normalization Support**:
  - Automatically strips spaces and capitalizes references.
  - Detects 8-character hexadecimal codes and automatically prepends `TKT-` (`a1b2c3d4` normalizes to `TKT-A1B2C3D4`) for query matches.
  - Queries either the dynamic `trackingToken` or normalized `ticketRef` linked to user account metadata.

## Database Schema Doc ##

## Overview
There are two tables 
- User, stores all the user's data in the table. There are two roles that a user can be granted: Admin or Client.
- Ticket, stores all the ticket's data. The ticket can have its status updated: from Created to Processing to Completed.
## Tables

# User
User ID and Ref: The ID is a number from 1 to however mauny users are in the table(auto incrementing).
User Name, Email and Password: These are set by the user and are their own private information.
Role: is an enum, which can determine whether a user is an Admin/Client.
SubmittedTicket uses the array Ticket to show all of the tickets submitted by that user.
ResolvedTickets uses the array Tickets to show all of the tickets resolved by that user.
# Ticket
Ticket ID and Ref: The ID is a number from 1 to hownever many tickets are in the table, it also automatically assigns a number by entry.
The title and description are inputs entered by the user.
The status is also an enum that can be set to display the status of the ticket, apon being made the status should be set as "Created", when an agent is currently busy with solving the ticket the status should be set to "Processing" and when the ticket has been compoleted the status should be set to "Completed".
Each status update is followed by an email to the particular user that submitted the ticket.
The date is set as the date of ticket creation.
Submitted by is a foreign key linked with the User table, and will take the user ID of clients or anyone who has submitted a ticket.
ResolvedBy is also a foreign key that links with the User table and will take the user ID of Agents or anyone who resolved a ticket.

# Relationships
SubmittedBy writes to submittedTickets in the Tickets array, linked to the User table using the user ID.
ResolvedBy writes to resolvedTickets in the Tickets array, linked to the User table using the user ID.

