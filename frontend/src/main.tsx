import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { createHttpApiClient } from './api/api-client';
import { ApiContext } from './api/api-context';
import { App } from './App';
import { AuthProvider } from './auth/AuthProvider';
import { createBrowserTokenStorage } from './auth/token-storage';
import { createBrowserReceiptPrinter } from './print/browser-printer';
import { PrinterContext } from './print/printer-context';
import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
import './index.css';

// Dependências criadas aqui e injetadas: o resto do app só conhece as interfaces.
const storage = createBrowserTokenStorage();
const api = createHttpApiClient('/api', () => storage.read());
const printer = createBrowserReceiptPrinter();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ApiContext.Provider value={api}>
        <AuthProvider api={api} storage={storage}>
          <PrinterContext.Provider value={printer}>
            <App />
          </PrinterContext.Provider>
        </AuthProvider>
      </ApiContext.Provider>
    </BrowserRouter>
  </StrictMode>,
);
