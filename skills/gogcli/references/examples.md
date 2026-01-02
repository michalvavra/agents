# gogcli Examples

Detailed examples for common Google Workspace automation tasks.

## Gmail

### Basic Search and Read

```bash
# Recent emails
gog gmail search 'newer_than:1d'
gog gmail search 'newer_than:7d' --max 50

# From specific sender
gog gmail search 'from:boss@example.com'
gog gmail search 'from:boss@example.com newer_than:30d'

# Subject search
gog gmail search 'subject:invoice'
gog gmail search 'subject:"quarterly report"'

# Read a thread
gog gmail thread <threadId>
gog gmail thread <threadId> --json
```

### Attachments

```bash
# Find emails with attachments
gog gmail search 'has:attachment newer_than:7d'
gog gmail search 'has:attachment filename:pdf'
gog gmail search 'has:attachment larger:5M'

# Download attachments from a thread
gog gmail thread <threadId> --download --out-dir ./attachments

# Download all attachments from search results
for id in $(gog gmail search 'has:attachment from:client@example.com' --json | jq -r '.[].id'); do
  gog gmail thread "$id" --download --out-dir ./client-files
done
```

### Sending Email

```bash
# Simple text email
gog gmail send \
  --to recipient@example.com \
  --subject "Quick update" \
  --body "Here's the information you requested."

# Multiple recipients with CC
gog gmail send \
  --to alice@example.com \
  --cc bob@example.com,carol@example.com \
  --subject "Team Update" \
  --body "Please review the attached."

# HTML email
gog gmail send \
  --to recipient@example.com \
  --subject "Newsletter" \
  --body "Plain text version" \
  --body-html "<h1>Newsletter</h1><p>HTML version with <strong>formatting</strong></p>"

# With attachment
gog gmail send \
  --to recipient@example.com \
  --subject "Report attached" \
  --body "Please find the report attached." \
  --attach ./report.pdf

# Multiple attachments
gog gmail send \
  --to recipient@example.com \
  --subject "Documents" \
  --body "All documents attached." \
  --attach ./doc1.pdf \
  --attach ./doc2.xlsx
```

### Labels and Organization

```bash
# List all labels
gog gmail labels list
gog gmail labels list --json

# Get label details
gog gmail labels get INBOX --json
gog gmail labels get "Label_123" --json

# Add/remove labels from messages
gog gmail batch modify <msgId1> <msgId2> --add "Label_456"
gog gmail batch modify <msgId1> <msgId2> --remove INBOX
gog gmail batch modify <msgId1> --remove UNREAD
```

### Batch Operations

```bash
# Mark all newsletters as read
ids=$(gog gmail search 'is:unread from:newsletter@example.com' --json | jq -r '.[].messages[].id' | tr '\n' ' ')
[ -n "$ids" ] && gog gmail batch modify $ids --remove UNREAD

# Archive old emails
ids=$(gog gmail search 'older_than:1y label:INBOX' --json | jq -r '.[].messages[].id' | tr '\n' ' ')
[ -n "$ids" ] && gog gmail batch modify $ids --remove INBOX

# Move to label
ids=$(gog gmail search 'from:vendor@example.com' --json | jq -r '.[].messages[].id' | tr '\n' ' ')
[ -n "$ids" ] && gog gmail batch modify $ids --add "Label_Vendors" --remove INBOX
```

## Calendar

### Viewing Events

```bash
# Today's events
gog calendar events primary \
  --from "$(date -u +%Y-%m-%dT00:00:00Z)" \
  --to "$(date -u +%Y-%m-%dT23:59:59Z)"

# This week
gog calendar events primary \
  --from "$(date -u +%Y-%m-%dT00:00:00Z)" \
  --to "$(date -u -v+7d +%Y-%m-%dT00:00:00Z)"

# All calendars
gog calendar events --all \
  --from 2025-01-01T00:00:00Z \
  --to 2025-01-31T00:00:00Z

# Search events
gog calendar search "standup" \
  --from 2025-01-01T00:00:00Z \
  --to 2025-02-01T00:00:00Z
```

### Creating Events

```bash
# Simple meeting
gog calendar create primary \
  --summary "Team Meeting" \
  --from 2025-01-15T10:00:00-05:00 \
  --to 2025-01-15T11:00:00-05:00

# With attendees and location
gog calendar create primary \
  --summary "Project Review" \
  --from 2025-01-15T14:00:00-05:00 \
  --to 2025-01-15T15:00:00-05:00 \
  --attendees "alice@example.com,bob@example.com" \
  --location "Conference Room A"

# With description
gog calendar create primary \
  --summary "1:1 with Manager" \
  --from 2025-01-15T09:00:00-05:00 \
  --to 2025-01-15T09:30:00-05:00 \
  --description "Weekly sync to discuss project progress"

# All-day event
gog calendar create primary \
  --summary "Company Holiday" \
  --from 2025-01-20 \
  --to 2025-01-21 \
  --all-day

# Multi-day event
gog calendar create primary \
  --summary "Conference" \
  --from 2025-02-10 \
  --to 2025-02-13 \
  --all-day
```

### Availability and Scheduling

```bash
# Check free/busy for yourself
gog calendar freebusy "primary" \
  --from 2025-01-15T00:00:00Z \
  --to 2025-01-16T00:00:00Z

# Check availability with coworkers
gog calendar freebusy "primary,alice@example.com,bob@example.com" \
  --from 2025-01-15T00:00:00Z \
  --to 2025-01-16T00:00:00Z

# Find conflicts in your schedule
gog calendar conflicts \
  --from 2025-01-15T00:00:00Z \
  --to 2025-01-22T00:00:00Z

# Respond to invitation
gog calendar respond <calendarId> <eventId> --status accepted
gog calendar respond <calendarId> <eventId> --status declined
gog calendar respond <calendarId> <eventId> --status tentative
```

## Drive

### Listing and Searching

```bash
# List recent files
gog drive ls
gog drive ls --max 50

# List folder contents
gog drive ls --parent <folderId>

# Search files
gog drive search "quarterly report"
gog drive search "budget 2025" --max 20
```

### Upload and Download

```bash
# Upload file
gog drive upload ./document.pdf
gog drive upload ./document.pdf --name "Q1 Report.pdf"

# Upload to specific folder
gog drive upload ./document.pdf --parent <folderId>

# Download file
gog drive download <fileId> --out ./downloaded.pdf

# Export Google Doc as PDF
gog drive download <fileId> --format pdf --out ./exported.pdf

# Export Google Sheet as Excel
gog drive download <fileId> --format xlsx --out ./exported.xlsx
```

### Folder Management

```bash
# Create folder
gog drive mkdir "Project Files"
gog drive mkdir "Subproject" --parent <parentFolderId>

# Move file to folder
gog drive move <fileId> --parent <folderId>

# Rename file
gog drive rename <fileId> "new-name.pdf"

# Copy file
gog drive copy <fileId> --name "backup-copy.pdf"

# Delete file
gog drive delete <fileId>
```

### Sharing

```bash
# Share with specific user (view only)
gog drive share <fileId> --email user@example.com --role reader

# Share with edit access
gog drive share <fileId> --email user@example.com --role writer

# Share with anyone (public link)
gog drive share <fileId> --anyone --role reader
```

## Tasks

### Managing Task Lists

```bash
# List all task lists
gog tasks lists
gog tasks lists --json

# List tasks in a specific list
gog tasks list <tasklistId>
gog tasks list <tasklistId> --json
```

### Creating Tasks

```bash
# Simple task
gog tasks add <tasklistId> --title "Review document"

# Task with due date
gog tasks add <tasklistId> \
  --title "Submit report" \
  --due 2025-01-15T17:00:00Z

# Task with notes
gog tasks add <tasklistId> \
  --title "Call client" \
  --notes "Discuss Q2 projections and timeline" \
  --due 2025-01-10T14:00:00Z
```

### Completing Tasks

```bash
# Mark as done
gog tasks done <tasklistId> <taskId>

# Mark as not done
gog tasks undo <tasklistId> <taskId>

# Clear all completed tasks from list
gog tasks clear <tasklistId>
```

## Contacts

### Searching and Listing

```bash
# List contacts
gog contacts list
gog contacts list --max 100

# Search contacts
gog contacts search "John"
gog contacts search "example.com" --max 20

# Get specific contact
gog contacts get john@example.com
```

### Creating Contacts

```bash
# Basic contact
gog contacts create \
  --given "John" \
  --family "Doe" \
  --email "john@example.com"

# Full contact
gog contacts create \
  --given "Jane" \
  --family "Smith" \
  --email "jane@example.com" \
  --phone "+1234567890"
```

### Workspace Directory

```bash
# Search company directory
gog contacts directory search "Jane"
gog contacts directory list --max 50
```

## Sheets

### Reading Data

```bash
# Read cell range
gog sheets get <spreadsheetId> 'Sheet1!A1:B10'
gog sheets get <spreadsheetId> 'Sheet1!A:A'  # Entire column

# Get as JSON for processing
gog sheets get <spreadsheetId> 'Sheet1!A1:D100' --json

# Get spreadsheet metadata
gog sheets metadata <spreadsheetId>
```

### Writing Data

```bash
# Update specific cells
gog sheets update <spreadsheetId> 'Sheet1!A1' --values '[["Header1", "Header2"]]'

# Update range
gog sheets update <spreadsheetId> 'Sheet1!A1:B2' \
  --values '[["A1", "B1"], ["A2", "B2"]]'

# Append rows to end
gog sheets append <spreadsheetId> 'Sheet1' \
  --values '[["new", "row", "data"]]'

# Append multiple rows
gog sheets append <spreadsheetId> 'Sheet1' \
  --values '[["row1col1", "row1col2"], ["row2col1", "row2col2"]]'
```

### Export and Create

```bash
# Export as Excel
gog sheets export <spreadsheetId> --format xlsx --out ./export.xlsx

# Export as CSV
gog sheets export <spreadsheetId> --format csv --out ./export.csv

# Create new spreadsheet
gog sheets create "Budget 2025"
gog sheets create "Project Tracker" --json  # Returns spreadsheetId
```

## Common Workflows

### Daily Digest Script

```bash
#!/bin/bash
echo "=== Today's Calendar ==="
gog calendar events primary \
  --from "$(date -u +%Y-%m-%dT00:00:00Z)" \
  --to "$(date -u +%Y-%m-%dT23:59:59Z)"

echo -e "\n=== Unread Emails ==="
gog gmail search 'is:unread newer_than:1d' --max 10

echo -e "\n=== Pending Tasks ==="
gog tasks list <tasklistId>
```

### Email Report to Spreadsheet

```bash
# Count emails by sender (last 30 days)
gog gmail search 'newer_than:30d' --json | \
  jq -r '.[].messages[].from' | \
  sort | uniq -c | sort -rn > email_stats.txt
```

### Backup Drive Folder

```bash
# Download all files from a folder
for id in $(gog drive ls --parent <folderId> --json | jq -r '.[].id'); do
  name=$(gog drive ls --parent <folderId> --json | jq -r ".[] | select(.id==\"$id\") | .name")
  gog drive download "$id" --out "./backup/$name"
done
```

### Schedule Meeting with Available Time

```bash
# Check availability first
gog calendar freebusy "primary,attendee@example.com" \
  --from 2025-01-15T09:00:00Z \
  --to 2025-01-15T18:00:00Z --json

# Then create event at available time
gog calendar create primary \
  --summary "Sync Meeting" \
  --from 2025-01-15T14:00:00-05:00 \
  --to 2025-01-15T14:30:00-05:00 \
  --attendees "attendee@example.com"
```

## Error Handling

```bash
# Check authentication status
gog auth list

# Re-authenticate if needed
gog auth add you@gmail.com

# Re-auth with specific services
gog auth add you@gmail.com --services gmail,calendar,drive --force-consent

# Check if command succeeded
if gog gmail search 'is:unread' --json > /dev/null 2>&1; then
  echo "Gmail access OK"
else
  echo "Gmail access failed"
fi
```
