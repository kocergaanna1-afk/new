import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Printer } from 'lucide-react';
import { reportsApi } from '../../api/reports';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components/ui/Table';
import { formatNumber } from '../../lib/utils';

export function TrialBalancePage() {
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth.toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(currentDate.toISOString().split('T')[0]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['trial-balance', dateFrom, dateTo],
    queryFn: () => reportsApi.getTrialBalance(dateFrom, dateTo),
    enabled: !!dateFrom && !!dateTo,
  });

  const formatAmount = (amount: number) => {
    if (amount === 0) return '—';
    return formatNumber(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Оборотно-сальдовая ведомость</h1>
          <p className="text-gray-500">Сводные данные по счетам за период</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Экспорт в Excel
          </Button>
          <Button variant="secondary">
            <Printer className="w-4 h-4 mr-2" />
            Печать
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex items-end gap-4">
          <Input
            type="date"
            label="Период с"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            type="date"
            label="по"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          <Button onClick={() => refetch()}>Сформировать</Button>
        </div>
      </Card>

      {/* Report */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : data ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th
                    rowSpan={2}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase border-r border-gray-200"
                  >
                    Счёт
                  </th>
                  <th
                    colSpan={2}
                    className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200"
                  >
                    Сальдо на начало
                  </th>
                  <th
                    colSpan={2}
                    className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase border-r border-gray-200"
                  >
                    Обороты за период
                  </th>
                  <th
                    colSpan={2}
                    className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    Сальдо на конец
                  </th>
                </tr>
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r border-gray-100">
                    Дебет
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r border-gray-200">
                    Кредит
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r border-gray-100">
                    Дебет
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r border-gray-200">
                    Кредит
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase border-r border-gray-100">
                    Дебет
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Кредит
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.data.map((row) => (
                  <tr key={row.accountId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-r border-gray-200">
                      <span className="font-mono text-primary-600 font-medium">
                        {row.accountCode}
                      </span>
                      <span className="ml-2 text-gray-700">{row.accountName}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-100">
                      {formatAmount(row.openingDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-200">
                      {formatAmount(row.openingCredit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-100">
                      {formatAmount(row.turnoverDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-200">
                      {formatAmount(row.turnoverCredit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-100">
                      {formatAmount(row.closingDebit)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-sm">
                      {formatAmount(row.closingCredit)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-semibold">
                <tr>
                  <td className="px-4 py-3 border-r border-gray-200">ИТОГО</td>
                  <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-100">
                    {formatAmount(data.totals.openingDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-200">
                    {formatAmount(data.totals.openingCredit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-100">
                    {formatAmount(data.totals.turnoverDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-200">
                    {formatAmount(data.totals.turnoverCredit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm border-r border-gray-100">
                    {formatAmount(data.totals.closingDebit)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm">
                    {formatAmount(data.totals.closingCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">
              Выберите период и нажмите "Сформировать"
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
