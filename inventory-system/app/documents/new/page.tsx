'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NewDocumentPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Data for selects
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [warehouses, setWarehouses] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])

  // Form state
  const [formData, setFormData] = useState({
    type: 'PURCHASE',
    number: '',
    date: new Date().toISOString().split('T')[0],
    supplierId: '',
    sourceWarehouseId: '',
    destWarehouseId: '',
    status: 'DRAFT'
  })

  // Items state
  const [items, setItems] = useState<{ productId: string; quantity: number; price: number }[]>([])

  useEffect(() => {
    // Load helper data
    Promise.all([
      fetch('/api/suppliers').then(r => r.json()),
      fetch('/api/warehouses').then(r => r.json()),
      fetch('/api/products').then(r => r.json())
    ]).then(([s, w, p]) => {
      setSuppliers(s)
      setWarehouses(w)
      setProducts(p)
    })
  }, [])

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, price: 0 }])
  }

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    setItems(newItems)
  }

  const removeItem = (index: number) => {
    const newItems = [...items]
    newItems.splice(index, 1)
    setItems(newItems)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const payload = {
        ...formData,
        items: items.map(i => ({
          ...i,
          quantity: Number(i.quantity),
          price: Number(i.price)
        }))
      }

      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create document')
      }

      router.push('/documents')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Новый документ</h1>
      
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Тип документа</label>
            <select
              className="w-full p-2 border rounded"
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value })}
            >
              <option value="PURCHASE">Закупка</option>
              <option value="COMMISSION">Приёмка на комиссию</option>
              <option value="SALE">Продажа</option>
              <option value="TRANSFER">Перемещение</option>
              <option value="OPENING_BALANCE">Начальные остатки</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Номер</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              value={formData.number}
              onChange={e => setFormData({ ...formData, number: e.target.value })}
              required
            />
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
            <label className="block text-sm font-medium mb-1">Статус</label>
            <select
              className="w-full p-2 border rounded"
              value={formData.status}
              onChange={e => setFormData({ ...formData, status: e.target.value })}
            >
              <option value="DRAFT">Черновик</option>
              <option value="APPROVED">Утверждён</option>
              <option value="POSTED">Проведён</option>
            </select>
          </div>
        </div>

        {/* Conditional Fields based on Type */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded">
          {['PURCHASE', 'COMMISSION'].includes(formData.type) && (
            <div>
              <label className="block text-sm font-medium mb-1">Поставщик</label>
              <select
                className="w-full p-2 border rounded"
                value={formData.supplierId}
                onChange={e => setFormData({ ...formData, supplierId: e.target.value })}
              >
                <option value="">Выберите поставщика...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {['TRANSFER', 'SALE'].includes(formData.type) && (
            <div>
              <label className="block text-sm font-medium mb-1">Склад источник (Откуда)</label>
              <select
                className="w-full p-2 border rounded"
                value={formData.sourceWarehouseId}
                onChange={e => setFormData({ ...formData, sourceWarehouseId: e.target.value })}
              >
                <option value="">Выберите склад...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}

          {['PURCHASE', 'COMMISSION', 'TRANSFER', 'OPENING_BALANCE'].includes(formData.type) && (
            <div>
              <label className="block text-sm font-medium mb-1">Склад назначения (Куда)</label>
              <select
                className="w-full p-2 border rounded"
                value={formData.destWarehouseId}
                onChange={e => setFormData({ ...formData, destWarehouseId: e.target.value })}
              >
                <option value="">Выберите склад...</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Items Table */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-medium">Товары</h3>
            <button
              type="button"
              onClick={addItem}
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              + Добавить строку
            </button>
          </div>

          <table className="w-full border-collapse border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Товар</th>
                <th className="border p-2 w-24">Кол-во</th>
                <th className="border p-2 w-32">Цена</th>
                <th className="border p-2 w-32">Сумма</th>
                <th className="border p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td className="border p-1">
                    <select
                      className="w-full p-1"
                      value={item.productId}
                      onChange={e => updateItem(idx, 'productId', e.target.value)}
                      required
                    >
                      <option value="">Выберите товар...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </td>
                  <td className="border p-1">
                    <input
                      type="number"
                      className="w-full p-1"
                      value={item.quantity}
                      onChange={e => updateItem(idx, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </td>
                  <td className="border p-1">
                    <input
                      type="number"
                      className="w-full p-1"
                      value={item.price}
                      onChange={e => updateItem(idx, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      required
                    />
                  </td>
                  <td className="border p-2 text-right">
                    {(Number(item.quantity) * Number(item.price)).toFixed(2)}
                  </td>
                  <td className="border p-1 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-gray-500">Нет товаров</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={3} className="border p-2 text-right">Итого:</td>
                <td className="border p-2 text-right">
                  {items.reduce((sum, i) => sum + (Number(i.quantity) * Number(i.price)), 0).toFixed(2)}
                </td>
                <td className="border"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="flex gap-4 pt-4 border-t">
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
            {loading ? 'Сохранение...' : 'Создать документ'}
          </button>
        </div>
      </form>
    </div>
  )
}
