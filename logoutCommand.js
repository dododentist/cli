/* Copyright 2025 DodoDentist LLC */
const logoutCommand = require('@monorepool/agentfirst/logoutCommand.js')
const session = require('./session.js')
const { binaryName, envKeyName } = require('./constants.js')

// Clears everything stored in ~/.dododentist/ — the API key secret and any
// browser-login tokens. A key exported as DODODENTIST_API_KEY stays in effect;
// the shared factory says so instead of silently staying authenticated.
module.exports = () => logoutCommand({ binaryName, session, envKeyName })
