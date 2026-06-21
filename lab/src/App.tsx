import { useCallback } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import {
  DEFAULT_LAB_PAGE,
  getLabPageFromSlug,
  getLabPagePath,
} from './routes/lab/lab-page-runtime.js';
import { LabPage } from './routes/lab.js';
import { ThemeProvider } from './components/theme-context.js';
import type { LabPageKey } from './routes/lab/shared.js';

function RoutedLabPage() {
  const { pageSlug } = useParams();
  const navigate = useNavigate();
  const activePage = getLabPageFromSlug(pageSlug);
  const handlePageChange = useCallback(
    (page: LabPageKey) => {
      navigate(getLabPagePath(page));
    },
    [navigate],
  );

  if (!activePage) {
    return <Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />;
  }

  return <LabPage activePage={activePage} onPageChange={handlePageChange} />;
}

export function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route
          path="/"
          element={<Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />}
        />
        <Route
          path="/lab"
          element={<Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />}
        />
        <Route path="/lab/:pageSlug" element={<RoutedLabPage />} />
        <Route
          path="*"
          element={<Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />}
        />
      </Routes>
    </ThemeProvider>
  );
}
