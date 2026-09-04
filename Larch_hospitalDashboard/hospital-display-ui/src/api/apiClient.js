import axios from 'axios';

// Base URL is read from the Vite environment variable so it can be
// changed per-deployment without touching source code.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7001/api';

// The API base URL includes the "/api" suffix for JSON endpoints, but
// uploaded images are served as static files from the API's *origin*
// (e.g. https://localhost:7001/uploads/dashboard-images/xxx.jpg, not
// under /api). Strip the trailing /api so both can share one env var.
export const ASSET_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

// DashboardImageResponseDto.imageUrl is a relative path like
// "/uploads/dashboard-images/xxx.jpg" - this resolves it to a fully
// qualified URL the <img> tag can load.
export function resolveAssetUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
  return `${ASSET_BASE_URL}${relativeUrl.startsWith('/') ? '' : '/'}${relativeUrl}`;
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Centralised error handling: unwraps the ApiResponse envelope and
// surfaces a consistent error shape to callers.
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error?.response?.data?.message ||
      error?.message ||
      'Unable to reach the server. Please try again.';
    return Promise.reject({ message, original: error });
  }
);

export const patientApi = {
  getAll: () => apiClient.get('/patient'),
  getById: (id) => apiClient.get(`/patient/${id}`),
  create: (payload) => apiClient.post('/patient', payload),
  update: (id, payload) => apiClient.put(`/patient/${id}`, payload),
  remove: (id) => apiClient.delete(`/patient/${id}`),
  getDashboard: () => apiClient.get('/patient/dashboard'),
  search: (keyword, fromDate, toDate) =>
    apiClient.get('/patient/search', { params: { keyword, fromDate, toDate } }),
  updateCriticality: (patientId, criticality) =>
    apiClient.put('/patient/update-criticality', null, { params: { patientId, criticality } })
};

export const dashboardImageApi = {
  getAll: () => apiClient.get('/dashboardimage'),
  upload: (formData) =>
    apiClient.post('/dashboardimage/upload', formData, {
      // Override the client's default 'application/json' header with
      // undefined so axios/the browser sets 'multipart/form-data' WITH
      // the required boundary parameter itself - hardcoding the header
      // here would omit the boundary and break the upload.
      headers: { 'Content-Type': undefined }
    }),
  remove: (id) => apiClient.delete(`/dashboardimage/${id}`)
};

export default apiClient;
