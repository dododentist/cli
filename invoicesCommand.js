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

// An invoice carries its value in `lines` (the canonical shape) or the legacy
// embedded `procedures`, neither of which is a flat scalar — so both are set
// through --body rather than pretending a single --amount flag exists.
function invoicesCommand() {
  const command = new commander.Command('invoices')
  command.description(
    'manage the invoices of your organization (invoices:read / invoices:write)',
  )

  withJson(
    command
      .command('list')
      .description('list invoices (GET /api/invoices)')
      .option('--clinicId <clinicId>', 'only invoices of this clinic')
      .option('--patientId <patientId>', 'only invoices of this patient')
      .option(
        '--startTime <startTime>',
        'only invoices starting at or after this ISO 8601 instant',
      )
      .option(
        '--endTime <endTime>',
        'only invoices ending before this ISO 8601 instant',
      )
      .option('-n, --limit <limit>', 'max results (0 = no limit)')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. startTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const invoices = await api.get(
        `/api/invoices${buildQuery({
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
        printJson(invoices)
        return
      }

      if (invoices.length === 0) {
        console.log('No invoices found')
        return
      }

      console.log(`Found ${invoices.length} invoice(s):`)
      invoices.forEach((invoice, index) => {
        const details = [
          invoice.startTime,
          invoice.status,
          invoice.patientId ? `patient ${invoice.patientId}` : null,
        ]
          .filter(Boolean)
          .join(' · ')
        console.log(`${index + 1}. ${details || invoice._id} (${invoice._id})`)
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <invoiceId>')
      .description('raw JSON for one invoice (GET /api/invoices/:invoiceId)'),
  ).action(async (invoiceId, options) => {
    try {
      const invoice = await api.get(`/api/invoices/${invoiceId}`)
      printJson(invoice)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <invoiceId>')
      .description('read one invoice formatted for the terminal'),
  ).action(async (invoiceId, options) => {
    try {
      const invoice = await api.get(`/api/invoices/${invoiceId}`)

      if (options.json) {
        printJson(invoice)
        return
      }

      if (!invoice) {
        console.log('Invoice not found')
        return
      }

      console.log()
      console.log(bold(`Invoice ${invoice._id}`))
      console.log(dim(invoice._id))
      console.log()
      if (invoice.status) console.log(`${cyan('status')}  ${invoice.status}`)
      if (invoice.startTime) {
        console.log(`${cyan('start')}  ${invoice.startTime}`)
      }
      if (invoice.endTime) console.log(`${cyan('end')}  ${invoice.endTime}`)
      if (invoice.patientId) {
        console.log(`${cyan('patientId')}  ${invoice.patientId}`)
      }
      if (invoice.clinicId) {
        console.log(`${cyan('clinicId')}  ${invoice.clinicId}`)
      }
      if (invoice.lines?.length) {
        console.log(`${cyan('lines')}  ${invoice.lines.length}`)
      }
      if (invoice.note) console.log(`${cyan('note')}  ${invoice.note}`)
      if (invoice.creationTime) {
        console.log(`${cyan('created')}  ${invoice.creationTime}`)
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
        'create an invoice (POST /api/invoices, fires invoice.created)',
      )
      .option(
        '--clinicId <clinicId>',
        'clinic the invoice belongs to (required unless the key is locked to one clinic)',
      )
      .option('--patientId <patientId>', 'patient the invoice is for')
      .option(
        '--status <status>',
        'DRAFT, PENDING, PARTIALLY_PAID, PAID, OVERDUE, REFUNDED or' +
          ' UNCOLLECTIBLE (default DRAFT)',
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
      const invoice = await api.post('/api/invoices', {
        ...body,
        ...(options.clinicId && { clinicId: options.clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.status && { status: options.status }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.note && { note: options.note }),
      })

      if (options.json) {
        printJson({ ok: true, id: invoice._id })
        return
      }

      printJson(invoice)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <invoiceId>')
      .description(
        'update an invoice (PUT /api/invoices/:invoiceId,' +
          ' fires invoice.updated)',
      )
      .option('--clinicId <clinicId>', 'clinic the invoice belongs to')
      .option('--patientId <patientId>', 'patient the invoice is for')
      .option(
        '--status <status>',
        'DRAFT, PENDING, PARTIALLY_PAID, PAID, OVERDUE, REFUNDED or' +
          ' UNCOLLECTIBLE',
      )
      .option('--startTime <startTime>', 'ISO 8601 start instant')
      .option('--endTime <endTime>', 'ISO 8601 end instant')
      .option('--note <note>', 'free-text note')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body — this is where' +
          ' `lines`, `procedures` and `discount` go',
      ),
  ).action(async (invoiceId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const clinicId = await resolveClinicId(options, body, () =>
        api.get(`/api/invoices/${invoiceId}`),
      )
      const invoice = await api.put(`/api/invoices/${invoiceId}`, {
        ...body,
        // The API writes whatever _id the body carries — the path parameter is
        // only used for the ownership check — so send it explicitly.
        _id: invoiceId,
        ...(clinicId && { clinicId }),
        ...(options.patientId && { patientId: options.patientId }),
        ...(options.status && { status: options.status }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.note && { note: options.note }),
      })

      if (options.json) {
        printJson({ ok: true, id: invoice._id })
        return
      }

      printJson(invoice)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <invoiceId...>')
      .description(
        'delete one or more invoices by id (DELETE /api/invoices/:invoiceId,' +
          ' fires invoice.deleted)',
      ),
  ).action(async (invoiceIds, options) => {
    const deleted = []

    for (let index = 0; index < invoiceIds.length; index += 1) {
      const invoiceId = invoiceIds[index]

      try {
        await api.del(`/api/invoices/${invoiceId}`)
        deleted.push(invoiceId)

        if (!options.json) {
          console.log(`deleted ${invoiceId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }

    if (options.json) {
      printJson({ ok: deleted.length === invoiceIds.length, deleted })
    }
  })

  return command
}

module.exports = invoicesCommand
