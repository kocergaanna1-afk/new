import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const suppliers = await prisma.supplier.findMany()
  return NextResponse.json(suppliers)
}

export async function POST(request: Request) {
  const data = await request.json()
  const supplier = await prisma.supplier.create({
    data: {
      name: data.name,
      contactPerson: data.contactPerson,
      contractNumber: data.contractNumber,
      contractType: data.contractType,
    },
  })
  return NextResponse.json(supplier)
}
