'use client'

import { useState, useEffect } from 'react'

interface Warehouse {
  id: string
  name: string
  location: string | null
  responsiblePerson: string | null
  createdAt: string
  updatedAt: string
}

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newWarehouse, setNewWarehouse] = useState({
    name: '',
    location: '',
    responsiblePerson: '',
  })

  useEffect(() => {
    fetchWarehouses()
  }, [])

  const fetchWarehouses = async () => {
    try {
      const res = await fetch('/api/warehouses')
      if (!res.ok) throw new Error('Failed to fetch warehouses')
      const data = await res.json()
      setWarehouses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/warehouses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWarehouse),
      })
      if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create warehouse')
      }
      await fetchWarehouses()
      setNewWarehouse({ name: '', location: '', responsiblePerson: '' })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Склады</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl mb-4">Добавить новый склад</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Наименование</label>
            <input
              type="text"
              value={newWarehouse.name}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Локация</label>
            <input
              type="text"
              value={newWarehouse.location}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, location: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Ответственный</label>
            <input
              type="text"
              value={newWarehouse.responsiblePerson}
              onChange={(e) => setNewWarehouse({ ...newWarehouse, responsiblePerson: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <button type="submit" className="col-span-2 bg-purple-500 text-white p-2 rounded hover:bg-purple-600">
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
              <th className="border p-2 text-left">Локация</th>
              <th className="border p-2 text-left">Ответственный</th>
            </tr>
          </thead>
          <tbody>
            {warehouses.map((warehouse) => (
              <tr key={warehouse.id} className="hover:bg-gray-50">
                <td className="border p-2">{warehouse.name}</td>
                <td className="border p-2">{warehouse.location}</td>
                <td className="border p-2">{warehouse.responsiblePerson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
