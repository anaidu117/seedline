import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout.tsx';
import Landing from './pages/Landing.tsx';
import NotFound from './pages/NotFound.tsx';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Landing /> },
      { path: '*', element: <NotFound /> },
    ],
  },
]);
