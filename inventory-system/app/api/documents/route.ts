import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  const documents = await prisma.document.findMany({
    include: {
      supplier: true,
      sourceWarehouse: true,
      destWarehouse: true,
      items: {
          include: {
              product: true
          }
      }
    },
    orderBy: {
        createdAt: 'desc'
    }
  })
  return NextResponse.json(documents)
}

export async function POST(request: Request) {
  const data = await request.json()
  
  try {
    // Basic validation
    if (!data.number || !data.type) {
        return NextResponse.json({ error: 'Number and Type are required' }, { status: 400 })
    }

    const document = await prisma.document.create({
      data: {
        number: data.number,
        type: data.type,
        status: data.status || 'DRAFT',
        date: data.date ? new Date(data.date) : new Date(),
        supplierId: data.supplierId || null,
        sourceWarehouseId: data.sourceWarehouseId || null,
        destWarehouseId: data.destWarehouseId || null,
        items: {
            create: data.items.map((item: any) => ({
                productId: item.productId,
                quantity: parseFloat(item.quantity),
                price: parseFloat(item.price),
                sum: parseFloat(item.quantity) * parseFloat(item.price)
            }))
        }
      },
      include: {
          items: true
      }
    })

    // If status is POSTED (проведен), update stocks
    if (document.status === 'POSTED') {
        // Logic for stock updates based on document type
        // This is a simplified version. In a real system, we'd want transactions and more complex logic.
        
        for (const item of document.items) {
             if (document.type === 'PURCHASE' || document.type === 'COMMISSION' || document.type === 'OPENING_BALANCE') {
                 // Incoming to Dest Warehouse
                 if (document.destWarehouseId) {
                     await prisma.stock.upsert({
                         where: {
                             productId_warehouseId: {
                                 productId: item.productId,
                                 warehouseId: document.destWarehouseId
                             }
                         },
                         update: {
                             quantity: { increment: item.quantity }
                         },
                         create: {
                             productId: item.productId,
                             warehouseId: document.destWarehouseId,
                             quantity: item.quantity
                         }
                     })
                 }
             } else if (document.type === 'SALE' || document.type === 'WRITE_OFF') { // Need to add WRITE_OFF to schema if not there
                  // Outgoing from Source Warehouse
                  if (document.sourceWarehouseId) {
                      await prisma.stock.upsert({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: document.sourceWarehouseId
                            }
                        },
                        update: {
                            quantity: { decrement: item.quantity }
                        },
                        create: {
                            productId: item.productId,
                            warehouseId: document.sourceWarehouseId,
                            quantity: -item.quantity // Should typically be 0 or throw error if not enough stock
                        }
                    })
                  }
             } else if (document.type === 'TRANSFER') {
                 // Move from Source to Dest
                 if (document.sourceWarehouseId && document.destWarehouseId) {
                     // Decrement source
                     await prisma.stock.upsert({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: document.sourceWarehouseId
                            }
                        },
                        update: {
                            quantity: { decrement: item.quantity }
                        },
                        create: {
                            productId: item.productId,
                            warehouseId: document.sourceWarehouseId,
                            quantity: -item.quantity
                        }
                    })
                    // Increment dest
                    await prisma.stock.upsert({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: document.destWarehouseId
                            }
                        },
                        update: {
                            quantity: { increment: item.quantity }
                        },
                        create: {
                            productId: item.productId,
                            warehouseId: document.destWarehouseId,
                            quantity: item.quantity
                        }
                    })
                 }
             }
        }
    }

    return NextResponse.json(document)
  } catch (e: any) {
    console.error(e)
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
