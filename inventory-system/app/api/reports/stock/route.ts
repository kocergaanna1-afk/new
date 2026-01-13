import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const warehouseId = searchParams.get('warehouseId')

  const where: any = {}
  if (warehouseId) {
      where.warehouseId = warehouseId
  }

  const stocks = await prisma.stock.findMany({
    where,
    include: {
      product: true,
      warehouse: true
    }
  })
  return NextResponse.json(stocks)
}
