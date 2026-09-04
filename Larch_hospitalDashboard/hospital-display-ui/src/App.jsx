import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import Dashboard from './pages/Dashboard';
import PatientForm from './pages/PatientForm';
import UploadImages from './pages/UploadImages';
import NotFound from './pages/NotFound';
import { LanguageProvider } from './context/LanguageContext';
import { PatientProvider } from './context/PatientContext';

/**
 * Root application component. The public TV dashboard ("/") is rendered
 * full-screen without the staff header/footer chrome; the registration
 * and management screen ("/register") includes the standard layout.
 */
function AppShell() {
  const location = useLocation();
  const isDashboardRoute = location.pathname === '/';

  return (
    <>
      {!isDashboardRoute && <Header />}
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<PatientForm />} />
        <Route path="/upload-images" element={<UploadImages />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isDashboardRoute && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <PatientProvider>
        <AppShell />
      </PatientProvider>
    </LanguageProvider>
  );
}
