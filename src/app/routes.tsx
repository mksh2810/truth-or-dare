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
import { PerformTruthScreen } from '../features/play/PerformTruthScreen';
import { PerformDareScreen } from '../features/play/PerformDareScreen';
import { VoteScreen } from '../features/vote/VoteScreen';
import { ResultScreen } from '../features/vote/ResultScreen';
import { SummaryScreen } from '../features/table/SummaryScreen';
import { LootScreen } from '../features/loot/LootScreen';
import { MeScreen } from '../features/me/MeScreen';

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <SplashScreen />,
  },
  {
    path: '/welcome',
    element: <OnboardingScreen />,
  },
  {
    path: '/setup',
    element: <ProfileSetupScreen />,
  },
  {
    path: '/home',
    element: <HomeScreen />,
  },
  {
    path: '/create',
    element: <CreateTableScreen />,
  },
  {
    path: '/join/:code?',
    element: <JoinTableScreen />,
  },
  {
    path: '/table/:code',
    element: <LobbyScreen />,
  },
  {
    path: '/table/:code/write',
    element: <WriteChitsScreen />,
  },
  {
    path: '/table/:code/play',
    element: <SpinScreen />,
  },
  {
    path: '/table/:code/summary',
    element: <SummaryScreen />,
  },
  {
    path: '/loot',
    element: <LootScreen />,
  },
  {
    path: '/me',
    element: <MeScreen />,
  },
  {
    path: '/dev/kit',
    element: <DevKit />,
  },
  {
    path: '/dev/screens',
    element: <DevScreens />,
  },
];
