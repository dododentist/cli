/* Copyright 2025 DodoDentist LLC */

// Every write route in dododentist/api resolves the clinic as
// `response.locals.clinicId || request.query.clinicId || request.body.clinicId`
// and then `checkStringNotEmpty(clinicId, 'missing clinicId')`. A clinic-scoped
// key supplies it implicitly through response.locals; an organization-wide key
// or a browser session must send it. On update, when the caller passed no
// --clinicId, reuse the clinicId of the existing record (costs one extra read).
module.exports = async function resolveClinicId(options, body, getExisting) {
  let clinicId = options.clinicId || body.clinicId

  if (!clinicId) {
    const existing = await getExisting()
    clinicId = existing?.clinicId
  }

  return clinicId
}
