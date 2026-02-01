import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { postingsApi } from '../../api/postings';
import { accountsApi } from '../../api/accounts';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { Account } from '../../types';

const postingSchema = z.object({
  postingDate: z.string().min(1, 'Выберите дату'),
  debitAccountCode: z.string().min(1, 'Выберите счёт дебета'),
  creditAccountCode: z.string().min(1, 'Выберите счёт кредита'),
  amount: z.coerce.number().min(0.01, 'Сумма должна быть больше 0'),
  description: z.string().optional(),
});

type PostingForm = z.infer<typeof postingSchema>;

function flattenAccounts(accounts: Account[], prefix = ''): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  
  for (const account of accounts) {
    result.push({
      value: account.code,
      label: `${account.code} — ${account.name}`,
    });
    
    if (account.children && account.children.length > 0) {
      result.push(...flattenAccounts(account.children, account.code));
    }
  }
  
  return result;
}

export function CreatePostingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAll,
  });

  const accountOptions = accounts ? flattenAccounts(accounts) : [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<PostingForm>({
    resolver: zodResolver(postingSchema),
    defaultValues: {
      postingDate: new Date().toISOString().split('T')[0],
    },
  });

  const createMutation = useMutation({
    mutationFn: postingsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['postings'] });
      navigate('/postings');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ошибка создания проводки');
    },
  });

  const onSubmit = (data: PostingForm) => {
    setError(null);
    createMutation.mutate(data);
  };

  const watchDebit = watch('debitAccountCode');
  const watchCredit = watch('creditAccountCode');

  const debitAccount = accounts && watchDebit
    ? flattenAccounts(accounts).find((a) => a.value === watchDebit)
    : null;
  const creditAccount = accounts && watchCredit
    ? flattenAccounts(accounts).find((a) => a.value === watchCredit)
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Новая проводка</h1>
          <p className="text-gray-500">Создание ручной бухгалтерской проводки</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Основные данные</CardTitle>
          </CardHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              type="date"
              label="Дата проводки"
              error={errors.postingDate?.message}
              {...register('postingDate')}
            />

            <Input
              type="number"
              step="0.01"
              label="Сумма, ₽"
              placeholder="0.00"
              error={errors.amount?.message}
              {...register('amount')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <Select
                label="Счёт дебета"
                options={accountOptions}
                placeholder="Выберите счёт"
                error={errors.debitAccountCode?.message}
                {...register('debitAccountCode')}
              />
              {debitAccount && (
                <p className="mt-1 text-sm text-gray-500">
                  Выбран: {debitAccount.label}
                </p>
              )}
            </div>

            <div>
              <Select
                label="Счёт кредита"
                options={accountOptions}
                placeholder="Выберите счёт"
                error={errors.creditAccountCode?.message}
                {...register('creditAccountCode')}
              />
              {creditAccount && (
                <p className="mt-1 text-sm text-gray-500">
                  Выбран: {creditAccount.label}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <label className="label">Описание / Содержание операции</label>
            <textarea
              className="input min-h-[100px]"
              placeholder="Например: Оплата поставщику по счёту №123"
              {...register('description')}
            />
          </div>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Предварительный просмотр</CardTitle>
          </CardHeader>

          <div className="bg-gray-50 rounded-lg p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="pb-2">Дебет</th>
                  <th className="pb-2">Кредит</th>
                  <th className="pb-2 text-right">Сумма</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="py-2">
                    <span className="font-mono text-primary-600">
                      {watchDebit || '—'}
                    </span>
                    {debitAccount && (
                      <span className="text-gray-500 ml-2">
                        {debitAccount.label.split(' — ')[1]}
                      </span>
                    )}
                  </td>
                  <td className="py-2">
                    <span className="font-mono text-primary-600">
                      {watchCredit || '—'}
                    </span>
                    {creditAccount && (
                      <span className="text-gray-500 ml-2">
                        {creditAccount.label.split(' — ')[1]}
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-right font-mono">
                    {watch('amount')
                      ? new Intl.NumberFormat('ru-RU', {
                          style: 'currency',
                          currency: 'RUB',
                        }).format(Number(watch('amount')))
                      : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {error && (
          <div className="p-4 bg-danger-50 border border-danger-200 rounded-md">
            <p className="text-sm text-danger-600">{error}</p>
          </div>
        )}

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Отмена
          </Button>
          <Button type="submit" loading={createMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            Провести
          </Button>
        </div>
      </form>
    </div>
  );
}
