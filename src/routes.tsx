import { createBrowserRouter, Outlet } from 'react-router';
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
import MaterialsPage from './pages/Materials.tsx';
import AnswersPage from './pages/Answers.tsx';
import DraftPage from './pages/Draft.tsx';
import ApplicationsPage from './pages/Applications.tsx';
import CalendarPage from './pages/Calendar.tsx';
import Checkin from './pages/Checkin.tsx';
import Unsubscribe from './pages/Unsubscribe.tsx';
import { AdminLayout } from './pages/admin/AdminLayout.tsx';
import OpportunityList from './pages/admin/OpportunityList.tsx';
import OpportunityForm from './pages/admin/OpportunityForm.tsx';
import CsvImport from './pages/admin/CsvImport.tsx';
import VerificationQueue from './pages/admin/VerificationQueue.tsx';

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
        { path: '/materials', element: <MaterialsPage /> },
        { path: '/answers', element: <AnswersPage /> },
        { path: '/draft/:slug', element: <DraftPage /> },
        { path: '/applications', element: <ApplicationsPage /> },
        { path: '/calendar', element: <CalendarPage /> },
        { path: '/checkin', element: <Checkin /> },
        { path: '/unsubscribe', element: <Unsubscribe /> },
        {
          path: '/admin',
          element: <AdminLayout />,
          children: [
            { index: true, element: <OpportunityList /> },
            { path: 'opportunities/:id', element: <OpportunityForm /> },
            { path: 'import', element: <CsvImport /> },
            { path: 'verification', element: <VerificationQueue /> },
          ],
        },
        { path: '*', element: <NotFound /> },
      ],
    }],
  },
]);
