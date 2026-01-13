'use client'

import { useState, useEffect } from 'react'

export default function StockReportPage() {
  const [stocks, setStocks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStocks()
  }, [])

  const fetchStocks = async () => {
    try {
      const res = await fetch('/api/reports/stock')
      const data = await res.json()
      setStocks(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Отчет по остаткам</h1>
      {loading ? <p>Загрузка...</p> : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">Склад</th>
              <th className="border p-2">Товар</th>
              <th className="border p-2">Количество</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.id}>
                <td className="border p-2">{stock.warehouse.name}</td>
                <td className="border p-2">{stock.product.name}</td>
                <td className="border p-2">{stock.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
