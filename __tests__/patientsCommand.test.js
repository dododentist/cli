/* Copyright 2025 DodoDentist LLC */

import { fail, printJson } from '@monorepool/agentfirst/output.js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import patientsCommand from '../patientsCommand.js'
import api from '../request.js'

vi.mock('../request.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@monorepool/agentfirst/output.js', async importOriginal => ({
  ...(await importOriginal()),
  printJson: vi.fn(),
  fail: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

const run = args =>
  patientsCommand().exitOverride().parseAsync(args, { from: 'user' })

it('lists with the documented filters and passes JSON data unchanged', async () => {
  const patients = [{ _id: 'one', name: 'Jane' }]
  api.get.mockResolvedValue(patients)
  await run([
    'list',
    '--clinicId',
    'clinic',
    '--email',
    'a+b@example.com',
    '--userId',
    'user',
    '--_ids',
    'one,two',
    '--limit',
    '8',
    '--skip',
    '0',
    '--fields',
    'name,email',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/patients?clinicId=clinic&email=a%2Bb%40example.com&userId=user&_ids=one%2Ctwo&limit=8&skip=0&fields=name%2Cemail',
  )
  expect(printJson).toHaveBeenCalledExactlyOnceWith(patients)
  expect(fail).not.toHaveBeenCalled()
})

it('omits a list limit and filters when none were supplied', async () => {
  api.get.mockResolvedValue([])
  await run(['list', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/patients')
  expect(printJson).toHaveBeenCalledExactlyOnceWith([])
})

it.each(['get', 'read'])('reads one patient with %s --json', async action => {
  const patient = { _id: 'one', name: 'Jane' }
  api.get.mockResolvedValue(patient)
  await run([action, 'one', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/patients/one')
  expect(printJson).toHaveBeenCalledExactlyOnceWith(patient)
})

it('merges extra create fields while explicit options take precedence', async () => {
  api.post.mockResolvedValue({ _id: 'created' })
  await run([
    'add',
    '--name',
    'Jane',
    '--clinicId',
    'clinic',
    '--email',
    'jane@example.com',
    '--phone',
    '+123',
    '--language',
    'en',
    '--body',
    '{"name":"overridden","note":"keep","clinicId":"overridden"}',
    '--json',
  ])
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/patients', {
    name: 'Jane',
    clinicId: 'clinic',
    email: 'jane@example.com',
    phone: '+123',
    language: 'en',
    note: 'keep',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'created' })
})

it('retains the record clinic on update and cannot replace the path ID with a body ID', async () => {
  api.get.mockResolvedValue({ clinicId: 'existing' })
  api.put.mockResolvedValue({ _id: 'one' })
  await run([
    'update',
    'one',
    '--name',
    'Jane',
    '--body',
    '{"_id":"other","note":"keep"}',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/patients/one')
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/patients/one', {
    _id: 'one',
    clinicId: 'existing',
    name: 'Jane',
    note: 'keep',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'one' })
})

it('does not fetch before an update with an explicit clinic', async () => {
  api.put.mockResolvedValue({ _id: 'one' })
  await run(['update', 'one', '--clinicId', 'chosen', '--json'])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/patients/one', {
    _id: 'one',
    clinicId: 'chosen',
  })
})

it('rejects malformed extra JSON without sending a write', async () => {
  await run(['add', '--name', 'Jane', '--body', '{', '--json'])
  expect(api.post).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      message: expect.stringContaining('--body is not valid JSON:'),
    }),
    { json: true },
  )
  expect(printJson).not.toHaveBeenCalled()
})

it('reports transport failures through the shared error output', async () => {
  const failure = Object.assign(new Error('not allowed'), { status: 403 })
  api.get.mockRejectedValue(failure)
  await run(['get', 'one', '--json'])
  expect(fail).toHaveBeenCalledExactlyOnceWith(failure, { json: true })
  expect(printJson).not.toHaveBeenCalled()
})

it('deletes each requested ID and reports the actual successes', async () => {
  api.del.mockResolvedValue(undefined)
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/patients/one'],
    ['/api/patients/two'],
  ])
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: true,
    deleted: ['one', 'two'],
  })
})

it('reports partial delete success without including the failed ID', async () => {
  const error = new Error('synthetic deletion denied')
  api.del.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/patients/one'],
    ['/api/patients/two'],
  ])
  expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: false,
    deleted: ['two'],
  })
})

it('forwards explicit sort options and a zero limit', async () => {
  api.get.mockResolvedValue([])
  await run([
    'list',
    '--sortField',
    'name',
    '--sortDirection',
    'DESC',
    '--limit',
    '0',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/patients?limit=0&sortField=name&sortDirection=DESC',
  )
})

it('does not write when the existing record cannot be fetched for an update', async () => {
  const error = new Error('synthetic read denied')
  api.get.mockRejectedValue(error)
  await run(['update', 'one', '--name', 'Synthetic Name', '--json'])
  expect(api.put).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
  expect(printJson).not.toHaveBeenCalled()
})

it('keeps body fields on update while explicit options and the path ID take precedence', async () => {
  api.put.mockResolvedValue({ _id: 'one' })
  await run([
    'update',
    'one',
    '--name',
    'Synthetic Name',
    '--email',
    'synthetic@example.test',
    '--phone',
    '+123',
    '--language',
    'en',
    '--body',
    '{"_id":"other","clinicId":"body-clinic","note":"keep","email":"overridden"}',
    '--json',
  ])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/patients/one', {
    _id: 'one',
    clinicId: 'body-clinic',
    note: 'keep',
    name: 'Synthetic Name',
    email: 'synthetic@example.test',
    phone: '+123',
    language: 'en',
  })
})

it('renders an empty human list without printing JSON', async () => {
  api.get.mockResolvedValue([])
  await run(['list'])
  expect(console.log).toHaveBeenCalledExactlyOnceWith('No patients found')
  expect(printJson).not.toHaveBeenCalled()
})

it('renders human list contact details and the ID fallback', async () => {
  api.get.mockResolvedValue([
    {
      _id: 'one',
      name: 'Synthetic Name',
      email: 'synthetic@example.test',
      phone: '+123',
    },
    { _id: 'two' },
  ])
  await run(['list'])
  expect(console.log.mock.calls).toEqual([
    ['Found 2 patient(s):'],
    ['1. Synthetic Name — synthetic@example.test · +123 (one)'],
    ['2. two (two)'],
  ])
  expect(printJson).not.toHaveBeenCalled()
})

it('renders a missing patient in human mode', async () => {
  api.get.mockResolvedValue(null)
  await run(['read', 'one'])
  expect(console.log).toHaveBeenCalledExactlyOnceWith('Patient not found')
  expect(printJson).not.toHaveBeenCalled()
})
