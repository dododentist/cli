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

// A payment carries its value in one of three shapes, checked lines-first:
// `lines` (canonical), the legacy embedded `procedures`, or a flat `amount`
// (the card-terminal flow). Only `amount` is a scalar, so only it gets a flag;
// the other two go through --body.
function paymentsCommand() {
  const command = new commander.Command('payments')
  command.description(
    'manage the payments of your organization (payments:read / payments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list payments (GET /api/payments)')
      .option('--clinicId <clinicId>', 'only payments of this clinic')
      .option('--patientId <patientId>', 'only payments of this patient')
      .option(
        '--startTime <startTime>',
        'only payments starting at or after this ISO 8601 instant',
      )
      .option(
        '--endTime <endTime>',
        'only payments ending before this ISO 8601 instant',
      )
      .option('-n, --limit <limit>', 'max results (0 = no limit)')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. startTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const payments = await api.get(
        `/api/payments${buildQuery({
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
        printJson(payments)
        return
      }

      if (payments.length === 0) {
        console.log('No payments found')
        return
      }

      console.log(`Found ${payments.length} payment(s):`)
      payments.forEach((payment, index) => {
        const details = [
          payment.startTime,
          payment.status,
          payment.amount !== undefined ? `amount ${payment.amount}` : null,
          payment.patientId ? `patient ${payment.patientId}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        console.log(`${index + 1}. ${details || payment._id} (${payment._id})`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <paymentId>')
      .description('raw JSON for one payment (GET /api/payments/:paymentId)'),
  ).action(async (paymentId, options) => {
    try {
      const payment = await api.get(`/api/payments/${paymentId}`)
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <paymentId>')
      .description('read one payment formatted for the terminal'),
  ).action(async (paymentId, options) => {
    try {
      const payment = await api.get(`/api/payments/${paymentId}`)

      if (options.json) {
        printJson(payment)
        return
      }

      if (!payment) {
        console.log('Payment not found')
        return
      }

      console.log()
      console.log(bold(`Payment ${payment._id}`))
      console.log(dim(payment._id))
      console.log()
      if (payment.status) console.log(`${cyan('status')}  ${payment.status}`)
      if (payment.amount !== undefined) {
        console.log(`${cyan('amount')}  ${payment.amount}`)
      }
      if (payment.startTime) {
        console.log(`${cyan('start')}  ${payment.startTime}`)
      }
      if (payment.endTime) console.log(`${cyan('end')}  ${payment.endTime}`)
      if (payment.patientId) {
        console.log(`${cyan('patientId')}  ${payment.patientId}`)
      }
      if (payment.clinicId) {
        console.log(`${cyan('clinicId')}  ${payment.clinicId}`)
      }
      if (payment.lines?.length) {
        console.log(`${cyan('lines')}  ${payment.lines.length}`)
      }
      if (payment.note) console.log(`${cyan('note')}  ${payment.note}`)
      if (payment.creationTime) {
        console.log(`${cyan('created')}  ${payment.creationTime}`)
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
        'record a payment (POST /api/payments, fires payment.created)',
      )
      .option(
        '--clinicId <clinicId>',
        'clinic the payment belongs to (required unless the key is locked to one clinic)',
      )
      .option('--patientId <patientId>', 'patient the payment is for')
      .option('--amount <amount>', 'flat amount, when there are no lines')
      .option(
        '--status <status>',
        'SUCCEEDED, FAILED or CANCELED — omit for a manually recorded payment,' +
          ' which carries no status and counts as collected',
      )
      .option('--startTime <startTime>', 'ISO 8601 start instant')
      .option('--endTime <endTime>', 'ISO 8601 end instant')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body — this is where' +
          ' `lines`, `procedures` and `discount` go',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const payment = await api.post('/api/payments', {
        ...body,
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.amount !== undefined && { amount: Number(options.amount) }),
        ...(options.status && { status: options.status }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.note && { note: options.note }),
      })

      if (options.json) {
        printJson({ ok: true, id: payment._id })
        return
      }

      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <paymentId>')
      .description(
        'update a payment (PUT /api/payments/:paymentId,' +
          ' fires payment.updated)',
      )
      .option('--clinicId <clinicId>', 'clinic the payment belongs to')
      .option('--patientId <patientId>', 'patient the payment is for')
      .option('--amount <amount>', 'flat amount, when there are no lines')
      .option('--status <status>', 'SUCCEEDED, FAILED or CANCELED')
      .option('--startTime <startTime>', 'ISO 8601 start instant')
      .option('--endTime <endTime>', 'ISO 8601 end instant')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body — this is where' +
          ' `lines`, `procedures` and `discount` go',
      ),
  ).action(async (paymentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/payments/${paymentId}`),
      )
      const payment = await api.put(`/api/payments/${paymentId}`, {
        ...body,
        // The API writes whatever _id the body carries — the path parameter is
        // only used for the ownership check — so send it explicitly.
        _id: paymentId,
        ...(clinicId && { clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.amount !== undefined && { amount: Number(options.amount) }),
        ...(options.status && { status: options.status }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.note && { note: options.note }),
      })

      if (options.json) {
        printJson({ ok: true, id: payment._id })
        return
      }

      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <paymentId...>')
      .description(
        'delete one or more payments by id (DELETE /api/payments/:paymentId,' +
          ' fires payment.deleted)',
      ),
  ).action(async (paymentIds, options) => {
    const deleted = []

    for (let index = 0; index < paymentIds.length; index += 1) {
      const paymentId = paymentIds[index]

      try {
        await api.del(`/api/payments/${paymentId}`)
        deleted.push(paymentId)

        if (!options.json) {
          console.log(`deleted ${paymentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({ ok: deleted.length === paymentIds.length, deleted })
    }
  })

  return command
}

module.exports = paymentsCommand
