import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { RequireAuth } from './components/RequireAuth';
import { CashierPage } from './pages/CashierPage';
import { LoginPage } from './pages/LoginPage';

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/caixa" replace />} />
          <Route path="/caixa" element={<CashierPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
