/* Copyright 2025 DodoDentist LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import * as commander from 'commander'

import buildQuery from './buildQuery.js'
import { bold, cyan, dim } from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveClinicId from './resolveClinicId.js'

function appointmentsCommand() {
  const command = new commander.Command('appointments')
  command.description(
    'manage the appointments of your organization' +
      ' (appointments:read / appointments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list appointments (GET /api/appointments)')
      .option('--clinicId <clinicId>', 'only appointments of this clinic')
      .option('--patientId <patientId>', 'only appointments of this patient')
      .option(
        '--startTime <startTime>',
        'only appointments starting at or after this ISO 8601 instant',
      )
      .option(
        '--endTime <endTime>',
        'only appointments ending before this ISO 8601 instant',
      )
      .option('-n, --limit <limit>', 'max results (0 = no limit)')
      .option('--skip <skip>', 'skip the first N results')
      .option(
        '--sortField <sortField>',
        '_id, startTime, endTime or lastEditTime (anything else is ignored)',
      )
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const appointments = await api.get(
        `/api/appointments${buildQuery({
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
        printJson(appointments)
        return
      }

      if (appointments.length === 0) {
        console.log('No appointments found')
        return
      }

      console.log(`Found ${appointments.length} appointment(s):`)
      appointments.forEach((appointment, index) => {
        const details = [
          appointment.startTime,
          appointment.status,
          appointment.patientId ? `patient ${appointment.patientId}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        console.log(`${index + 1}. ${details} (${appointment._id})`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <appointmentId>')
      .description(
        'raw JSON for one appointment (GET /api/appointments/:appointmentId)',
      ),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <appointmentId>')
      .description('read one appointment formatted for the terminal'),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)

      if (options.json) {
        printJson(appointment)
        return
      }

      if (!appointment) {
        console.log('Appointment not found')
        return
      }

      console.log()
      console.log(bold(`Appointment ${appointment._id}`))
      console.log(dim(appointment._id))
      console.log()
      if (appointment.status) {
        console.log(`${cyan('status')}  ${appointment.status}`)
      }
      if (appointment.startTime) {
        console.log(`${cyan('start')}  ${appointment.startTime}`)
      }
      if (appointment.endTime) {
        console.log(`${cyan('end')}  ${appointment.endTime}`)
      }
      if (appointment.patientId) {
        console.log(`${cyan('patientId')}  ${appointment.patientId}`)
      }
      if (appointment.clinicId) {
        console.log(`${cyan('clinicId')}  ${appointment.clinicId}`)
      }
      if (appointment.note) {
        console.log(`${cyan('note')}  ${appointment.note}`)
      }
      if (appointment.creationTime) {
        console.log(`${cyan('created')}  ${appointment.creationTime}`)
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
        'book an appointment (POST /api/appointments,' +
          ' fires appointment.created)',
      )
      .requiredOption(
        '--startTime <startTime>',
        'ISO 8601 start instant, e.g. 2026-09-01T09:00:00.000Z',
      )
      .option('--endTime <endTime>', 'ISO 8601 end instant')
      .option(
        '--clinicId <clinicId>',
        'clinic the appointment belongs to (required unless the key is locked to one clinic)',
      )
      .option('--patientId <patientId>', 'patient the appointment is for')
      .option(
        '--status <status>',
        'REQUESTED, SCHEDULED, PATIENT_ARRIVED, NO_SHOW or CANCELED (default SCHEDULED)',
      )
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const appointment = await api.post('/api/appointments', {
        ...body,
        startTime: options.startTime,
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.status && { status: options.status }),
        ...(options.note && { note: options.note }),
      })

      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }

      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <appointmentId>')
      .description(
        'reschedule or edit an appointment' +
          ' (PUT /api/appointments/:appointmentId, fires appointment.updated)',
      )
      .option('--startTime <startTime>', 'ISO 8601 start instant')
      .option('--endTime <endTime>', 'ISO 8601 end instant')
      .option(
        '--status <status>',
        'REQUESTED, SCHEDULED, PATIENT_ARRIVED, NO_SHOW or CANCELED',
      )
      .option('--patientId <patientId>', 'patient the appointment is for')
      .option('--note <note>', 'free-text note')
      .option('--clinicId <clinicId>', 'clinic the appointment belongs to')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (appointmentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/appointments/${appointmentId}`),
      )
      const appointment = await api.put(`/api/appointments/${appointmentId}`, {
        ...body,
        _id: appointmentId,
        ...(clinicId && { clinicId }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.status && { status: options.status }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.note && { note: options.note }),
      })

      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }

      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <appointmentId...>')
      .description(
        'delete one or more appointments by id' +
          ' (DELETE /api/appointments/:appointmentId,' +
          ' fires appointment.deleted)',
      ),
  ).action(async (appointmentIds, options) => {
    const deleted = []

    for (let index = 0; index < appointmentIds.length; index += 1) {
      const appointmentId = appointmentIds[index]

      try {
        await api.del(`/api/appointments/${appointmentId}`)
        deleted.push(appointmentId)

        if (!options.json) {
          console.log(`deleted ${appointmentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({ ok: deleted.length === appointmentIds.length, deleted })
    }
  })

  return command
}

export default appointmentsCommand
