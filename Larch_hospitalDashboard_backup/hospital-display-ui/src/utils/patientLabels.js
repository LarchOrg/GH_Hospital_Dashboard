// Patient records store Gender and Criticality as fixed English values in
// the database (Male/Female/Other, Stable/Critical/MostCritical/Deceased). These helpers
// map those raw values to translation keys so every screen - including the
// public TV dashboard - displays them in the currently selected language
// instead of leaking the raw English string.

const GENDER_KEY = {
  Male: 'form.genderMale',
  Female: 'form.genderFemale',
  Other: 'form.genderOther'
};

const CRITICALITY_KEY = {
  Stable: 'form.stable',
  Critical: 'form.critical',
  MostCritical: 'form.mostCritical',
  Deceased: 'form.deceased'
};

const WARD_STATUS_KEY = {
  Ward: 'form.wardStatusWard',
  Discharged: 'form.wardStatusDischarged'
};

export function genderLabel(t, gender) {
  const key = GENDER_KEY[gender];
  return key ? t(key) : gender;
}

export function criticalityLabel(t, criticality) {
  const key = CRITICALITY_KEY[criticality];
  return key ? t(key) : criticality;
}

// WardStatus is optional - patients with no value set yet simply don't
// show a chip for it, so callers should check for a value before calling.
export function wardStatusLabel(t, wardStatus) {
  const key = WARD_STATUS_KEY[wardStatus];
  return key ? t(key) : wardStatus;
}
