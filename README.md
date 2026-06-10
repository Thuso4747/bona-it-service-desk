## Database Schema Doc ##

## Overview
There are two tables 
- User, stores all the user's data in the table. There are three roles that a user can be granted: Admin, Agent or Client.
- Ticket, stores all the ticket's data. The ticket can have its state altered: from Created to Processing to Completed.
## Tables

# User
User ID and Ref: The ID is a number from 1 to however mauny users are in the table(auto incrementing), the Ref can be used to change how the ID looks, e.g instead if "1" it can look like "U001"
User Name, Email and Password: These are set by the user and are their own private information.
Role: is an enum, which can determine whether a user is an Admin/Agent/Client.
SubmittedTicket uses the array Ticket to show all of the tickets submitted by that user.
ResolvedTickets uses the array Tickets to show all of the tickets resolved by that user.
# Ticket
Ticket ID and Ref: The ID is a number from 1 to hownever many tickets are in the table, it also automatically assigns a number when a entry is amde(auto incrementing). The Ref works the same as it does in the User table, it can be used to make the ID apear as "T001" instrad of just a plain number like "1".
The title and description are inputs entered by the user.
The status is also an enum that can be set to display the status of the ticket, apon being made the status should be set as "Created", when an agent is currently busy with solving the ticket the status should be set to "Processing" and when the ticket has been compoleted the status should be set to "Completed".
The date is set as the date of when the entry enters the table(date of ticket creation).
Submitted by is a foreign key linked with the User table, and will take the user ID of clients or anyone who has submitted a ticket.
ResolvedBy is also a foreign key that links with the User table and will take the user ID of Agents or anyone who resolved a ticket.

# Relationships
SubmittedBy writes to submittedTickets in the Tickets array, linked to the User table using the user ID.
ResolvedBy writes to resolvedTickets in the Tickets array, linked to the User table using the user ID.