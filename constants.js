/* Copyright 2025 DodoDentist LLC */

// The per-product configuration every @monorepool/agentfirst factory needs.
//
// DODODENTIST_API_KEY is read from the environment at request time; a stored
// login (browser session or pasted key) always wins over it, so a globally
// exported key cannot silently hijack an interactive session.
module.exports = {
  binaryName: 'dododentist',
  appUrl: 'https://app.dododentist.com',
  envKeyName: 'DODODENTIST_API_KEY',
}
