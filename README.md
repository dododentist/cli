# dododentist

Command-line interface for [DodoDentist](https://www.dododentist.com/) —
manage the clinics, patients, appointments, treatments, invoices and payments
of your dental practice from the terminal.

```bash
npm install -g dododentist
dododentist --help
```

or run it without installing:

```bash
npx dododentist --help
```

Requires Node.js 18 or newer.

## Create an account

No account yet? The CLI can create one — no browser needed. The generated
password is printed exactly once, the organization's first clinic is created
along with the account, and the session is stored so every other command works
immediately:

```bash
dododentist signup --email dentist@example.com
dododentist signup --email dentist@example.com --json      # machine-readable
dododentist signup --email dentist@example.com --password 'your own password'
```

`--first-name` and `--last-name` are optional; they default to whatever the
email address suggests.

## Log in

Three ways in, all stored in `~/.dododentist/`:

```bash
dododentist login               # interactive: choose browser, another device or API key
dododentist login --browser     # opens app.dododentist.com to authorize
dododentist login --device      # approve from a phone or another computer
dododentist login --with-key    # masked prompt for an API key secret
dododentist logout              # clears the stored session and any stored key
```

**Browser** stores a session that refreshes itself. **API key** stores a
long-lived secret. Create keys in the DodoDentist web app: they belong to your
organization, can be locked to a single clinic, and start with read-only
scopes that an administrator widens explicitly.

**Another device** (`dododentist login --device`) is for a terminal whose
browser you cannot use: a remote desktop without copy and paste, an SSH session,
a server. It prints a link, a QR code and a one-time code: open the link on your
phone or on any computer where you are signed in to DodoDentist, check that the
code matches and approve. The terminal then stores a session of its own, as
`--browser` does. The code works once and expires after ten minutes.

The key secret is never accepted as a command argument — argv lands in shell
history and in every `ps` listing. Prompt or environment variable only.

### Headless and CI

Export the key instead of logging in:

```bash
export DODODENTIST_API_KEY=<key secret>
dododentist clinics list --json
```

Credential precedence is: stored browser session → stored API key →
`DODODENTIST_API_KEY`. A stored login therefore always wins over a key
exported globally in your shell.

Without a terminal and without credentials, commands fail immediately with
exit code 1 and instructions on stderr. Nothing ever opens a browser
headlessly or waits on a prompt nobody is there to answer.

## Commands

Every resource follows the same shape: `list` (filtered summary), `get <id>`
(raw JSON), `read <id>` (formatted for a terminal), and — where the API and
your key's scopes allow it — `add`, `update <id>` and `delete <id...>`.

### Clinics — read-only

```bash
dododentist clinics list
dododentist clinics get <clinicId>
dododentist clinics read <clinicId>
```

Requires `clinics:read`. There is no `clinics:write` scope, so clinics cannot
be created or edited through the API.

### Patients

```bash
dododentist patients list --clinicId <id> -n 25
dododentist patients list --email patient@example.com
dododentist patients list --clinicId <id> --fields name,email,phone
dododentist patients list --_ids <id1>,<id2>
dododentist patients get <patientId>
dododentist patients read <patientId>
dododentist patients add --clinicId <id> --name "Ada Lovelace" --email ada@example.com
dododentist patients update <patientId> --phone "+15555550111"
dododentist patients delete <patientId> [<patientId> …]
```

`list` also takes `--userId`, `--skip`, `--sortField` (`name`, `lastEditTime`
or `_id`) and `--sortDirection` (`ASC`/`DESC`). `add` and `update` take
`--name`, `--email`, `--phone`, `--language`, `--clinicId` and `--body` for
any other field. Requires `patients:read` / `patients:write`.

### Appointments

```bash
dododentist appointments list --clinicId <id> \
  --startTime 2026-09-01T00:00:00.000Z --endTime 2026-09-08T00:00:00.000Z
dododentist appointments list --patientId <id> --sortField startTime --sortDirection ASC
dododentist appointments get <appointmentId>
dododentist appointments read <appointmentId>
dododentist appointments add --clinicId <id> --patientId <id> \
  --startTime 2026-09-01T09:00:00.000Z --endTime 2026-09-01T09:30:00.000Z
dododentist appointments update <appointmentId> --status CANCELED
dododentist appointments delete <appointmentId> [<appointmentId> …]
```

Times are ISO 8601 instants: `--startTime` matches appointments starting at or
after it, `--endTime` those ending strictly before it. Statuses are
`REQUESTED`, `SCHEDULED` (the default), `PATIENT_ARRIVED`, `NO_SHOW` and
`CANCELED`. `list` also takes `--limit`, `--skip`, `--fields` and
`--sortField` (`_id`, `startTime`, `endTime`, `lastEditTime`). Requires
`appointments:read` / `appointments:write`.

### Treatments — read-only

```bash
dododentist treatments list --patientId <id>
dododentist treatments list --clinicId <id> --startTime 2026-01-01T00:00:00.000Z
dododentist treatments get <treatmentId>
dododentist treatments read <treatmentId>
```

Requires `treatments:read`. There is no `treatments:write` scope.

### Invoices

```bash
dododentist invoices list --patientId <id>
dododentist invoices get <invoiceId>
dododentist invoices read <invoiceId>
dododentist invoices add --clinicId <id> --patientId <id> --status DRAFT \
  --body '{"lines":[{"name":"Cleaning","price":80,"quantity":1}]}'
dododentist invoices update <invoiceId> --status PAID
dododentist invoices delete <invoiceId> [<invoiceId> …]
```

Statuses are `DRAFT`, `PENDING`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`,
`REFUNDED` and `UNCOLLECTIBLE`. An invoice's value lives in `lines` (or the
legacy `procedures`), which are set through `--body`. Requires
`invoices:read` / `invoices:write`.

### Payments

```bash
dododentist payments list --clinicId <id> --startTime 2026-08-01T00:00:00.000Z
dododentist payments get <paymentId>
dododentist payments read <paymentId>
dododentist payments add --clinicId <id> --patientId <id> --amount 120
dododentist payments update <paymentId> --note "paid in cash"
dododentist payments delete <paymentId> [<paymentId> …]
```

A payment carries its value in `lines`, the legacy `procedures`, or a flat
`--amount`. A manually recorded payment has no status; `SUCCEEDED`, `FAILED`
and `CANCELED` come from the card-terminal flow. Requires `payments:read` /
`payments:write`.

### Agent skills

```bash
dododentist skills list           # the guides bundled with this version
dododentist skills get dododentist
```

## Writes need a clinic

Every create and update resolves its clinic from `--clinicId`, or from the
clinic a clinic-scoped key is locked to. `update` falls back to the clinic of
the record being edited. Without any of those the API answers
`missing clinicId`.

## Output contract

Every data subcommand accepts `--json`, which prints real, parseable JSON to
stdout — no colors, no ANSI escapes. Without it, output is formatted for
humans. Mutations with `--json` print a small result object such as
`{ "ok": true, "id": "…" }`.

Errors always go to **stderr** with **exit code 1**. In `--json` mode the
error is one JSON line, so stdout stays parseable:

```json
{ "error": { "message": "…", "status": 401 } }
```

`schema` prints the whole command tree — every option, argument and
subcommand — as JSON, so a script or an agent can discover what the CLI does
without scraping `--help`:

```bash
dododentist schema
dododentist schema patients list
```

## Usage with AI agents

DodoDentist publishes [Agent Skills](https://agentskills.io) that teach coding
agents how to drive this CLI:

```bash
npx skills add dododentist/skills
```

That works with Claude Code, Cursor, Codex, Gemini CLI, GitHub Copilot,
OpenCode and any other agent following the Skills standard. The same guides
ship inside this package, version-matched to the commands it exposes, and
`dododentist skills get <name>` prints one on demand.

Practice records are health data. Give each integration its own key with the
narrowest scopes it can work with, prefer a clinic-scoped key, and delete a key
the moment the integration is retired.

## Environment variables

| Variable              | Purpose                                                         |
| --------------------- | --------------------------------------------------------------- |
| `DODODENTIST_API_KEY` | API key secret used when no login is stored                     |
| `DODODENTIST_API_URL` | Override the API endpoint (only for non-production deployments) |

## License

[Apache-2.0](LICENSE)
