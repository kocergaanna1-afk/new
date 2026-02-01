import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { authApi, RegisterDto } from '../../api/auth';
import { useAuthStore } from '../../stores/auth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';

const registerSchema = z.object({
  email: z.string().email('Введите корректный email'),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  confirmPassword: z.string(),
  firstName: z.string().min(1, 'Введите имя'),
  lastName: z.string().min(1, 'Введите фамилию'),
  middleName: z.string().optional(),
  organizationName: z.string().min(1, 'Введите название организации'),
  inn: z.string().min(10, 'ИНН должен содержать 10 или 12 цифр').max(12),
  kpp: z.string().optional(),
  taxSystem: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
});

type RegisterForm = z.infer<typeof registerSchema>;

const taxSystemOptions = [
  { value: 'usn_6', label: 'УСН (доходы 6%)' },
  { value: 'usn_15', label: 'УСН (доходы-расходы 15%)' },
  { value: 'osno', label: 'ОСНО' },
  { value: 'patent', label: 'Патент' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      taxSystem: 'usn_6',
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data: RegisterDto) => authApi.register(data),
    onSuccess: (response) => {
      setTokens(response.accessToken, response.refreshToken);
      setUser(response.user, response.user.organizationName);
      navigate('/');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    },
  });

  const onSubmit = (data: RegisterForm) => {
    setError(null);
    const { confirmPassword, taxSystem, ...registerData } = data;
    registerMutation.mutate(registerData);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Qubba <span className="text-primary-600">Accounting</span>
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Регистрация новой организации
          </p>
        </div>

        <Card className="mt-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Данные организации</h3>
            </div>

            <Input
              id="organizationName"
              label="Название организации"
              placeholder="ООО «Компания»"
              error={errors.organizationName?.message}
              {...register('organizationName')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="inn"
                label="ИНН"
                placeholder="1234567890"
                error={errors.inn?.message}
                {...register('inn')}
              />
              <Input
                id="kpp"
                label="КПП (для ООО)"
                placeholder="123456789"
                error={errors.kpp?.message}
                {...register('kpp')}
              />
            </div>

            <Select
              id="taxSystem"
              label="Система налогообложения"
              options={taxSystemOptions}
              {...register('taxSystem')}
            />

            <div className="border-b border-gray-200 pb-4 mb-4 pt-4">
              <h3 className="text-lg font-medium text-gray-900">Данные пользователя</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="lastName"
                label="Фамилия"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
              <Input
                id="firstName"
                label="Имя"
                error={errors.firstName?.message}
                {...register('firstName')}
              />
            </div>

            <Input
              id="middleName"
              label="Отчество"
              {...register('middleName')}
            />

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="user@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                id="password"
                type="password"
                label="Пароль"
                error={errors.password?.message}
                {...register('password')}
              />
              <Input
                id="confirmPassword"
                type="password"
                label="Подтверждение"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />
            </div>

            {error && (
              <div className="p-3 bg-danger-50 border border-danger-200 rounded-md">
                <p className="text-sm text-danger-600">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              loading={registerMutation.isPending}
            >
              Зарегистрироваться
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
                Войти
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
