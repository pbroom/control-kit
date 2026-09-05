import { useCallback } from 'react';
import { Navigate, Route, Routes, useNavigate, useParams } from 'react-router';
import {
  DEFAULT_LAB_PAGE,
  getDocsPagePath,
  getLabPagePath,
  getPageFromSlug,
  getPrimitivePagePath,
  hasLabPage,
  type NavigationPageKey,
  type PrimitivePageView,
} from './routes/lab/lab-page-runtime.js';
import { hasDocsPage } from './routes/docs/docs-registry.js';
import { LabPage } from './routes/lab.js';
import { ThemeProvider } from './components/theme-context.js';

function RoutedPrimitivePage() {
  const { pageSlug, pageView } = useParams();
  const navigate = useNavigate();
  const view: PrimitivePageView | null =
    pageView === 'docs' || pageView === 'lab' ? pageView : null;
  const activePage = getPageFromSlug(pageSlug);
  const handlePageChange = useCallback(
    (page: NavigationPageKey) => {
      const nextView =
        view === 'docs' && hasDocsPage(page)
          ? 'docs'
          : hasLabPage(page)
            ? 'lab'
            : 'docs';
      navigate(getPrimitivePagePath(page, nextView));
    },
    [navigate, view],
  );
  const handleViewChange = useCallback(
    (nextView: PrimitivePageView) => {
      if (
        !activePage ||
        (nextView === 'docs' && !hasDocsPage(activePage)) ||
        (nextView === 'lab' && !hasLabPage(activePage))
      ) {
        return;
      }

      navigate(getPrimitivePagePath(activePage, nextView));
    },
    [activePage, navigate],
  );

  if (!activePage || !view) {
    return <Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />;
  }

  if (view === 'docs' && !hasDocsPage(activePage)) {
    return hasLabPage(activePage) ? (
      <Navigate to={getLabPagePath(activePage)} replace />
    ) : (
      <Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />
    );
  }

  if (view === 'lab' && !hasLabPage(activePage)) {
    return <Navigate to={getDocsPagePath(activePage)} replace />;
  }

  return (
    <LabPage
      activePage={activePage}
      onPageChange={handlePageChange}
      onViewChange={handleViewChange}
      view={view}
    />
  );
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
        <Route
          path="/docs"
          element={<Navigate to={getDocsPagePath(DEFAULT_LAB_PAGE)} replace />}
        />
        <Route path="/:pageView/:pageSlug" element={<RoutedPrimitivePage />} />
        <Route
          path="*"
          element={<Navigate to={getLabPagePath(DEFAULT_LAB_PAGE)} replace />}
        />
      </Routes>
    </ThemeProvider>
  );
}
