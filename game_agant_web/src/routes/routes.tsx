import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Lazy load pages for code splitting
const HomePage = lazy(() => import('./HomePage.lazy'));
const SessionPage = lazy(() => import('./SessionPage.lazy'));
const HistoryPage = lazy(() => import('./HistoryPage.lazy'));
const TemplatesPage = lazy(() => import('./TemplatesPage.lazy'));
const SettingsPage = lazy(() => import('./SettingsPage.lazy'));
const CreateWizardPage = lazy(() => import('./CreateWizardPage.lazy'));

// Loading component
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-64px)]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create" element={<CreateWizardPage />} />
        <Route path="/session/new" element={<SessionPage />} />
        <Route path="/session/:id" element={<SessionPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
