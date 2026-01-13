'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewPaymentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [suppliers, setSuppliers] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])

  const [formData, setFormData] = useState({
    supplierId: '',
    documentId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'PAYMENT'
  })

  useEffect(() => {
    fetch('/api/suppliers').then(r => r.json()).then(setSuppliers)
    fetch('/api/documents').then(r => r.json()).then(setDocuments)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create payment')
      }

      router.push('/payments')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Filter documents by selected supplier
  const filteredDocuments = documents.filter(d => 
    (!formData.supplierId || d.supplierId === formData.supplierId) && 
    (d.status === 'POSTED')
  )

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Новый платеж</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Поставщик</label>
          <select
            className="w-full p-2 border rounded"
            value={formData.supplierId}
            onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
            required
          >
            <option value="">Выберите поставщика...</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Дата</label>
          <input
            type="date"
            className="w-full p-2 border rounded"
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Тип операции</label>
          <select
            className="w-full p-2 border rounded"
            value={formData.type}
            onChange={e => setFormData({ ...formData, type: e.target.value })}
          >
            <option value="PAYMENT">Оплата поставки</option>
            <option value="PREPAYMENT">Предоплата</option>
            <option value="COMMISSION_OFFSET">Зачёт комиссии</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Сумма</label>
          <input
            type="number"
            className="w-full p-2 border rounded"
            value={formData.amount}
            onChange={e => setFormData({ ...formData, amount: e.target.value })}
            min="0.01"
            step="0.01"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Привязать к документу (необязательно)</label>
          <select
            className="w-full p-2 border rounded"
            value={formData.documentId}
            onChange={e => setFormData({ ...formData, documentId: e.target.value })}
          >
            <option value="">Без привязки</option>
            {filteredDocuments.map(d => (
              <option key={d.id} value={d.id}>
                {d.number} от {new Date(d.date).toLocaleDateString()} ({d.type})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Сохранение...' : 'Создать платеж'}
          </button>
        </div>
      </form>
    </div>
  )
}
