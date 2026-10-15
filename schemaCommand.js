/* Copyright 2025 DodoDentist LLC */
import schemaCommand from '@monorepool/agentfirst/schemaCommand.js'

// `dododentist schema` — the whole command tree as JSON, so an agent can
// discover what the CLI can do without scraping --help text. index.js passes
// the fully-assembled commander program (after every addCommand), so the
// schema describes the CLI exactly as it runs, `schema` included.
export default program => schemaCommand({ program })
