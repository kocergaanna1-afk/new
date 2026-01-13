import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const products = await prisma.product.findMany()
  return NextResponse.json(products)
}

export async function POST(request: Request) {
  const data = await request.json()
  try {
      const product = await prisma.product.create({
        data: {
          name: data.name,
          barcode: data.barcode,
          sku: data.sku,
          vatRate: parseFloat(data.vatRate) || 0,
        },
      })
      return NextResponse.json(product)
  } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
