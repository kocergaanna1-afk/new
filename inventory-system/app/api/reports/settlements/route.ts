import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplierId')

  if (!supplierId) {
      // Return summary for all suppliers
      const suppliers = await prisma.supplier.findMany({
          include: {
              documents: {
                  where: { status: 'POSTED' }, // Only consider posted documents for liability
                  include: { items: true }
              },
              payments: true
          }
      })

      const report = suppliers.map(supplier => {
          const totalPurchased = supplier.documents
            .filter(d => d.type === 'PURCHASE' || d.type === 'COMMISSION') // Add types as needed
            .reduce((acc, doc) => acc + doc.items.reduce((sum, item) => sum + item.sum, 0), 0)
          
          const totalPaid = supplier.payments.reduce((acc, p) => acc + p.amount, 0)
          
          return {
              supplierId: supplier.id,
              supplierName: supplier.name,
              totalPurchased,
              totalPaid,
              balance: totalPurchased - totalPaid // Positive = we owe them
          }
      })
      return NextResponse.json(report)
  }

  return NextResponse.json([])
}
