/* Copyright 2025 DodoDentist LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const api = require('./request.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// Clinics are read-only over the public API: `clinics:read` is the only clinic
// scope dododentist/api/handlers/scopes.js defines, and the create/update/
// delete routes are operator-session only. There is deliberately no
// `clinics add`.
function clinicsCommand() {
  const command = new commander.Command('clinics')
  command.description(
    'read the clinics of your organization (clinics:read, read-only)',
  )

  withJson(
    command
      .command('list')
      .description('list the clinics your credential can reach (GET /api/clinics)'),
  ).action(async options => {
    try {
      const clinics = await api.get('/api/clinics')

      if (options.json) {
        printJson(clinics)
        return
      }

      if (clinics.length === 0) {
        console.log('No clinics found')
        return
      }

      console.log(`Found ${clinics.length} clinic(s):`)
      clinics.forEach((clinic, index) => {
        const details = [clinic.city, clinic.country].filter(Boolean).join(', ')
        console.log(
          `${index + 1}. ${clinic.name || clinic._id}` +
            `${details ? ` — ${details}` : ''} (${clinic._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <clinicId>')
      .description('raw JSON for one clinic (GET /api/clinics/:clinicId)'),
  ).action(async (clinicId, options) => {
    try {
      const clinic = await api.get(`/api/clinics/${clinicId}`)
      printJson(clinic)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <clinicId>')
      .description('read one clinic formatted for the terminal'),
  ).action(async (clinicId, options) => {
    try {
      const clinic = await api.get(`/api/clinics/${clinicId}`)

      if (options.json) {
        printJson(clinic)
        return
      }

      if (!clinic) {
        console.log('Clinic not found')
        return
      }

      console.log()
      console.log(bold(clinic.name || clinic._id))
      console.log(dim(clinic._id))
      console.log()
      if (clinic.email) console.log(`${cyan('email')}  ${clinic.email}`)
      if (clinic.phone) console.log(`${cyan('phone')}  ${clinic.phone}`)
      if (clinic.address) console.log(`${cyan('address')}  ${clinic.address}`)
      if (clinic.city) console.log(`${cyan('city')}  ${clinic.city}`)
      if (clinic.country) console.log(`${cyan('country')}  ${clinic.country}`)
      if (clinic.currency) console.log(`${cyan('currency')}  ${clinic.currency}`)
      if (clinic.timezone) console.log(`${cyan('timezone')}  ${clinic.timezone}`)
      if (clinic.creationTime) {
        console.log(`${cyan('created')}  ${clinic.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  return command
}

module.exports = clinicsCommand
