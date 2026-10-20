import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAdmin } from './components/RequireAdmin';
import { RequireAuth } from './components/RequireAuth';
import { CashierPage } from './pages/CashierPage';
import { StockPage } from './pages/StockPage';
import { CatalogPage } from './pages/CatalogPage';
import { HistoryRedirect } from './pages/HistoryRedirect';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { LoginPage } from './pages/LoginPage';
import { PurchasesPage } from './pages/PurchasesPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/caixa" replace />} />
          <Route path="/caixa" element={<CashierPage />} />
          <Route path="/estoque" element={<StockPage />} />
          <Route element={<RequireAdmin />}>
            {/* O Histórico virou a aba Noites da Análise (2026-10-11). */}
            <Route path="/historico" element={<HistoryRedirect />} />
            <Route path="/analise" element={<AnalyticsPage />} />
            <Route path="/compras" element={<PurchasesPage />} />
            <Route path="/cadastros" element={<CatalogPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  );
}
