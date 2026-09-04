import React, { createContext, useState, useCallback, useMemo } from 'react';
import { patientApi } from '../api/apiClient';

export const PatientContext = createContext(null);

/**
 * Central store for patient data used by the registration form and
 * management views (not the public dashboard, which fetches its own
 * privacy-safe projection directly).
 */
export function PatientProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.getAll();
      setPatients(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchPatients = useCallback(async (keyword, fromDate, toDate) => {
    setLoading(true);
    setError(null);
    try {
      const response = await patientApi.search(keyword, fromDate, toDate);
      setPatients(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPatient = useCallback(
    async (payload) => {
      const response = await patientApi.create(payload);
      await fetchAll();
      return response.data;
    },
    [fetchAll]
  );

  const updatePatient = useCallback(
    async (id, payload) => {
      const response = await patientApi.update(id, payload);
      await fetchAll();
      return response.data;
    },
    [fetchAll]
  );

  const deletePatient = useCallback(
    async (id) => {
      const response = await patientApi.remove(id);
      await fetchAll();
      return response.data;
    },
    [fetchAll]
  );

  const value = useMemo(
    () => ({
      patients,
      loading,
      error,
      fetchAll,
      searchPatients,
      createPatient,
      updatePatient,
      deletePatient
    }),
    [patients, loading, error, fetchAll, searchPatients, createPatient, updatePatient, deletePatient]
  );

  return <PatientContext.Provider value={value}>{children}</PatientContext.Provider>;
}
