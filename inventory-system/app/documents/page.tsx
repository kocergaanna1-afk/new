'use client'

import { useState, useEffect } from 'react'

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents')
      if (!res.ok) throw new Error('Failed to fetch documents')
      const data = await res.json()
      setDocuments(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Документы</h1>

      {error && <div className="text-red-500 mb-4">{error}</div>}
      
      <div className="flex justify-between items-center mb-4">
          <p className="text-gray-600">Список документов</p>
          <a href="/documents/new" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
              + Создать документ
          </a>
      </div>

      {loading ? (
        <p>Загрузка...</p>
      ) : (
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2 text-left">Номер</th>
              <th className="border p-2 text-left">Тип</th>
              <th className="border p-2 text-left">Дата</th>
              <th className="border p-2 text-left">Статус</th>
              <th className="border p-2 text-left">Поставщик / Склады</th>
              <th className="border p-2 text-left">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="border p-2">{doc.number}</td>
                <td className="border p-2">{doc.type}</td>
                <td className="border p-2">{new Date(doc.date).toLocaleDateString()}</td>
                <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-sm ${doc.status === 'POSTED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {doc.status}
                    </span>
                </td>
                <td className="border p-2">
                    {doc.supplier && <div>Поставщик: {doc.supplier.name}</div>}
                    {doc.sourceWarehouse && <div>Откуда: {doc.sourceWarehouse.name}</div>}
                    {doc.destWarehouse && <div>Куда: {doc.destWarehouse.name}</div>}
                </td>
                <td className="border p-2">
                    {doc.items.reduce((acc: number, item: any) => acc + item.sum, 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
