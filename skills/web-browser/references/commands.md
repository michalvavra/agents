# Agent Browser Commands

## Core Actions

```bash
agent-browser open <url>
agent-browser click <sel>
agent-browser dblclick <sel>
agent-browser focus <sel>
agent-browser type <sel> <text>
agent-browser fill <sel> <text>
agent-browser press <key>
agent-browser keydown <key>
agent-browser keyup <key>
agent-browser hover <sel>
agent-browser select <sel> <val>
agent-browser check <sel>
agent-browser uncheck <sel>
agent-browser scroll <dir> [px]
agent-browser scrollintoview <sel>
agent-browser drag <src> <tgt>
agent-browser upload <sel> <files>
agent-browser screenshot [path]
agent-browser pdf <path>
agent-browser snapshot
agent-browser eval <js>
agent-browser close
```

## Get Info

```bash
agent-browser get text <sel>
agent-browser get html <sel>
agent-browser get value <sel>
agent-browser get attr <sel> <attr>
agent-browser get title
agent-browser get url
agent-browser get count <sel>
agent-browser get box <sel>
```

## State Checks

```bash
agent-browser is visible <sel>
agent-browser is enabled <sel>
agent-browser is checked <sel>
```

## Find Elements

```bash
agent-browser find role <role> <action> [value]
agent-browser find text <text> <action>
agent-browser find label <label> <action> [value]
agent-browser find placeholder <ph> <action> [value]
agent-browser find alt <text> <action>
agent-browser find title <text> <action>
agent-browser find testid <id> <action> [value]
agent-browser find first <sel> <action> [value]
agent-browser find last <sel> <action> [value]
agent-browser find nth <n> <sel> <action> [value]
```

Actions: `click`, `fill`, `check`, `hover`, `text`.

## Wait

```bash
agent-browser wait <selector>
agent-browser wait <ms>
agent-browser wait --text "Welcome"
agent-browser wait --url "**/dash"
agent-browser wait --load networkidle
agent-browser wait --fn "window.ready === true"
```

## Snapshot Options

```bash
agent-browser snapshot -i
agent-browser snapshot -c
agent-browser snapshot -d 3
agent-browser snapshot -s "#main"
```

## Browser Settings

```bash
agent-browser set viewport <w> <h>
agent-browser set device <name>
agent-browser set geo <lat> <lng>
agent-browser set offline [on|off]
agent-browser set headers <json>
agent-browser set credentials <user> <pass>
agent-browser set media [dark|light]
```

## Cookies and Storage

```bash
agent-browser cookies
agent-browser cookies set <name> <val>
agent-browser cookies clear
agent-browser storage local
agent-browser storage local <key>
agent-browser storage local set <key> <val>
agent-browser storage local clear
agent-browser storage session
agent-browser storage session <key>
agent-browser storage session set <key> <val>
agent-browser storage session clear
```

## Network

```bash
agent-browser network route <url>
agent-browser network route <url> --abort
agent-browser network route <url> --body <json>
agent-browser network unroute [url]
agent-browser network requests
agent-browser network requests --filter <pattern>
```

## Tabs, Frames, Dialogs

```bash
agent-browser tab
agent-browser tab new [url]
agent-browser tab <n>
agent-browser tab close [n]
agent-browser window new
agent-browser frame <sel>
agent-browser frame main
agent-browser dialog accept [text]
agent-browser dialog dismiss
```

## Debug

```bash
agent-browser trace start [path]
agent-browser trace stop [path]
agent-browser console
agent-browser console --clear
agent-browser errors
agent-browser errors --clear
agent-browser highlight <sel>
agent-browser state save <path>
agent-browser state load <path>
```

## Options

```bash
agent-browser --session <name>
agent-browser --json
agent-browser --full
agent-browser --name <locator>
agent-browser --exact
agent-browser --headed
agent-browser --debug
```
