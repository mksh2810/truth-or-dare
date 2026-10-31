import React from 'react';
import { useRoutes } from 'react-router-dom';
import { routes } from './routes';

export default function App() {
  const element = useRoutes(routes);
  return (
    <div className="min-h-dvh flex flex-col items-center justify-start w-full max-w-[430px] mx-auto relative px-6 safe-top safe-bottom box-border">
      {element}
    </div>
  );
}
