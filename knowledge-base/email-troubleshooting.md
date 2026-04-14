# Email Troubleshooting

## Outlook Not Syncing

### Desktop (Outlook App)

1. Check your internet connection
2. Look at the bottom-right of Outlook. If it says Disconnected or Trying to connect:
   - Go to File then Account Settings then Account Settings
   - Select your account and click Repair
   - Follow the prompts
3. If sync is stuck:
   - Close Outlook completely
   - Open Task Manager and end any remaining Outlook processes
   - Reopen Outlook

### Outlook on the Web

1. Go to https://outlook.office365.com
2. Sign in with your company credentials
3. If email works here but not in the desktop app, the issue is with your local Outlook installation

## Cannot Send Emails

1. Check if you are over your mailbox quota:
   - File then Account Settings then check mailbox size
   - If over 90%, archive or delete old emails
2. Check if the recipient address is correct
3. Look in your Outbox. If emails are stuck there:
   - Try switching Outlook to offline mode (Send/Receive tab then Work Offline) and back
   - Check your outgoing server settings are not blocked

## Cannot Receive Emails

1. Check your Junk or Spam folder
2. Ask the sender to verify your email address
3. Check if you have Inbox rules redirecting mail:
   - File then Manage Rules and Alerts
   - Disable suspicious rules
4. Verify mailbox is not full

## Email Signature Setup

1. Open Outlook then File then Options then Mail then Signatures
2. Click New and name it Company
3. Use the company template with your name, title, department, company name, and phone number
4. Set it as default for new messages and replies

## Calendar Issues

### Meeting Invites Not Appearing

1. Check your Deleted Items folder
2. Look in Other Calendars for duplicates
3. Ask the organizer to resend the invite
4. Try opening the calendar in Outlook Web

### Cannot Book a Conference Room

1. Open a new meeting in Outlook
2. Click Room Finder on the ribbon
3. Select your building and floor
4. Choose an available room
5. If no rooms appear, contact your office admin to verify room list access

## Common Error Messages

- **Your mailbox is full**: Delete emails or move them to archive. Empty the Deleted Items folder.
- **550 Relay denied**: You are trying to send from an unauthorized address. Use your company email only.
- **Certificate error**: Your Outlook security certificate may be outdated. Run Windows Update and restart.
