import path from 'path'
import { config } from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// Load env from local files inside the app
config({ path: path.resolve(process.cwd(), '.env') })
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Start seeding...')

  await prisma.fixedCostDefinition.deleteMany()

  await prisma.fixedCostDefinition.createMany({
    data: [
      { name: 'Осигуровки (За държавата)', amount: 153.14 },
      { name: 'Такса банка (ДСК)', amount: 10.0 },
      { name: 'Shopify MyGiftStory', amount: 27.0 },
      { name: 'Shopify Elence', amount: 27.0 },
      { name: 'Klaviyo', amount: 51.0 },
      { name: 'Suno', amount: 9.0 },
    ],
  })

  console.log('Seeding finished.')
}

main()
  .then(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    await pool.end()
    process.exit(1)
  })
