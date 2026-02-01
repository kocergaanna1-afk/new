import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  Calendar,
  CreditCard,
  Users,
  Package,
} from 'lucide-react';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '../../lib/utils';
import { useAuthStore } from '../../stores/auth';

// Mock data for dashboard
const mockStats = {
  bankBalance: 1523450.50,
  receivables: 856230.00,
  payables: 432100.00,
  monthRevenue: 2150000.00,
};

const mockDeadlines = [
  { id: 1, title: 'Декларация по НДС', date: '2026-02-25', urgent: true },
  { id: 2, title: 'Страховые взносы', date: '2026-02-15', urgent: true },
  { id: 3, title: 'УСН аванс', date: '2026-02-28', urgent: false },
  { id: 4, title: 'СЗВ-М', date: '2026-02-15', urgent: true },
];

const mockRecentDocuments = [
  { id: 1, type: 'Реализация', number: 'MP-0125', counterparty: 'Wildberries', amount: 125430.00, date: '2026-02-01' },
  { id: 2, type: 'Поступление', number: '456', counterparty: 'ООО Поставщик', amount: 89500.00, date: '2026-01-31' },
  { id: 3, type: 'Платёжка', number: '89', counterparty: 'ООО Логистика', amount: 15000.00, date: '2026-01-30' },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, organizationName } = useAuthStore();

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Добро пожаловать, {user?.firstName}!
        </h1>
        <p className="text-gray-500">{organizationName}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-primary-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Остаток на счетах</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(mockStats.bankBalance)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Дебиторская задолженность</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(mockStats.receivables)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Кредиторская задолженность</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(mockStats.payables)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Выручка за месяц</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(mockStats.monthRevenue)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deadlines */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary-600" />
              Ближайшие дедлайны
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {mockDeadlines.map((deadline) => (
              <div
                key={deadline.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  {deadline.urgent && (
                    <AlertCircle className="w-4 h-4 text-danger-500 mr-2" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {deadline.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(deadline.date)}
                    </p>
                  </div>
                </div>
                {deadline.urgent && (
                  <Badge variant="danger">Срочно</Badge>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Documents */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2 text-primary-600" />
              Последние документы
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => navigate('/documents')}>
              Все документы
            </Button>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Тип
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Номер
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Контрагент
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Сумма
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                    Дата
                  </th>
                </tr>
              </thead>
              <tbody>
                {mockRecentDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{doc.type}</td>
                    <td className="py-3 px-4 text-sm text-primary-600 font-medium">
                      {doc.number}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{doc.counterparty}</td>
                    <td className="py-3 px-4 text-sm text-gray-900 text-right font-mono">
                      {formatCurrency(doc.amount)}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-500 text-right">
                      {formatDate(doc.date)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
        </CardHeader>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => navigate('/postings/new')}>
            Создать проводку
          </Button>
          <Button variant="secondary" onClick={() => navigate('/documents/bank-statements')}>
            Загрузить выписку
          </Button>
          <Button variant="secondary" onClick={() => navigate('/reports/trial-balance')}>
            Оборотно-сальдовая ведомость
          </Button>
          <Button variant="secondary" onClick={() => navigate('/tax/declarations')}>
            Сформировать декларацию
          </Button>
        </div>
      </Card>
    </div>
  );
}
