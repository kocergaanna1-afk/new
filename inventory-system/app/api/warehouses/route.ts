import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const warehouses = await prisma.warehouse.findMany()
  return NextResponse.json(warehouses)
}

export async function POST(request: Request) {
  const data = await request.json()
  try {
      const warehouse = await prisma.warehouse.create({
        data: {
          name: data.name,
          location: data.location,
          responsiblePerson: data.responsiblePerson,
        },
      })
      return NextResponse.json(warehouse)
  } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
