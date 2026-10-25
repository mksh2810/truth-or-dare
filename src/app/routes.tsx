import React from 'react';
import type { RouteObject } from 'react-router-dom';
import DevKit from '../dev/DevKit';

const HomePlaceholder = () => (
  <div className="flex flex-col items-center justify-center min-h-[80dvh] text-center gap-6">
    <div className="w-16 h-16 bg-peach border-2 border-ink shadow-hard rounded-btn flex items-center justify-center font-display text-2xl font-bold">
      🎲
    </div>
    <h1 className="font-display text-3xl font-bold tracking-tight text-ink">
      Truth or Dare
    </h1>
    <p className="font-handwriting text-xl text-ink-muted italic">
      Write it. Do it. Get judged.
    </p>
    <a
      href="/dev/kit"
      className="inline-flex items-center justify-center h-14 px-8 bg-dare text-white font-mono font-bold uppercase rounded-btn border-2 border-ink shadow-hard btn-press text-sm"
    >
      Open Dev Kit
    </a>
  </div>
);

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <HomePlaceholder />,
  },
  {
    path: '/dev/kit',
    element: <DevKit />,
  },
];
