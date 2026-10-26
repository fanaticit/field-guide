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
import LandingPage from './pages/LandingPage';

import BuildPlanner from './pages/BuildPlanner';
import Armory from './pages/Armory';
import VisageBuilds from './pages/VisageBuilds';
import HunterChallenges from './pages/HunterChallenges';
import ArmourGuide from './pages/investigation-notes/ArmourGuide';
import VisageSetsGuide from './pages/investigation-notes/VisageSetsGuide';
import AdventurerGuide from './pages/investigation-notes/AdventurerGuide';
import BuddyGuide from './pages/investigation-notes/BuddyGuide';
import WeaponGuide from './pages/investigation-notes/WeaponGuide';
import AdminPage from './pages/admin/AdminPage';
import SettingsPage from './pages/Settings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <LandingPage /> },

      // ── 1. Hunter's Armory ──
      { path: 'armory', element: <Armory /> },
      { path: 'armory/builds', element: <Navigate to="/armory" replace /> },
      { path: 'armory/planner', element: <BuildPlanner /> },
      { path: 'armory/planner/:buildId', element: <BuildPlanner /> },
      { path: 'armory/armour', element: <div className="p-6 lg:p-8 min-h-full"><ArmourGuide /></div> },

      // ── 2. Gallery ──
      { path: 'gallery', element: <VisageBuilds /> },
      { path: 'gallery/sets', element: <Navigate to="/gallery" replace /> },
      { path: 'gallery/collection', element: <div className="p-0 sm:p-2 lg:p-4 flex-1 flex flex-col min-h-0"><VisageSetsGuide /></div> },

      // ── 3. Challenges ──
      { path: 'challenges', element: <HunterChallenges /> },
      { path: 'challenges/adventurers', element: <div className="p-6 lg:p-8 min-h-full"><AdventurerGuide /></div> },
      { path: 'challenges/buddies', element: <div className="p-6 lg:p-8 min-h-full"><BuddyGuide /></div> },
      { path: 'challenges/weapons', element: <div className="p-6 lg:p-8 min-h-full"><WeaponGuide /></div> },

      // ── User & Admin ──
      { path: 'settings', element: <SettingsPage /> },
      { path: 'admin', element: <Navigate to="/admin/monsters" replace /> },
      { path: 'admin/:subPage', element: <AdminPage /> },

      // ── Legal / Footer ──
      { path: 'privacy', element: <PrivacyPolicy /> },
      { path: 'terms', element: <TermsOfService /> },

      // ── Legacy Redirects ──
      { path: 'armory/visages', element: <Navigate to="/gallery" replace /> },
      { path: 'armory/build-planner', element: <Navigate to="/armory/planner" replace /> },
      { path: 'armory/build-planner/:buildId', element: <BuildPlanner /> },
      { path: 'build-planner', element: <Navigate to="/armory/planner" replace /> },
      { path: 'build-planner/:buildId', element: <BuildPlanner /> },
      { path: 'investigation-notes/armour', element: <Navigate to="/armory/armour" replace /> },
      { path: 'investigation-notes/visages', element: <Navigate to="/gallery/collection" replace /> },
      { path: 'investigation-notes/adventurers', element: <Navigate to="/challenges/adventurers" replace /> },
      { path: 'investigation-notes/buddies', element: <Navigate to="/challenges/buddies" replace /> },
      { path: 'investigation-notes/weapons', element: <Navigate to="/challenges/weapons" replace /> },
      { path: 'investigation-notes', element: <Navigate to="/armory/armour" replace /> },
      { path: 'investigation-notes/:subPage', element: <Navigate to="/challenges" replace /> },
      { path: 'community-hub', element: <Navigate to="/armory" replace /> },
      { path: 'monsters', element: <Navigate to="/" replace /> },

      // Catch-all → home
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
