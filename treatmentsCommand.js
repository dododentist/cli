/* Copyright 2025 DodoDentist LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const api = require('./request.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// Treatments are read-only over the public API: `treatments:read` is the only
// treatment scope dododentist/api/handlers/scopes.js defines, and the
// create/update/delete routes are operator-session only. There is deliberately
// no `treatments add`.
function treatmentsCommand() {
  const command = new commander.Command('treatments')
  command.description(
    'read the treatments recorded by your organization (treatments:read, read-only)',
  )

  withJson(
    command
      .command('list')
      .description('list treatments (GET /api/treatments)')
      .option('--clinicId <clinicId>', 'only treatments of this clinic')
      .option('--patientId <patientId>', 'only treatments of this patient')
      .option(
        '--startTime <startTime>',
        'only treatments starting at or after this ISO 8601 instant',
      )
      .option(
        '--endTime <endTime>',
        'only treatments ending before this ISO 8601 instant',
      )
      .option('-n, --limit <limit>', 'max results (0 = no limit)')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. startTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const treatments = await api.get(
        `/api/treatments${buildQuery({
          clinicId: options.clinicId,
          patientId: options.patientId,
          startTime: options.startTime,
          endTime: options.endTime,
          limit: options.limit,
          skip: options.skip,
          sortField: options.sortField,
          sortDirection: options.sortDirection,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(treatments)
        return
      }

      if (treatments.length === 0) {
        console.log('No treatments found')
        return
      }

      console.log(`Found ${treatments.length} treatment(s):`)
      treatments.forEach((treatment, index) => {
        const details = [
          treatment.startTime,
          treatment.status,
          treatment.patientId ? `patient ${treatment.patientId}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        console.log(`${index + 1}. ${details} (${treatment._id})`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <treatmentId>')
      .description(
        'raw JSON for one treatment (GET /api/treatments/:treatmentId)',
      ),
  ).action(async (treatmentId, options) => {
    try {
      const treatment = await api.get(`/api/treatments/${treatmentId}`)
      printJson(treatment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <treatmentId>')
      .description('read one treatment formatted for the terminal'),
  ).action(async (treatmentId, options) => {
    try {
      const treatment = await api.get(`/api/treatments/${treatmentId}`)

      if (options.json) {
        printJson(treatment)
        return
      }

      if (!treatment) {
        console.log('Treatment not found')
        return
      }

      console.log()
      console.log(bold(`Treatment ${treatment._id}`))
      console.log(dim(treatment._id))
      console.log()
      if (treatment.status) {
        console.log(`${cyan('status')}  ${treatment.status}`)
      }
      if (treatment.startTime) {
        console.log(`${cyan('start')}  ${treatment.startTime}`)
      }
      if (treatment.endTime) {
        console.log(`${cyan('end')}  ${treatment.endTime}`)
      }
      if (treatment.patientId) {
        console.log(`${cyan('patientId')}  ${treatment.patientId}`)
      }
      if (treatment.clinicId) {
        console.log(`${cyan('clinicId')}  ${treatment.clinicId}`)
      }
      if (treatment.creationTime) {
        console.log(`${cyan('created')}  ${treatment.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  return command
}

module.exports = treatmentsCommand
