# gogcli Examples

## Gmail Query Syntax

| Query | Meaning |
|-------|---------|
| `newer_than:7d` | Last 7 days |
| `older_than:1y` | Older than 1 year |
| `from:user@example.com` | From sender |
| `subject:invoice` | Subject contains |
| `has:attachment` | Has attachments |
| `filename:pdf` | Has PDF attachment |
| `is:unread` | Unread messages |
| `label:INBOX` | In label |

Combine with spaces (AND) or `OR`: `from:a@example.com OR from:b@example.com`

## Gmail

```bash
gog gmail thread <threadId> --download --out-dir ./
gog gmail send --to x@example.com --subject "Hi" --body "Text" --attach ./file.pdf
gog gmail batch modify <id1> <id2> --remove UNREAD --add "Label_123"

# Mark all from sender as read
ids=$(gog gmail search 'is:unread from:newsletter@example.com' --json | jq -r '.[].messages[].id' | tr '\n' ' ')
[ -n "$ids" ] && gog gmail batch modify $ids --remove UNREAD
```

## Calendar

```bash
# Today's events
gog calendar events primary \
  --from "$(date -u +%Y-%m-%dT00:00:00Z)" \
  --to "$(date -u +%Y-%m-%dT23:59:59Z)"

# Create with attendees
gog calendar create primary \
  --summary "Review" \
  --from 2025-01-15T14:00:00-05:00 \
  --to 2025-01-15T15:00:00-05:00 \
  --attendees "alice@example.com,bob@example.com" \
  --location "Room A"

# All-day event
gog calendar create primary --summary "Vacation" --from 2025-01-20 --to 2025-01-21 --all-day

# Check availability
gog calendar freebusy "primary,coworker@example.com" --from <RFC3339> --to <RFC3339>
```

## Drive

```bash
gog drive ls --parent <folderId>
gog drive download <fileId> --format pdf --out ./  # Export Google Docs
gog drive share <fileId> --email user@example.com --role reader

# Backup folder
for id in $(gog drive ls --parent <folderId> --json | jq -r '.[].id'); do
  gog drive download "$id" --out "./backup/"
done
```

## Sheets

```bash
gog sheets update <spreadsheetId> 'Sheet1!A1' --values '[["val1", "val2"]]'
gog sheets append <spreadsheetId> 'Sheet1' --values '[["new", "row"]]'
```

## Daily Digest

```bash
#!/bin/bash
set -euo pipefail

TODAY_START=$(date -u +%Y-%m-%dT00:00:00Z)
TODAY_END=$(date -u +%Y-%m-%dT23:59:59Z)

echo "CALENDAR"
echo "--------"
gog calendar events primary --from "$TODAY_START" --to "$TODAY_END" 2>/dev/null || echo "No events"
echo

echo "UNREAD"
echo "------"
gog gmail search 'is:unread newer_than:1d' --max 10 2>/dev/null || echo "None"
echo

echo "TASKS"
echo "-----"
gog tasks list <tasklistId> 2>/dev/null || echo "None"
```

## Auth

```bash
gog auth list                    # Check accounts
gog auth add you@gmail.com       # Re-authorize
```
