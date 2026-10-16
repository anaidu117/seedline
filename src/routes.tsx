import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, Outlet } from 'react-router';
import { Loading, Page } from './components/ui.tsx';
import { AuthProvider } from './lib/auth.tsx';
import { Layout } from './components/Layout.tsx';
import Landing from './pages/Landing.tsx';
import NotFound from './pages/NotFound.tsx';
import ErrorPage from './pages/ErrorPage.tsx';
import SignIn from './pages/SignIn.tsx';
import AuthCallback from './pages/AuthCallback.tsx';
import Start from './pages/Start.tsx';
import Preview from './pages/Preview.tsx';
import PlanPage from './pages/Plan.tsx';
import ProfilePage from './pages/Profile.tsx';
import OpportunityPage from './pages/Opportunity.tsx';
import MapPage from './pages/MapPage.tsx';

// Pages most visitors never open load on demand, so the first page stays small.
const OpportunityList = lazy(() => import('./pages/admin/OpportunityList.tsx'));
const OpportunityForm = lazy(() => import('./pages/admin/OpportunityForm.tsx'));
const CsvImport = lazy(() => import('./pages/admin/CsvImport.tsx'));
const VerificationQueue = lazy(() => import('./pages/admin/VerificationQueue.tsx'));
const SubmissionsQueue = lazy(() => import('./pages/admin/SubmissionsQueue.tsx'));
const ClaimsQueue = lazy(() => import('./pages/admin/ClaimsQueue.tsx'));
const StalenessQueue = lazy(() => import('./pages/admin/StalenessQueue.tsx'));
const Metrics = lazy(() => import('./pages/admin/Metrics.tsx'));
const DraftPage = lazy(() => import('./pages/Draft.tsx'));
const CalendarPage = lazy(() => import('./pages/Calendar.tsx'));
const MaterialsPage = lazy(() => import('./pages/Materials.tsx'));
const AnswersPage = lazy(() => import('./pages/Answers.tsx'));
const SharePage = lazy(() => import('./pages/Share.tsx'));
const ClaimPage = lazy(() => import('./pages/Claim.tsx'));
const Submit = lazy(() => import('./pages/Submit.tsx'));
const Checkin = lazy(() => import('./pages/Checkin.tsx'));
const Unsubscribe = lazy(() => import('./pages/Unsubscribe.tsx'));
const ApplicationsPage = lazy(() => import('./pages/Applications.tsx'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.tsx').then((m) => ({ default: m.AdminLayout })));
const Privacy = lazy(() => import('./pages/Legal.tsx').then((m) => ({ default: m.Privacy })));
const Terms = lazy(() => import('./pages/Legal.tsx').then((m) => ({ default: m.Terms })));

function L(C: LazyExoticComponent<ComponentType>) {
  return <Suspense fallback={<Page><Loading /></Page>}><C /></Suspense>;
}

function Root() {
  return <AuthProvider><Outlet /></AuthProvider>;
}

export const router = createBrowserRouter([
  {
    element: <Root />,
    errorElement: <ErrorPage />,
    children: [{
      element: <Layout />,
      errorElement: <ErrorPage />,
      children: [
        { path: '/', element: <Landing /> },
        { path: '/signin', element: <SignIn /> },
        { path: '/auth/callback', element: <AuthCallback /> },
        { path: '/start', element: <Start /> },
        { path: '/preview', element: <Preview /> },
        { path: '/plan', element: <PlanPage /> },
        { path: '/profile', element: <ProfilePage /> },
        { path: '/opportunity/:slug', element: <OpportunityPage /> },
        { path: '/materials', element: L(MaterialsPage) },
        { path: '/answers', element: L(AnswersPage) },
        { path: '/draft/:slug', element: L(DraftPage) },
        { path: '/applications', element: L(ApplicationsPage) },
        { path: '/calendar', element: L(CalendarPage) },
        { path: '/checkin', element: L(Checkin) },
        { path: '/unsubscribe', element: L(Unsubscribe) },
        { path: '/share/:token', element: L(SharePage) },
        { path: '/map', element: <MapPage /> },
        { path: '/submit', element: L(Submit) },
        { path: '/claim/:slug', element: L(ClaimPage) },
        { path: '/privacy', element: L(Privacy) },
        { path: '/terms', element: L(Terms) },
        {
          path: '/admin',
          element: L(AdminLayout),
          children: [
            { index: true, element: L(OpportunityList) },
            { path: 'opportunities/:id', element: L(OpportunityForm) },
            { path: 'import', element: L(CsvImport) },
            { path: 'verification', element: L(VerificationQueue) },
            { path: 'staleness', element: L(StalenessQueue) },
            { path: 'submissions', element: L(SubmissionsQueue) },
            { path: 'claims', element: L(ClaimsQueue) },
            { path: 'metrics', element: L(Metrics) },
          ],
        },
        { path: '*', element: <NotFound /> },
      ],
    }],
  },
]);
