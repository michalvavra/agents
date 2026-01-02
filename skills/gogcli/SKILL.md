---
name: gogcli
description: Interact with Google services (Gmail, Calendar, Drive, Contacts, Tasks, Sheets) via CLI. Use when reading/sending email, managing calendar events, uploading/downloading files, or automating Google Workspace tasks.
compatibility: Requires gog CLI (github.com/steipete/gogcli) with authenticated account.
---

# gogcli

CLI for Gmail, Calendar, Drive, Contacts, Tasks, and Sheets. Uses [steipete/gogcli](https://github.com/steipete/gogcli) via the `gog` command.

## TL;DR

- Set `GOG_ACCOUNT=you@gmail.com` in `.zshrc` for persistence
- Use `--json` for parseable output
- Gmail search uses Gmail query syntax (`newer_than:7d`, `from:`, `subject:`)
- Calendar times require RFC3339 format with timezone

## Account Setup

Add to `.zshrc` or `.bashrc`:

```bash
export GOG_ACCOUNT=you@gmail.com
```

Or use `--account` flag per command.

## Output Modes

| Flag | Use Case |
|------|----------|
| (default) | Human-readable tables |
| `--json` | Scripting, parsing with jq |
| `--plain` | TSV for piping to awk/cut |

## Command Reference

### Gmail

```bash
gog gmail search 'newer_than:1d'                    # Search
gog gmail search 'from:x@example.com subject:urgent'
gog gmail thread <threadId>                          # Read thread
gog gmail thread <threadId> --download --out-dir ./  # Download attachments
gog gmail send --to x@example.com --subject "Hi" --body "Text"
gog gmail send --to x@example.com --subject "Hi" --body "Text" --attach ./file.pdf
gog gmail labels list                                # List labels
gog gmail batch modify <id1> <id2> --remove UNREAD   # Batch operations
```

### Calendar

```bash
gog calendar calendars                               # List calendars
gog calendar events primary --from <RFC3339> --to <RFC3339>
gog calendar events --all --from <RFC3339> --to <RFC3339>
gog calendar create primary --summary "Meeting" --from <RFC3339> --to <RFC3339>
gog calendar create primary --summary "Vacation" --from 2025-01-20 --to 2025-01-21 --all-day
gog calendar freebusy "primary,coworker@example.com" --from <RFC3339> --to <RFC3339>
gog calendar respond <calendarId> <eventId> --status accepted
```

### Drive

```bash
gog drive ls                                         # List files
gog drive ls --parent <folderId>
gog drive search "quarterly report"
gog drive upload ./file.pdf --parent <folderId>
gog drive download <fileId> --out ./file.pdf
gog drive download <fileId> --format pdf --out ./    # Export Google Docs
gog drive mkdir "Folder Name"
gog drive share <fileId> --email user@example.com --role reader
```

### Tasks

```bash
gog tasks lists                                      # List task lists
gog tasks list <tasklistId>                          # List tasks
gog tasks add <tasklistId> --title "Task" --due <RFC3339>
gog tasks done <tasklistId> <taskId>
gog tasks clear <tasklistId>                         # Clear completed
```

### Contacts

```bash
gog contacts list
gog contacts search "John"
gog contacts create --given "John" --family "Doe" --email "john@example.com"
gog contacts directory search "Jane"                 # Workspace directory
```

### Sheets

```bash
gog sheets get <spreadsheetId> 'Sheet1!A1:B10'
gog sheets metadata <spreadsheetId>
gog sheets update <spreadsheetId> 'Sheet1!A1' --values '[["val1", "val2"]]'
gog sheets append <spreadsheetId> 'Sheet1' --values '[["new", "row"]]'
gog sheets export <spreadsheetId> --format xlsx --out ./sheet.xlsx
gog sheets create "My Spreadsheet"
```

## Gmail Query Syntax

| Query | Meaning |
|-------|---------|
| `newer_than:7d` | Last 7 days |
| `older_than:1y` | Older than 1 year |
| `from:user@example.com` | From specific sender |
| `subject:invoice` | Subject contains "invoice" |
| `has:attachment` | Has attachments |
| `filename:pdf` | Has PDF attachment |
| `is:unread` | Unread messages |
| `label:INBOX` | In specific label |

Combine with spaces (AND) or `OR`: `from:a@example.com OR from:b@example.com`

## Errors

If authentication fails:

```bash
gog auth list                    # Check configured accounts
gog auth add you@gmail.com       # Re-authorize
gog auth add you@gmail.com --services gmail,calendar,drive --force-consent
```

## Examples

See [references/examples.md](references/examples.md) for detailed examples including:
- Batch Gmail operations
- Scheduling with availability check
- Attachment downloads
- Drive folder management
- Common workflow scripts
