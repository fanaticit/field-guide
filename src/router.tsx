// ─────────────────────────────────────────────────────────────
// router.tsx — Central route config for the Field Guide SPA.
//
// URL structure:
//   /                              → Field Guide (Quest Board)
//   /build-planner                 → Build Planner
//   /community-hub                 → Community Hub
//   /investigation-notes           → redirects → /investigation-notes/monster-guide
//   /investigation-notes/:subPage  → Investigation Notes (sub-tab driven by param)
//   /admin                         → redirects → /admin/monsters
//   /admin/:subPage                → Admin Panel (sub-tab driven by param)
//   /settings                      → Profile & Settings
//   /build/:buildId                → (future) Shared build view
//   *                              → redirects → /
// ─────────────────────────────────────────────────────────────
import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './Layout';
import FieldGuide from './pages/FieldGuide';
import BuildPlanner from './pages/BuildPlanner';
import Armory from './pages/Armory';
import CommunityHub from './pages/CommunityHub';
import HunterChallenges from './pages/HunterChallenges';
import InvestigationNotes from './pages/investigation-notes/InvestigationNotes';
import AdminPage from './pages/admin/AdminPage';
import SettingsPage from './pages/Settings';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <FieldGuide /> },
      { path: 'build-planner', element: <BuildPlanner /> },
      { path: 'build-planner/:buildId', element: <BuildPlanner /> },
      { path: 'armory', element: <Armory /> },
      { path: 'challenges', element: <HunterChallenges /> },
      { path: 'community-hub', element: <CommunityHub /> },

      // Investigation Notes — default sub-tab redirect
      {
        path: 'investigation-notes',
        element: <Navigate to="/investigation-notes/monster-guide" replace />,
      },
      { path: 'investigation-notes/:subPage', element: <InvestigationNotes /> },

      // Admin — default sub-tab redirect
      { path: 'admin', element: <Navigate to="/admin/monsters" replace /> },
      { path: 'admin/:subPage', element: <AdminPage /> },

      { path: 'settings', element: <SettingsPage /> },

      // Future: shared build link
      // { path: 'build/:buildId', element: <SharedBuildView /> },

      // Catch-all → home
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
