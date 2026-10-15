#!/usr/bin/env node
/* Copyright 2025 DodoDentist LLC */

import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

import skillsCommand from '@monorepool/agentfirst/skillsCommand.js'
import { program } from 'commander'

import appointmentsCommand from './appointmentsCommand.js'
import clinicsCommand from './clinicsCommand.js'
import invoicesCommand from './invoicesCommand.js'
import loginCommand from './loginCommand.js'
import logoutCommand from './logoutCommand.js'
import packageJson from './package.json' with { type: 'json' }
import patientsCommand from './patientsCommand.js'
import paymentsCommand from './paymentsCommand.js'
import schemaCommand from './schemaCommand.js'
import signupCommand from './signupCommand.js'
import treatmentsCommand from './treatmentsCommand.js'

const cliDirectory = fileURLToPath(new URL('.', import.meta.url))

function isDirectRun() {
  return Boolean(
    process.argv[1] &&
    existsSync(process.argv[1]) &&
    import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href,
  )
}

program
  .name('dododentist')
  .description(
    'dododentist cli — manage the patients, appointments, treatments,' +
      ' invoices and payments of your dental clinic from the terminal',
  )
  .version(packageJson.version)
  .addCommand(signupCommand())
  .addCommand(loginCommand())
  .addCommand(logoutCommand())
  .addCommand(clinicsCommand())
  .addCommand(patientsCommand())
  .addCommand(appointmentsCommand())
  .addCommand(treatmentsCommand())
  .addCommand(invoicesCommand())
  .addCommand(paymentsCommand())
  // baseDirectory must be this file's directory: the shared factory resolves
  // the bundled skills/ relative to it (dist/index.js → ../skills).
  .addCommand(skillsCommand({ baseDirectory: cliDirectory }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
if (isDirectRun()) program.parse(process.argv)

export default program
