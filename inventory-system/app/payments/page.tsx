'use client'

import { useState, useEffect } from 'react'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchPayments()
  }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments')
      if (!res.ok) throw new Error('Failed to fetch payments')
      const data = await res.json()
      setPayments(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Платежи</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      <div className="mb-4">
          <p className="text-gray-600">Для создания платежа используйте API.</p>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Дата</th>
              <th className="border p-2 text-left">Поставщик</th>
              <th className="border p-2 text-left">Тип</th>
              <th className="border p-2 text-left">Сумма</th>
              <th className="border p-2 text-left">Документ</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="hover:bg-gray-50">
                <td className="border p-2">{new Date(payment.date).toLocaleDateString()}</td>
                <td className="border p-2">{payment.supplier?.name}</td>
                <td className="border p-2">{payment.type}</td>
                <td className="border p-2">{payment.amount.toFixed(2)}</td>
                <td className="border p-2">{payment.document?.number}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
