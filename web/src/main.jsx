import React from 'react';
import { createRoot } from 'react-dom/client';
import Root, { ErrorBoundary } from './Root.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </React.StrictMode>
);
