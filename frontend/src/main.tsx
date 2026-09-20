import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createHttpApiClient } from './api/api-client';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import { createBrowserTokenStorage } from './auth/token-storage';
import './index.css';

// Dependências criadas aqui e injetadas: o resto do app só conhece as interfaces.
const storage = createBrowserTokenStorage();
const api = createHttpApiClient('/api', () => storage.read());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider api={api} storage={storage}>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
