import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './AuthContext';
import { SettingsProvider } from './SettingsContext';
import './index.css';

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <SettingsProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </SettingsProvider>
  </BrowserRouter>
);
