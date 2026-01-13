'use client'

import { useState, useEffect } from 'react'

interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  contractNumber: string | null
  contractType: string | null
  createdAt: string
  updatedAt: string
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactPerson: '',
    contractNumber: '',
    contractType: '',
  })

  useEffect(() => {
    fetchSuppliers()
  }, [])

  const fetchSuppliers = async () => {
    try {
      const res = await fetch('/api/suppliers')
      if (!res.ok) throw new Error('Failed to fetch suppliers')
      const data = await res.json()
      setSuppliers(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSupplier),
      })
      if (!res.ok) throw new Error('Failed to create supplier')
      await fetchSuppliers()
      setNewSupplier({ name: '', contactPerson: '', contractNumber: '', contractType: '' })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Поставщики (Партнёры)</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl mb-4">Добавить нового поставщика</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Наименование</label>
            <input
              type="text"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Контактное лицо</label>
            <input
              type="text"
              value={newSupplier.contactPerson}
              onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Номер договора</label>
            <input
              type="text"
              value={newSupplier.contractNumber}
              onChange={(e) => setNewSupplier({ ...newSupplier, contractNumber: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Тип договора</label>
            <select
              value={newSupplier.contractType}
              onChange={(e) => setNewSupplier({ ...newSupplier, contractType: e.target.value })}
              className="w-full p-2 border rounded"
            >
              <option value="">Выберите тип...</option>
              <option value="PURCHASE">Закупка</option>
              <option value="COMMISSION">Комиссия</option>
            </select>
          </div>
          <button type="submit" className="col-span-2 bg-blue-500 text-white p-2 rounded hover:bg-blue-600">
            Добавить
          </button>
        </form>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Наименование</th>
              <th className="border p-2 text-left">Контактное лицо</th>
              <th className="border p-2 text-left">Договор</th>
              <th className="border p-2 text-left">Тип</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="hover:bg-gray-50">
                <td className="border p-2">{supplier.name}</td>
                <td className="border p-2">{supplier.contactPerson}</td>
                <td className="border p-2">{supplier.contractNumber}</td>
                <td className="border p-2">{supplier.contractType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
