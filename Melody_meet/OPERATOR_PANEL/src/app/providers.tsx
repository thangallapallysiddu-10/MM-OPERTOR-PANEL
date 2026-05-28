import React from 'react';
import { OperatorProvider } from '../context/OperatorContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <OperatorProvider>
      {children}
    </OperatorProvider>
  );
}