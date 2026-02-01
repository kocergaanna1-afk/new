import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from './components/layout/MainLayout';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { AccountsPage } from './pages/accounts/AccountsPage';
import { PostingsPage } from './pages/postings/PostingsPage';
import { CreatePostingPage } from './pages/postings/CreatePostingPage';
import { TrialBalancePage } from './pages/reports/TrialBalancePage';
import { useAuthStore } from './stores/auth';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Placeholder pages
const PlaceholderPage = ({ title }: { title: string }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-500">Раздел в разработке</p>
    </div>
  </div>
);

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />

            {/* Documents */}
            <Route path="/documents" element={<PlaceholderPage title="Документы" />} />
            <Route path="/documents/incoming" element={<PlaceholderPage title="Входящие документы" />} />
            <Route path="/documents/outgoing" element={<PlaceholderPage title="Исходящие документы" />} />
            <Route path="/documents/bank-statements" element={<PlaceholderPage title="Банковские выписки" />} />

            {/* Directories */}
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/counterparties" element={<PlaceholderPage title="Контрагенты" />} />
            <Route path="/items" element={<PlaceholderPage title="Номенклатура" />} />
            <Route path="/employees" element={<PlaceholderPage title="Сотрудники" />} />

            {/* Operations */}
            <Route path="/postings" element={<PostingsPage />} />
            <Route path="/postings/new" element={<CreatePostingPage />} />
            <Route path="/operations/close-period" element={<PlaceholderPage title="Закрытие периода" />} />

            {/* Reports */}
            <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
            <Route path="/reports/account-card" element={<PlaceholderPage title="Карточка счёта" />} />
            <Route path="/reports/balance-sheet" element={<PlaceholderPage title="Баланс" />} />
            <Route path="/reports/analytics" element={<PlaceholderPage title="Анализ субконто" />} />

            {/* Tax */}
            <Route path="/tax/declarations" element={<PlaceholderPage title="Декларации" />} />
            <Route path="/tax/purchases-book" element={<PlaceholderPage title="Книга покупок" />} />
            <Route path="/tax/sales-book" element={<PlaceholderPage title="Книга продаж" />} />
            <Route path="/tax/kudir" element={<PlaceholderPage title="КУДиР" />} />

            {/* Payroll */}
            <Route path="/payroll/calculation" element={<PlaceholderPage title="Начисление зарплаты" />} />
            <Route path="/payroll/payslips" element={<PlaceholderPage title="Ведомости" />} />
            <Route path="/payroll/reports" element={<PlaceholderPage title="Отчёты в фонды" />} />

            {/* Integrations */}
            <Route path="/integrations/marketplaces" element={<PlaceholderPage title="Маркетплейсы" />} />
            <Route path="/integrations/banks" element={<PlaceholderPage title="Банки" />} />
            <Route path="/integrations/fns" element={<PlaceholderPage title="ФНС" />} />
            <Route path="/integrations/wms" element={<PlaceholderPage title="Qubba WMS" />} />

            {/* Settings */}
            <Route path="/settings" element={<PlaceholderPage title="Настройки" />} />
            <Route path="/settings/profile" element={<PlaceholderPage title="Профиль" />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
