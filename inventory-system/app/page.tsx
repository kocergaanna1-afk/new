import Link from 'next/link'

export default function Home() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Система учёта</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 border rounded shadow hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">Справочники</h2>
          <ul className="space-y-2">
            <li><Link href="/suppliers" className="text-blue-500 hover:underline">Поставщики</Link></li>
            <li><Link href="/products" className="text-blue-500 hover:underline">Товары</Link></li>
            <li><Link href="/warehouses" className="text-blue-500 hover:underline">Склады</Link></li>
          </ul>
        </div>

        <div className="p-6 border rounded shadow hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">Операции</h2>
          <ul className="space-y-2">
            <li><Link href="/documents" className="text-blue-500 hover:underline">Документы (Приход/Расход)</Link></li>
            <li><Link href="/payments" className="text-blue-500 hover:underline">Платежи</Link></li>
          </ul>
        </div>

        <div className="p-6 border rounded shadow hover:shadow-lg transition">
          <h2 className="text-xl font-bold mb-2">Отчёты</h2>
          <ul className="space-y-2">
            <li><Link href="/reports/stock" className="text-blue-500 hover:underline">Остатки на складах</Link></li>
            <li><Link href="/reports/settlements" className="text-blue-500 hover:underline">Взаиморасчёты</Link></li>
          </ul>
        </div>
      </div>
    </div>
  )
}
