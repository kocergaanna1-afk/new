import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  BookOpen,
  ClipboardList,
  BarChart3,
  Receipt,
  Users,
  Link2,
  Settings,
  ChevronDown,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState } from 'react';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: { name: string; href: string }[];
}

const navigation: NavItem[] = [
  { name: 'Рабочий стол', href: '/', icon: LayoutDashboard },
  {
    name: 'Документы',
    href: '/documents',
    icon: FileText,
    children: [
      { name: 'Входящие', href: '/documents/incoming' },
      { name: 'Исходящие', href: '/documents/outgoing' },
      { name: 'Банковские выписки', href: '/documents/bank-statements' },
    ],
  },
  {
    name: 'Справочники',
    href: '/directories',
    icon: BookOpen,
    children: [
      { name: 'План счетов', href: '/accounts' },
      { name: 'Контрагенты', href: '/counterparties' },
      { name: 'Номенклатура', href: '/items' },
      { name: 'Сотрудники', href: '/employees' },
    ],
  },
  {
    name: 'Операции',
    href: '/operations',
    icon: ClipboardList,
    children: [
      { name: 'Проводки', href: '/postings' },
      { name: 'Ручные проводки', href: '/postings/new' },
      { name: 'Закрытие периода', href: '/operations/close-period' },
    ],
  },
  {
    name: 'Отчёты',
    href: '/reports',
    icon: BarChart3,
    children: [
      { name: 'Оборотно-сальдовая', href: '/reports/trial-balance' },
      { name: 'Карточка счёта', href: '/reports/account-card' },
      { name: 'Баланс', href: '/reports/balance-sheet' },
      { name: 'Анализ субконто', href: '/reports/analytics' },
    ],
  },
  {
    name: 'Налоги',
    href: '/tax',
    icon: Receipt,
    children: [
      { name: 'Декларации', href: '/tax/declarations' },
      { name: 'Книга покупок', href: '/tax/purchases-book' },
      { name: 'Книга продаж', href: '/tax/sales-book' },
      { name: 'КУДиР', href: '/tax/kudir' },
    ],
  },
  {
    name: 'Зарплата',
    href: '/payroll',
    icon: Users,
    children: [
      { name: 'Начисление', href: '/payroll/calculation' },
      { name: 'Ведомости', href: '/payroll/payslips' },
      { name: 'Отчёты в фонды', href: '/payroll/reports' },
    ],
  },
  {
    name: 'Интеграции',
    href: '/integrations',
    icon: Link2,
    children: [
      { name: 'Маркетплейсы', href: '/integrations/marketplaces' },
      { name: 'Банки', href: '/integrations/banks' },
      { name: 'ФНС', href: '/integrations/fns' },
      { name: 'Qubba WMS', href: '/integrations/wms' },
    ],
  },
  { name: 'Настройки', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const [expandedItems, setExpandedItems] = useState<string[]>(['Справочники', 'Операции', 'Отчёты']);

  const toggleExpand = (name: string) => {
    setExpandedItems((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900 min-h-screen">
      {/* Logo */}
      <div className="flex items-center h-16 px-4 bg-gray-800">
        <span className="text-xl font-bold text-white">Qubba</span>
        <span className="ml-2 text-xl font-light text-primary-400">Accounting</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isExpanded = expandedItems.includes(item.name);
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.name}>
              {hasChildren ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.name)}
                    className={cn(
                      'w-full flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      'text-gray-300 hover:bg-gray-800 hover:text-white',
                      'transition-colors duration-150'
                    )}
                  >
                    <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                    <span className="flex-1 text-left">{item.name}</span>
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                  </button>
                  {isExpanded && (
                    <div className="mt-1 ml-8 space-y-1">
                      {item.children.map((child) => (
                        <NavLink
                          key={child.href}
                          to={child.href}
                          className={({ isActive }) =>
                            cn(
                              'block px-3 py-2 text-sm rounded-md',
                              isActive
                                ? 'bg-gray-800 text-white'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                            )
                          }
                        >
                          {child.name}
                        </NavLink>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <NavLink
                  to={item.href}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center px-3 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white',
                      'transition-colors duration-150'
                    )
                  }
                >
                  <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                  {item.name}
                </NavLink>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
