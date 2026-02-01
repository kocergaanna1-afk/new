import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { accountsApi } from '../../api/accounts';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { getAccountTypeLabel } from '../../lib/utils';
import type { Account } from '../../types';

interface AccountRowProps {
  account: Account;
  level: number;
  expandedAccounts: Set<string>;
  toggleExpand: (id: string) => void;
  onEdit: (account: Account) => void;
  onDelete: (account: Account) => void;
}

function AccountRow({
  account,
  level,
  expandedAccounts,
  toggleExpand,
  onEdit,
  onDelete,
}: AccountRowProps) {
  const hasChildren = account.children && account.children.length > 0;
  const isExpanded = expandedAccounts.has(account.id);

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="py-3 px-4">
          <div className="flex items-center" style={{ paddingLeft: `${level * 20}px` }}>
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(account.id)}
                className="p-1 hover:bg-gray-200 rounded mr-2"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            ) : (
              <span className="w-6 mr-2" />
            )}
            <span className="font-mono text-primary-600 font-medium">
              {account.code}
            </span>
          </div>
        </td>
        <td className="py-3 px-4 text-gray-900">{account.name}</td>
        <td className="py-3 px-4">
          <Badge
            variant={
              account.type === 'active'
                ? 'info'
                : account.type === 'passive'
                ? 'warning'
                : 'default'
            }
          >
            {getAccountTypeLabel(account.type)}
          </Badge>
        </td>
        <td className="py-3 px-4">
          {account.isActive ? (
            <Badge variant="success">Активен</Badge>
          ) : (
            <Badge variant="danger">Неактивен</Badge>
          )}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(account)}
              className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded"
              title="Редактировать"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {!account.isSystem && (
              <button
                onClick={() => onDelete(account)}
                className="p-1 text-gray-500 hover:text-danger-600 hover:bg-gray-100 rounded"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
      {isExpanded &&
        account.children?.map((child) => (
          <AccountRow
            key={child.id}
            account={child}
            level={level + 1}
            expandedAccounts={expandedAccounts}
            toggleExpand={toggleExpand}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
    </>
  );
}

export function AccountsPage() {
  const queryClient = useQueryClient();
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  const { data: accounts, isLoading, error } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const initializeMutation = useMutation({
    mutationFn: accountsApi.initializeStandard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (accounts) {
      const allIds = new Set<string>();
      const collectIds = (accs: Account[]) => {
        accs.forEach((acc) => {
          if (acc.children && acc.children.length > 0) {
            allIds.add(acc.id);
            collectIds(acc.children);
          }
        });
      };
      collectIds(accounts);
      setExpandedAccounts(allIds);
    }
  };

  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  const handleEdit = (account: Account) => {
    // TODO: Open edit modal
    console.log('Edit account:', account);
  };

  const handleDelete = (account: Account) => {
    // TODO: Confirm and delete
    console.log('Delete account:', account);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="text-center py-8">
          <p className="text-danger-600 mb-4">Ошибка загрузки плана счетов</p>
          <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })}>
            Повторить
          </Button>
        </div>
      </Card>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Card>
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            План счетов не настроен
          </h3>
          <p className="text-gray-500 mb-6">
            Инициализируйте стандартный план счетов РФ для начала работы
          </p>
          <Button
            onClick={() => initializeMutation.mutate()}
            loading={initializeMutation.isPending}
          >
            Инициализировать план счетов
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">План счетов</h1>
          <p className="text-gray-500">Управление счетами бухгалтерского учёта</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="secondary" size="sm" onClick={expandAll}>
            Развернуть все
          </Button>
          <Button variant="secondary" size="sm" onClick={collapseAll}>
            Свернуть все
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Добавить счёт
          </Button>
        </div>
      </div>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Код счёта
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Наименование
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Тип
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Статус
                </th>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  level={0}
                  expandedAccounts={expandedAccounts}
                  toggleExpand={toggleExpand}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
