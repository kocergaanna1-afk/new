import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const payments = await prisma.payment.findMany({
    include: {
      supplier: true,
      document: true
    },
    orderBy: {
        date: 'desc'
    }
  })
  return NextResponse.json(payments)
}

export async function POST(request: Request) {
  const data = await request.json()
  try {
      const payment = await prisma.payment.create({
        data: {
          supplierId: data.supplierId,
          documentId: data.documentId || null,
          date: data.date ? new Date(data.date) : new Date(),
          amount: parseFloat(data.amount),
          type: data.type
        },
      })
      return NextResponse.json(payment)
  } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
