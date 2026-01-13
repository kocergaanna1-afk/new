'use client'

import { useState, useEffect } from 'react'

interface Product {
  id: string
  name: string
  barcode: string | null
  sku: string | null
  vatRate: number
  createdAt: string
  updatedAt: string
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newProduct, setNewProduct] = useState({
    name: '',
    barcode: '',
    sku: '',
    vatRate: 20,
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products')
      if (!res.ok) throw new Error('Failed to fetch products')
      const data = await res.json()
      setProducts(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      })
      if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to create product')
      }
      await fetchProducts()
      setNewProduct({ name: '', barcode: '', sku: '', vatRate: 20 })
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Товары</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      <div className="mb-8 p-4 border rounded shadow">
        <h2 className="text-xl mb-4">Добавить новый товар</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1">Наименование</label>
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full p-2 border rounded"
              required
            />
          </div>
          <div>
            <label className="block mb-1">Штрихкод</label>
            <input
              type="text"
              value={newProduct.barcode}
              onChange={(e) => setNewProduct({ ...newProduct, barcode: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Артикул</label>
            <input
              type="text"
              value={newProduct.sku}
              onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value })}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block mb-1">Ставка НДС (%)</label>
            <input
              type="number"
              value={newProduct.vatRate}
              onChange={(e) => setNewProduct({ ...newProduct, vatRate: parseFloat(e.target.value) })}
              className="w-full p-2 border rounded"
            />
          </div>
          <button type="submit" className="col-span-2 bg-green-500 text-white p-2 rounded hover:bg-green-600">
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
              <th className="border p-2 text-left">Штрихкод</th>
              <th className="border p-2 text-left">Артикул</th>
              <th className="border p-2 text-left">НДС</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-gray-50">
                <td className="border p-2">{product.name}</td>
                <td className="border p-2">{product.barcode}</td>
                <td className="border p-2">{product.sku}</td>
                <td className="border p-2">{product.vatRate}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
