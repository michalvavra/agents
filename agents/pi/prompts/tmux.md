---
description: Use tmux panes and windows for logs, builds, and parallel tasks
---

# Tmux Usage

## Task

$@

## Detection

```bash
# Check if inside tmux (empty = not in tmux)
echo $TMUX

# Current session/window info
tmux display-message -p '#S:#I.#P'
```

## Read Output from Other Panes

```bash
# Capture last 100 lines from pane 1
tmux capture-pane -t :.1 -p -S -100

# Capture entire scrollback
tmux capture-pane -t :.1 -p -S -
```

## Run Commands in Other Panes

```bash
# Send command to pane 1
tmux send-keys -t :.1 'npm run dev' Enter

# Create pane and run command
tmux split-window -v 'tail -f logs/app.log'
```

## Pane Targeting

| Target | Meaning |
|--------|---------|
| `:.1` | Pane 1 in current window |
| `:0.1` | Pane 1 in window 0 |
| `{last}` | Last active pane |

## Common Patterns

| Task | Command |
|------|---------|
| Watch logs | `tmux split-window -h 'tail -f app.log'` |
| Check build output | `tmux capture-pane -t :.1 -p -S -50` |
| Start dev server | `tmux send-keys -t :.1 'npm run dev' Enter` |
| Kill pane | `tmux kill-pane -t :.1` |
| List panes | `tmux list-panes -a -F '#{window_name}.#{pane_index}: #{pane_current_command}'` |
