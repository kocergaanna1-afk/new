import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create Suppliers
  const supplier1 = await prisma.supplier.create({
    data: {
      name: 'Tech Supplier Ltd',
      contactPerson: 'John Doe',
      contractNumber: 'CTR-001',
      contractType: 'PURCHASE',
    },
  })

  const supplier2 = await prisma.supplier.create({
    data: {
      name: 'Gadgets Inc',
      contactPerson: 'Jane Smith',
      contractNumber: 'CTR-002',
      contractType: 'COMMISSION',
    },
  })

  // Create Warehouses
  const warehouse1 = await prisma.warehouse.create({
    data: {
      name: 'Main Warehouse',
      location: 'New York',
      responsiblePerson: 'Mike Manager',
    },
  })

  const warehouse2 = await prisma.warehouse.create({
    data: {
      name: 'Secondary Warehouse',
      location: 'New Jersey',
      responsiblePerson: 'Sarah Supervisor',
    },
  })

  // Create Products
  const product1 = await prisma.product.create({
    data: {
      name: 'Laptop X1',
      barcode: '1234567890123',
      sku: 'LPT-X1',
      vatRate: 20,
    },
  })

  const product2 = await prisma.product.create({
    data: {
      name: 'Mouse Wireless',
      barcode: '9876543210987',
      sku: 'MSE-WL',
      vatRate: 20,
    },
  })

  console.log({ supplier1, supplier2, warehouse1, warehouse2, product1, product2 })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
