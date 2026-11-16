import React from 'react';
import { createRoot } from 'react-dom/client';
import Root, { ErrorBoundary } from './Root.jsx';
import Translator from './app/shared/Translator.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Root />
      <Translator />
    </ErrorBoundary>
  </React.StrictMode>
);
