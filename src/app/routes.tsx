import React from 'react';
import type { RouteObject } from 'react-router-dom';
import DevKit from '../dev/DevKit';
import DevScreens from '../dev/DevScreens';
import { SplashScreen } from '../features/auth/SplashScreen';
import { OnboardingScreen } from '../features/auth/OnboardingScreen';
import { ProfileSetupScreen } from '../features/auth/ProfileSetupScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { CreateTableScreen } from '../features/table/CreateTableScreen';
import { JoinTableScreen } from '../features/table/JoinTableScreen';
import { LobbyScreen } from '../features/table/LobbyScreen';
import { WriteChitsScreen } from '../features/write/WriteChitsScreen';
import { SpinScreen } from '../features/play/SpinScreen';
import { SummaryScreen } from '../features/table/SummaryScreen';
import { LootScreen } from '../features/loot/LootScreen';
import { MeScreen } from '../features/me/MeScreen';
import { DebugLearning } from '../features/debug/DebugLearning';
import { AuthGuard } from '../features/auth/AuthGuard';

export const routes: RouteObject[] = [
  // Public Routes
  {
    path: '/',
    element: <SplashScreen />,
  },
  {
    path: '/welcome',
    element: <OnboardingScreen />,
  },
  {
    path: '/join/:code?',
    element: <JoinTableScreen isGuest />,
  },
  {
    path: '/dev/kit',
    element: <DevKit />,
  },
  {
    path: '/dev/screens',
    element: <DevScreens />,
  },
  {
    path: '/debug/learning',
    element: <DebugLearning />,
  },

  // Profile Setup (requires sign-in, but gates other routes)
  {
    path: '/setup',
    element: (
      <AuthGuard>
        <ProfileSetupScreen />
      </AuthGuard>
    ),
  },

  // Protected In-App Routes
  {
    path: '/home',
    element: (
      <AuthGuard>
        <HomeScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/create',
    element: (
      <AuthGuard>
        <CreateTableScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/table/:code',
    element: (
      <AuthGuard>
        <LobbyScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/table/:code/write',
    element: (
      <AuthGuard>
        <WriteChitsScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/table/:code/play',
    element: (
      <AuthGuard>
        <SpinScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/table/:code/summary',
    element: (
      <AuthGuard>
        <SummaryScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/loot',
    element: (
      <AuthGuard>
        <LootScreen />
      </AuthGuard>
    ),
  },
  {
    path: '/me',
    element: (
      <AuthGuard>
        <MeScreen />
      </AuthGuard>
    ),
  },
];
