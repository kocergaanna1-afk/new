import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Filter, Download, Eye, XCircle } from 'lucide-react';
import { postingsApi, PostingFilter } from '../../api/postings';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableCell, TableHeaderCell } from '../../components/ui/Table';
import { formatCurrency, formatDate, getPostingStatusLabel, getPostingStatusColor } from '../../lib/utils';
import type { Posting } from '../../types';

export function PostingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<PostingFilter>({
    page: 1,
    limit: 50,
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['postings', filter],
    queryFn: () => postingsApi.getAll(filter),
  });

  const cancelMutation = useMutation({
    mutationFn: postingsApi.cancel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postings'] });
    },
  });

  const handleFilterChange = (key: keyof PostingFilter, value: string) => {
    setFilter((prev) => ({
      ...prev,
      [key]: value || undefined,
      page: 1,
    }));
  };

  const handleCancel = (id: string) => {
    if (window.confirm('Отменить проводку?')) {
      cancelMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Проводки</h1>
          <p className="text-gray-500">Журнал бухгалтерских проводок</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-2" />
            Фильтры
          </Button>
          <Button variant="secondary">
            <Download className="w-4 h-4 mr-2" />
            Экспорт
          </Button>
          <Button onClick={() => navigate('/postings/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Создать проводку
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              type="date"
              label="Дата с"
              value={filter.dateFrom || ''}
              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
            />
            <Input
              type="date"
              label="Дата по"
              value={filter.dateTo || ''}
              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
            />
            <Input
              label="Код счёта"
              placeholder="41.01"
              value={filter.accountCode || ''}
              onChange={(e) => handleFilterChange('accountCode', e.target.value)}
            />
            <div className="flex items-end">
              <Button
                variant="secondary"
                onClick={() => setFilter({ page: 1, limit: 50 })}
                className="w-full"
              >
                Сбросить
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Postings Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : data && data.data.length > 0 ? (
          <>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Дата</TableHeaderCell>
                  <TableHeaderCell>Дебет</TableHeaderCell>
                  <TableHeaderCell>Кредит</TableHeaderCell>
                  <TableHeaderCell numeric>Сумма</TableHeaderCell>
                  <TableHeaderCell>Описание</TableHeaderCell>
                  <TableHeaderCell>Статус</TableHeaderCell>
                  <TableHeaderCell>Действия</TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {data.data.map((posting) => (
                  <TableRow key={posting.id}>
                    <TableCell>{formatDate(posting.postingDate)}</TableCell>
                    <TableCell>
                      <span className="font-mono text-primary-600">
                        {posting.debitAccount.code}
                      </span>
                      <span className="text-gray-500 ml-2 text-xs">
                        {posting.debitAccount.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-primary-600">
                        {posting.creditAccount.code}
                      </span>
                      <span className="text-gray-500 ml-2 text-xs">
                        {posting.creditAccount.name}
                      </span>
                    </TableCell>
                    <TableCell numeric>
                      {formatCurrency(posting.amount)}
                    </TableCell>
                    <TableCell>
                      <span className="truncate max-w-xs block">
                        {posting.description || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          posting.status === 'posted'
                            ? 'success'
                            : posting.status === 'cancelled'
                            ? 'danger'
                            : 'warning'
                        }
                      >
                        {getPostingStatusLabel(posting.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <button
                          className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
                          title="Просмотр"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {posting.status === 'posted' && (
                          <button
                            onClick={() => handleCancel(posting.id)}
                            className="p-1 text-gray-500 hover:text-danger-600 hover:bg-gray-100 rounded"
                            title="Отменить"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Показано {data.data.length} из {data.total} записей
              </p>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={filter.page === 1}
                  onClick={() =>
                    setFilter((prev) => ({ ...prev, page: (prev.page || 1) - 1 }))
                  }
                >
                  Назад
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={data.data.length < (filter.limit || 50)}
                  onClick={() =>
                    setFilter((prev) => ({ ...prev, page: (prev.page || 1) + 1 }))
                  }
                >
                  Вперёд
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">Проводки не найдены</p>
            <Button onClick={() => navigate('/postings/new')}>
              <Plus className="w-4 h-4 mr-2" />
              Создать первую проводку
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
