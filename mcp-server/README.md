# mcp-server

This is a Model Context Protocol (MCP) server, built from scratch, one small piece at a time.
It currently offers two tools (`calculate_affordability`, `read_property_document`), one resource
(`keysy://buyers/{buyer_id}/favorites`), and one prompt (`draft-property-share-message`).

## Before you start (one-time check)

This project needs Node.js already installed on your computer. To check, open a terminal in this
`mcp-server` folder and type:

```
node --version
```

If you see something like `v20.x.x` or higher, you're fine. If you get an error saying `node` is
not recognized, stop here and let me know — that means Node.js needs to be installed first, and
that's outside what this folder alone can fix.

## Step 1 — install (do this once)

In a terminal, inside this `mcp-server` folder, type:

```
npm install
```

Wait for it to finish. You'll see a line like `added 114 packages...`. You only need to do this
once (or again later if new pieces get added to the project).

## Step 2 — start the server (do this every time you want to run it)

```
npm start
```

## What you should see

Exactly this, in order:

```
> mcp-server@0.1.0 start
> ts-node --transpile-only src/server.ts

mcp-server is running and waiting for a client to connect. Press Ctrl+C to stop.
```

The first two lines are just npm telling you which command it's running — that's normal, not an
error. The important line is the last one: **"mcp-server is running and waiting for a client to
connect."** That means it worked.

## This is supposed to look like it's "stuck"

After that last line prints, the terminal will stop showing a blinking cursor prompt and just sit
there. **This is correct, not a freeze.** An MCP server is meant to stay running in the background,
waiting for something (later: the MCP Inspector, or an AI app like Claude) to connect to it. As
long as you see the "running and waiting" line, it's working exactly as intended.

## How to stop it

Click into that terminal window and press `Ctrl+C`. That shuts the server down cleanly.

## If something goes wrong

If instead of the message above you see a red error message, stop and show it to me rather than
trying to fix it yourself — I'll need to see the exact text to know what happened.

## What this server assumes

Every piece of software leans on things it expects to already be true. Here's everything this one
leans on, so nothing about it is a surprise later.

### Files and folders that must already exist

- **`node_modules/` inside this `mcp-server` folder** — created by running `npm install` (Step 1).
  Nothing here works before that: not `npm start`, not the Inspector, nothing.
- **`package.json` and `tsconfig.json`**, sitting right next to `src/`. `npm start` reads
  `package.json` to know what command "start" even means, and the server's own startup command
  reads `tsconfig.json` to know how to turn the TypeScript source into something Node can run.
- **Every file under `src/`** — `server.ts`, and everything it pulls in
  (`tools/calculateAffordability.ts`, `resources/favorites.ts`,
  `prompts/draftPropertyShareMessage.ts`, `data/stubListings.ts`). The server doesn't ship as one
  pre-built file — it's recompiled from these source files fresh every single time it starts, so
  if any one of them goes missing or gets renamed, the server won't start at all.
- **You must run every command from inside the `mcp-server` folder itself**, not from the main
  project folder one level up. Both `npm start` and the Inspector commands only know how to find
  things relative to `mcp-server`.

### Environment variables or keys it needs

- **None.** This server doesn't read any secrets, API keys, or configuration from your computer's
  environment. Every number and property it works with is either typed in when you call it, or
  built into the code itself (see below).

### What it holds on to between calls, and what happens on restart

- The list of properties (`p-1`, `p-2`, `p-3`) and which buyer favorited which
  (`buyer-1`, `buyer-2`) are typed directly into `src/data/stubListings.ts` — not stored in a
  database or a file that gets updated. **Every time the server restarts, it comes back with
  exactly that same starting data — nothing you did in a previous run carries forward,** because
  there's nowhere for it to be remembered. This is fine for practicing, but for real MLS data or a
  real buyer account, this in-memory approach would need to be replaced with an actual database
  (the way the main Keysy backend already does for scheduling tours).
- The affordability calculator holds on to nothing at all between calls — every call is a fresh,
  self-contained calculation from whatever numbers you give it that time.

### What it writes to, and whether that's safe to run twice

- **Nothing.** As it stands right now, this server never writes to a file, a database, or anywhere
  else. The favorites resource only reads the built-in list; the affordability tool only computes
  and returns a number; the share-message prompt only reads a property and hands back instruction
  text; `read_property_document` only reads a file under `property-documents/`. Because nothing is
  written anywhere, calling any tool — once, twice, or a hundred times in a row — always produces
  the same outcome. There is no "duplicate" to worry about yet, precisely because there's no real
  persistence yet either.

## Security: filesystem roots enforcement

`read_property_document` is the one tool here that touches the filesystem, so it's the one tool
that needs a filesystem access boundary. That boundary is `assertPathWithinDeclaredRoots` in
`src/security/pathRootsGuard.ts`. On every call it:

1. Asks the connected client which filesystem roots it declared (`roots/list`) — not a hardcoded
   directory list. If the client didn't declare the roots capability, refused to answer, or
   declared zero roots, every path is denied.
2. Resolves the candidate file path with `fs.realpath`, which collapses `../` segments and
   dereferences symlinks in one step, and does the same to every declared root (a root can itself
   be a symlink).
3. Only compares the two *resolved* paths. A plain string-prefix check on the raw path is not
   used and would not be safe — see the comment at the top of `pathRootsGuard.ts` for why.

Any denial returns a normal tool error result (never an uncaught throw) and emits an MCP
`warning`-level log notification tagged with the stable event name `roots_access_denied`, the
requested path, and the reason.

### Testing it in the Inspector

Start the Inspector (`npx @modelcontextprotocol/inspector --config inspector.config.json --server
mcp-server`), then, before calling any tool, open the **Roots** panel and add exactly one root:
this repo's `mcp-server/property-documents` folder. Then call `read_property_document` with a
`property_id` of `p-1` and try, one at a time:

- `document_name: "disclosure.txt"` — expect success (this is the intended path).
- `document_name: "../p-2/inspection-report.txt"` — a `..` that stays inside the declared root;
  expect success, since the resolved path is still under `property-documents`.
- `document_name: "../../../../../../etc/passwd"` (or, on Windows, `"../../../../../../Windows/System32/drivers/etc/hosts"`) —
  a `..` traversal out of the declared root; expect denial, an Inspector-visible `warning` log
  notification named `roots_access_denied`, and no file contents in the response.
- A symlink placed inside `property-documents/p-1/` that points somewhere outside it (create with
  `ln -s /etc/passwd property-documents/p-1/escape.txt` on macOS/Linux, or
  `mklink property-documents\p-1\escape.txt C:\Windows\System32\drivers\etc\hosts` from an
  elevated prompt on Windows), then call with `document_name: "escape.txt"` — expect denial for
  the same reason: `fs.realpath` dereferences the symlink before the comparison runs, so the
  *target*, not the raw file name, is what gets checked against the root.
- Remove the root in the Inspector's Roots panel entirely (or never add one) and retry
  `document_name: "disclosure.txt"` — expect denial even for a legitimate, in-bounds file, since
  the guard fails closed when it has nothing to compare against.
