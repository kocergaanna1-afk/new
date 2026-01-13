'use client'

import { useState, useEffect } from 'react'

export default function SettlementsReportPage() {
  const [settlements, setSettlements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettlements()
  }, [])

  const fetchSettlements = async () => {
    try {
      const res = await fetch('/api/reports/settlements')
      const data = await res.json()
      setSettlements(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Взаиморасчёты</h1>
      {loading ? <p>Загрузка...</p> : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Поставщик</th>
              <th className="border p-2">Закуплено</th>
              <th className="border p-2">Оплачено</th>
              <th className="border p-2">Баланс (Мы должны)</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((item) => (
              <tr key={item.supplierId}>
                <td className="border p-2">{item.supplierName}</td>
                <td className="border p-2">{item.totalPurchased.toFixed(2)}</td>
                <td className="border p-2">{item.totalPaid.toFixed(2)}</td>
                <td className="border p-2 font-bold">{item.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
