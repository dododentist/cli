/* Copyright 2025 DodoDentist LLC */
const commander = require('commander')
const {
  printJson,
  withJson,
  fail,
} = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveClinicId = require('./resolveClinicId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// Patient records are health data. Every command here reaches the real
// records of the authenticated organization — keep the scopes of the key
// driving it as narrow as the job allows, and never paste results anywhere
// they would leave the practice's control.
function patientsCommand() {
  const command = new commander.Command('patients')
  command.description(
    'manage the patients of your organization (patients:read / patients:write)',
  )

  withJson(
    command
      .command('list')
      .description('list patients (GET /api/patients)')
      .option('--clinicId <clinicId>', 'only patients of this clinic')
      .option('--email <email>', 'only patients with this exact email')
      .option('--userId <userId>', 'only patients linked to this user')
      .option('--_ids <ids>', 'comma-separated list of patient ids')
      .option('-n, --limit <limit>', 'max results (0 = no limit)')
      .option('--skip <skip>', 'skip the first N results')
      .option(
        '--sortField <sortField>',
        'name, lastEditTime or _id (anything else is ignored)',
      )
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default ASC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const patients = await api.get(
        `/api/patients${buildQuery({
          clinicId: options.clinicId,
          email: options.email,
          userId: options.userId,
          _ids: options._ids,
          limit: options.limit,
          skip: options.skip,
          sortField: options.sortField,
          sortDirection: options.sortDirection,
          fields: options.fields,
        })}`,
      )

      if (options.json) {
        printJson(patients)
        return
      }

      if (patients.length === 0) {
        console.log('No patients found')
        return
      }

      console.log(`Found ${patients.length} patient(s):`)
      patients.forEach((patient, index) => {
        const contact = [patient.email, patient.phone].filter(Boolean).join(' · ')
        console.log(
          `${index + 1}. ${patient.name || patient._id}` +
            `${contact ? ` — ${contact}` : ''} (${patient._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <patientId>')
      .description('raw JSON for one patient (GET /api/patients/:patientId)'),
  ).action(async (patientId, options) => {
    try {
      const patient = await api.get(`/api/patients/${patientId}`)
      printJson(patient)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <patientId>')
      .description('read one patient formatted for the terminal'),
  ).action(async (patientId, options) => {
    try {
      const patient = await api.get(`/api/patients/${patientId}`)

      if (options.json) {
        printJson(patient)
        return
      }

      if (!patient) {
        console.log('Patient not found')
        return
      }

      console.log()
      console.log(bold(patient.name || patient._id))
      console.log(dim(patient._id))
      console.log()
      if (patient.email) console.log(`${cyan('email')}  ${patient.email}`)
      if (patient.phone) console.log(`${cyan('phone')}  ${patient.phone}`)
      if (patient.language) {
        console.log(`${cyan('language')}  ${patient.language}`)
      }
      if (patient.dateOfBirth) {
        console.log(`${cyan('dateOfBirth')}  ${patient.dateOfBirth}`)
      }
      if (patient.clinicId) {
        console.log(`${cyan('clinicId')}  ${patient.clinicId}`)
      }
      if (patient.creationTime) {
        console.log(`${cyan('created')}  ${patient.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description(
        'create a patient (POST /api/patients, fires patient.created)',
      )
      .requiredOption('--name <name>', 'patient full name')
      .option(
        '--clinicId <clinicId>',
        'clinic the patient belongs to (required unless the key is locked to one clinic)',
      )
      .option('--email <email>', 'patient email')
      .option('--phone <phone>', 'patient phone number')
      .option('--language <language>', 'two-letter language code, e.g. en')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const patient = await api.post('/api/patients', {
        ...body,
        name: options.name,
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.language && { language: options.language }),
      })

      if (options.json) {
        printJson({ ok: true, id: patient._id })
        return
      }

      printJson(patient)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <patientId>')
      .description(
        'update a patient (PUT /api/patients/:patientId, fires patient.updated)',
      )
      .option('--name <name>', 'patient full name')
      .option('--email <email>', 'patient email')
      .option('--phone <phone>', 'patient phone number')
      .option('--language <language>', 'two-letter language code, e.g. en')
      .option('--clinicId <clinicId>', 'clinic the patient belongs to')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async (patientId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/patients/${patientId}`),
      )
      const patient = await api.put(`/api/patients/${patientId}`, {
        ...body,
        // The API writes whatever _id the body carries — the path parameter is
        // only used for the ownership check — so send it explicitly.
        _id: patientId,
        ...(clinicId && { clinicId }),
        ...(options.name && { name: options.name }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.language && { language: options.language }),
      })

      if (options.json) {
        printJson({ ok: true, id: patient._id })
        return
      }

      printJson(patient)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <patientId...>')
      .description(
        'delete one or more patients by id (DELETE /api/patients/:patientId,' +
          ' fires patient.deleted)',
      ),
  ).action(async (patientIds, options) => {
    const deleted = []

    for (let index = 0; index < patientIds.length; index += 1) {
      const patientId = patientIds[index]

      try {
        await api.del(`/api/patients/${patientId}`)
        deleted.push(patientId)

        if (!options.json) {
          console.log(`deleted ${patientId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({ ok: deleted.length === patientIds.length, deleted })
    }
  })

  return command
}

module.exports = patientsCommand
