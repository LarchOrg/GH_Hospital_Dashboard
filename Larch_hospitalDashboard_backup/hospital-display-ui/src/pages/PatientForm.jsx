import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { PatientContext } from '../context/PatientContext';
import { useLanguage } from '../hooks/useLanguage';
import Loader from '../components/common/Loader';
import ConfirmModal from '../components/common/ConfirmModal';
import Toast from '../components/common/Toast';
import CriticalityBadge from '../components/dashboard/CriticalityBadge';
import { genderLabel, wardStatusLabel } from '../utils/patientLabels';

const EMPTY_FORM = {
  patientId: null,
  patientName: '',
  patientNameTamil: '',
  age: '',
  gender: '',
  fatherName: '',
  fatherNameTamil: '',
  admitTime: '',
  criticality: 'Stable',
  wardStatus: '',
  wardNumber: ''
};

// Ward number is a short hospital-assigned code (e.g. "A101") shown only
// once a patient is moved into a ward - alphanumeric, max 5 characters.
const WARD_NUMBER_MAX_LENGTH = 5;
const WARD_NUMBER_PATTERN = '[A-Za-z0-9]{1,5}';

// AdmitTime is a hospital wall-clock timestamp ("the patient was admitted
// at 9:15 AM"), not a real point in time that needs timezone conversion.
// Parsing/formatting it as a plain string - rather than routing it through
// `new Date()` and letting the browser reinterpret it in its own local
// timezone via toISOString()/getHours() etc. - is what keeps the time the
// staff typed in exactly the time that's shown back everywhere, with no
// drift. (Going through `new Date().toISOString()` was the bug: it forced
// a UTC conversion on save, silently shifting the stored time by the
// browser's UTC offset.)
function parseAdmitTimeParts(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/);
  if (!match) return null;
  const [, year, month, day, hour, minute] = match;
  return { year, month, day, hour, minute };
}

function toDateTimeLocal(value) {
  const parts = parseAdmitTimeParts(value);
  if (!parts) return '';
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

// Grid display format: DD/MM/YYYY, HH:mm
function formatAdmitDateTime(value) {
  const parts = parseAdmitTimeParts(value);
  if (!parts) return '';
  return `${parts.day}/${parts.month}/${parts.year}, ${parts.hour}:${parts.minute}`;
}

// Compares an admitTime wall-clock string against "today" in the browser's
// local date - used by the "Today's Patients" quick filter.
function isAdmitToday(value) {
  const parts = parseAdmitTimeParts(value);
  if (!parts) return false;
  const now = new Date();
  return (
    Number(parts.year) === now.getFullYear() &&
    Number(parts.month) === now.getMonth() + 1 &&
    Number(parts.day) === now.getDate()
  );
}

const GENDER_ICON = {
  Male: 'bi-gender-male',
  Female: 'bi-gender-female',
  Other: 'bi-gender-ambiguous'
};

const ROWS_PER_PAGE = 8;

// Quick filters shown above the management table.


/**
 * Combined patient registration / edit / management screen.
 * The same form is used for both creating a new patient and editing an
 * existing one - clicking "Edit" on a row loads that patient into the
 * form and switches the Save button into an Update button.
 */
export default function PatientForm() {
  const { t } = useLanguage();
  const {
    patients,
    loading,
    error,
    fetchAll,
    searchPatients,
    createPatient,
    updatePatient,
    deletePatient
  } = useContext(PatientContext);

  const [form, setForm] = useState(EMPTY_FORM);
  const [validated, setValidated] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Quick filters (All / Today / Ward Changed / Discharged) apply on top
  // of whatever list is currently loaded (full list or a keyword search
  // result) - purely client-side, so clicking a filter just narrows what's
  // already there.



  // Keep pagination in range whenever the underlying (filtered) patient
  // list changes (new search results, a filter switch, a record
  // added/removed, etc.).
  const totalPages = Math.max(1, Math.ceil(patients.length / ROWS_PER_PAGE));
  const pagedPatients = useMemo(() => {
  const start = (currentPage - 1) * ROWS_PER_PAGE;
  return patients.slice(start, start + ROWS_PER_PAGE);
}, [patients, currentPage]);

  const showToast = (message, type = 'success') => setToast({ message, type });
  const closeToast = () => setToast({ message: '', type: 'success' });

  const resetForm = useCallback(() => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
    setValidated(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'wardStatus') {
      // Ward number only makes sense while the patient is actually in a
      // ward - clear it whenever the status is changed away from "Ward".
      setForm((prev) => ({
        ...prev,
        wardStatus: value,
        wardNumber: value === 'Ward' ? prev.wardNumber : ''
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleWardNumberChange = (e) => {
    // Enforce alphanumeric-only, max 5 chars at input time as well as via
    // the pattern/maxLength attributes, so pasted values get sanitized too.
    const value = e.target.value.replace(/[^A-Za-z0-9]/g, '').slice(0, WARD_NUMBER_MAX_LENGTH);
    setForm((prev) => ({ ...prev, wardNumber: value }));
  };

  const handleCriticalitySelect = (value) => {
    setForm((prev) => ({ ...prev, criticality: value }));
  };

  const handleEdit = (patient) => {
    setForm({
      patientId: patient.patientId,
      patientName: patient.patientName,
      patientNameTamil: patient.patientNameTamil || '',
      age: patient.age,
      gender: patient.gender,
      fatherName: patient.fatherName || '',
      fatherNameTamil: patient.fatherNameTamil || '',
      admitTime: toDateTimeLocal(patient.admitTime),
      criticality: patient.criticality,
      wardStatus: patient.wardStatus || '',
      wardNumber: patient.wardNumber || ''
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formEl = e.currentTarget;

    if (!formEl.checkValidity()) {
      setValidated(true);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        patientName: form.patientName.trim(),
        patientNameTamil: form.patientNameTamil.trim(),
        age: Number(form.age),
        gender: form.gender,
        fatherName: form.fatherName.trim(),
        fatherNameTamil: form.fatherNameTamil.trim(),
        // Send the wall-clock value the staff typed in as a plain string
        // (seconds appended) - NOT new Date(form.admitTime).toISOString(),
        // which would silently shift the time by the browser's UTC offset.
        admitTime: `${form.admitTime}:00`,
        criticality: form.criticality,
        wardStatus: form.wardStatus || null,
        // Only meaningful once the patient is actually in a ward.
        wardNumber: form.wardStatus === 'Ward' ? form.wardNumber.trim() : null
      };

      if (isEditing) {
        await updatePatient(form.patientId, { ...payload, patientId: form.patientId });
        showToast(t('toast.updateSuccess'), 'success');
      } else {
        await createPatient(payload);
        showToast(t('toast.createSuccess'), 'success');
      }
      resetForm();
    } catch (err) {
      showToast(err.message || t('toast.error'), 'error');
    } finally {
      setSubmitting(false);
      setValidated(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const keyword = searchKeyword.trim();
    if (keyword === '' && !dateFrom && !dateTo) {
      await fetchAll();
    } else {
      await searchPatients(keyword, dateFrom || undefined, dateTo || undefined);
    }
    setCurrentPage(1);
  };

  const handleClearDateFilter = async () => {
    setDateFrom('');
    setDateTo('');
    const keyword = searchKeyword.trim();
    if (keyword === '') {
      await fetchAll();
    } else {
      await searchPatients(keyword, undefined, undefined);
    }
    setCurrentPage(1);
  };

  const handleDeleteConfirmed = async () => {
    try {
      await deletePatient(confirmDeleteId);
      showToast(t('toast.deleteSuccess'), 'success');
    } catch (err) {
      showToast(err.message || t('toast.error'), 'error');
    } finally {
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="patient-form-page">
      <Toast message={toast.message} type={toast.type} onClose={closeToast} />

      <div className="patient-form-layout">
      <div className="patient-form-col">
      <div className="patient-form-card">
        <div className="patient-form-card-header">
          <i className={`bi ${isEditing ? 'bi-pencil-square' : 'bi-clipboard2-plus'}`} aria-hidden="true" />
          {isEditing ? t('form.titleEdit') : t('form.titleNew')}
        </div>
        <div className="patient-form-card-body">
          <form className={validated ? 'was-validated' : ''} noValidate onSubmit={handleSubmit}>
            <div className="form-section-label">{t('form.sectionIdentity')}</div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('form.patientName')}</label>
                <input
                  type="text"
                  name="patientName"
                  className="form-control form-control-lg"
                  value={form.patientName}
                  onChange={handleChange}
                  required
                />
                <div className="invalid-feedback">{t('form.requiredField')}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('form.patientNameTamil')}</label>
                <input
                  type="text"
                  name="patientNameTamil"
                  lang="ta"
                  className="form-control form-control-lg"
                  placeholder={t('form.patientNameTamilPlaceholder')}
                  value={form.patientNameTamil}
                  onChange={handleChange}
                  required
                />
                <div className="invalid-feedback">{t('form.requiredField')}</div>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">{t('form.age')}</label>
                <input
                  type="number"
                  name="age"
                  min="0"
                  max="150"
                  className="form-control form-control-lg"
                  value={form.age}
                  onChange={handleChange}
                  required
                />
                <div className="invalid-feedback">{t('form.invalidAge')}</div>
              </div>

              <div className="col-md-3">
                <label className="form-label fw-semibold">{t('form.gender')}</label>
                <select
                  name="gender"
                  className="form-select form-select-lg"
                  value={form.gender}
                  onChange={handleChange}
                  required
                >
                  <option value="">{t('form.selectGender')}</option>
                  <option value="Male">{t('form.genderMale')}</option>
                  <option value="Female">{t('form.genderFemale')}</option>
                  <option value="Other">{t('form.genderOther')}</option>
                </select>
                <div className="invalid-feedback">{t('form.requiredField')}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('form.fatherName')}</label>
                <input
                  type="text"
                  name="fatherName"
                  className="form-control form-control-lg"
                  value={form.fatherName}
                  onChange={handleChange}
                  required
                />
                <div className="invalid-feedback">{t('form.requiredField')}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('form.fatherNameTamil')}</label>
                <input
                  type="text"
                  name="fatherNameTamil"
                  lang="ta"
                  className="form-control form-control-lg"
                  placeholder={t('form.fatherNameTamilPlaceholder')}
                  value={form.fatherNameTamil}
                  onChange={handleChange}
                  required
                />
                <div className="invalid-feedback">{t('form.requiredField')}</div>
              </div>
            </div>

            <div className="form-section-label form-section-label--spaced">{t('form.sectionStatus')}</div>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label fw-semibold">{t('form.admitTime')}</label>
                <input
                  type="datetime-local"
                  name="admitTime"
                  className="form-control form-control-lg"
                  value={form.admitTime}
                  onChange={handleChange}
                  required
                />
                <div className="invalid-feedback">{t('form.requiredField')}</div>
              </div>

              <div className="col-md-6">
                <label className="form-label fw-semibold d-block">
                  {t('form.wardStatus')} <span className="form-label-hint">{t('form.optional')}</span>
                </label>
                <select
                  name="wardStatus"
                  className="form-select form-select-lg ward-status-select"
                  value={form.wardStatus}
                  onChange={handleChange}
                >
                  <option value="">{t('form.selectWardStatus')}</option>
                  <option value="Ward">{t('form.wardStatusWard')}</option>
                  <option value="Discharged">{t('form.wardStatusDischarged')}</option>
                </select>
              </div>

              {form.wardStatus === 'Ward' && (
                <div className="col-md-6">
                  <label className="form-label fw-semibold">{t('form.wardNumber')}</label>
                  <input
                    type="text"
                    name="wardNumber"
                    className="form-control form-control-lg ward-number-input"
                    placeholder={t('form.wardNumberPlaceholder')}
                    value={form.wardNumber}
                    onChange={handleWardNumberChange}
                    maxLength={WARD_NUMBER_MAX_LENGTH}
                    pattern={WARD_NUMBER_PATTERN}
                    required
                  />
                  <div className="invalid-feedback">{t('form.invalidWardNumber')}</div>
                </div>
              )}

              <div className="col-12">
                <label className="form-label fw-semibold d-block">{t('form.criticality')}</label>
                <div className="criticality-btn-group" role="group">
                  <button
                    type="button"
                    className={`criticality-select-btn criticality-select-btn--stable ${form.criticality === 'Stable' ? 'active' : ''}`}
                    onClick={() => handleCriticalitySelect('Stable')}
                  >
                    <i className="bi bi-check-circle-fill" aria-hidden="true" /> {t('form.stable')}
                  </button>
                  <button
                    type="button"
                    className={`criticality-select-btn criticality-select-btn--critical ${form.criticality === 'Critical' ? 'active' : ''}`}
                    onClick={() => handleCriticalitySelect('Critical')}
                  >
                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" /> {t('form.critical')}
                  </button>
                  <button
                    type="button"
                    className={`criticality-select-btn criticality-select-btn--mostcritical ${form.criticality === 'MostCritical' ? 'active' : ''}`}
                    onClick={() => handleCriticalitySelect('MostCritical')}
                  >
                    <i className="bi bi-exclamation-octagon-fill" aria-hidden="true" /> {t('form.mostCritical')}
                  </button>
                  <button
                    type="button"
                    className={`criticality-select-btn criticality-select-btn--deceased ${form.criticality === 'Deceased' ? 'active' : ''}`}
                    onClick={() => handleCriticalitySelect('Deceased')}
                  >
                    <i className="bi bi-dash-circle-fill" aria-hidden="true" /> {t('form.deceased')}
                  </button>
                </div>
              </div>
            </div>

            <div className="patient-form-actions">
              <button type="submit" className="btn-primary-pill" disabled={submitting}>
                <i className={`bi ${isEditing ? 'bi-check2-circle' : 'bi-plus-circle'}`} aria-hidden="true" />
                {isEditing ? t('form.update') : t('form.save')}
              </button>
              <button type="button" className="btn-ghost-pill" onClick={resetForm}>
                {t('form.clear')}
              </button>
              {isEditing && (
                <button type="button" className="btn-ghost-pill" onClick={resetForm}>
                  {t('form.cancel')}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      </div>

      <div className="patient-grid-col">
     

      <form className="patient-table-toolbar" onSubmit={handleSearch}>
        <div className="patient-search-box">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            type="text"
            className="patient-search-input"
            placeholder={t('form.searchPlaceholder')}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
        </div>
        <div className="patient-date-filter">
          <label className="patient-date-filter-label" htmlFor="patient-date-from">
            {t('form.dateFrom')}
          </label>
          <input
            id="patient-date-from"
            type="date"
            className="form-control patient-date-input"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <label className="patient-date-filter-label" htmlFor="patient-date-to">
            {t('form.dateTo')}
          </label>
          <input
            id="patient-date-to"
            type="date"
            className="form-control patient-date-input"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {(dateFrom || dateTo) && (
            <button type="button" className="btn-ghost-pill patient-date-clear-btn" onClick={handleClearDateFilter}>
              {t('form.clearDateFilter')}
            </button>
          )}
        </div>
        <button type="submit" className="btn-primary-pill">
          {t('form.search')}
        </button>
      </form>

      {loading ? (
        <Loader />
      ) : (
        <div className="patient-management-table">
          <div className="patient-management-table-header">
            <span>{patients.length} {t('form.recordsCount')}</span>
          </div>
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>{t('form.patientName')}</th>
                  <th>{t('form.age')}</th>
                  <th>{t('form.gender')}</th>
                  <th>{t('form.admitTime')}</th>
                  <th>{t('form.criticality')}</th>
                  <th>{t('form.wardStatus')}</th>
                  <th className="text-end">{t('form.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pagedPatients.map((patient) => (
                  <tr key={patient.patientId}>
                    <td className="fw-semibold">
                      {patient.patientName}
                      {patient.patientNameTamil && (
                        <div className="patient-name-tamil-hint">{patient.patientNameTamil}</div>
                      )}
                    </td>
                    <td>{patient.age}</td>
                    <td>
                      <i className={`bi ${GENDER_ICON[patient.gender] || 'bi-person-fill'} me-1 text-muted`} aria-hidden="true" />
                      {genderLabel(t, patient.gender)}
                    </td>
                    <td>{formatAdmitDateTime(patient.admitTime)}</td>
                    <td>
                      <CriticalityBadge criticality={patient.criticality} size="sm" />
                    </td>
                    <td>
                      {patient.wardStatus ? (
                        <span className={`ward-status-chip ward-status-chip--${patient.wardStatus.toLowerCase()}`}>
                          <i className={`bi ${patient.wardStatus === 'Ward' ? 'bi-hospital' : 'bi-box-arrow-right'}`} aria-hidden="true" />
                          {wardStatusLabel(t, patient.wardStatus)}
                          {patient.wardStatus === 'Ward' && patient.wardNumber ? ` - ${patient.wardNumber}` : ''}
                        </span>
                      ) : (
                        <span className="ward-status-chip ward-status-chip--none">{t('form.selectWardStatus')}</span>
                      )}
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="row-action-btn row-action-btn--edit"
                        onClick={() => handleEdit(patient)}
                      >
                        <i className="bi bi-pencil-square" aria-hidden="true" /> {t('form.edit')}
                      </button>
                      <button
                        type="button"
                        className="row-action-btn row-action-btn--delete"
                        onClick={() => setConfirmDeleteId(patient.patientId)}
                      >
                        <i className="bi bi-trash" aria-hidden="true" /> {t('form.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
                {patients.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-5">
                      <div className="table-empty-state">
                        <i className="bi bi-clipboard2-x" aria-hidden="true" />
                        <div className="table-empty-title">{t('form.tableEmptyTitle')}</div>
                        <div className="table-empty-subtitle">{t('form.tableEmptySubtitle')}</div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {patients.length > ROWS_PER_PAGE && (
            <div className="patient-table-pagination">
              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="bi bi-chevron-left" aria-hidden="true" />
                {t('form.prev')}
              </button>

              <div className="pagination-pages">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    className={`pagination-page-btn ${pageNum === currentPage ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>

              <button
                type="button"
                className="pagination-btn"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                {t('form.next')}
                <i className="bi bi-chevron-right" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert alert-danger mt-3">{error}</div>}
      </div>
      </div>

      <ConfirmModal
        show={confirmDeleteId !== null}
        title={t('form.confirmDeleteTitle')}
        message={t('form.confirmDeleteMessage')}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}