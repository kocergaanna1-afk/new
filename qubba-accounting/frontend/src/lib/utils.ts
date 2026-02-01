import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = 'RUB',
  locale: string = 'ru-RU'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(
  amount: number,
  decimals: number = 2,
  locale: string = 'ru-RU'
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatDate(
  date: string | Date,
  locale: string = 'ru-RU'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(
  date: string | Date,
  locale: string = 'ru-RU'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function getAccountTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    active: 'Активный',
    passive: 'Пассивный',
    active_passive: 'Активно-пассивный',
  };
  return labels[type] || type;
}

export function getPostingStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    posted: 'Проведён',
    cancelled: 'Отменён',
  };
  return labels[status] || status;
}

export function getPostingStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-800',
    posted: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

export function getUserRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    admin: 'Администратор',
    chief_accountant: 'Главный бухгалтер',
    accountant: 'Бухгалтер',
    hr_manager: 'Кадровик',
    viewer: 'Просмотр',
  };
  return labels[role] || role;
}

export function getTaxSystemLabel(taxSystem: string): string {
  const labels: Record<string, string> = {
    osno: 'ОСНО',
    usn_6: 'УСН (доходы)',
    usn_15: 'УСН (доходы-расходы)',
    eshn: 'ЕСХН',
    patent: 'Патент',
  };
  return labels[taxSystem] || taxSystem;
}
