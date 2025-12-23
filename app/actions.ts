'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

// Тази функция се вика, когато натиснеш бутона "Добави Поръчка"
export async function createOrder(formData: FormData) {
  
  // 1. Взимаме данните от формата
  const orderNumber = formData.get('orderNumber') as string
  const totalAmount = parseFloat(formData.get('totalAmount') as string) // Цена за клиента
  const productCost = parseFloat(formData.get('productCost') as string) // Нашата цена
  const shippingCost = parseFloat(formData.get('shippingCost') as string) // Доставка
  const paymentMethod = formData.get('paymentMethod') as string // "COD" или "Card"
  const itemType = formData.get('itemType') as string // "Малка" или "Голяма"

  // 2. Логика за такси (Онлайн плащания)
  let gatewayFee = 0
  if (paymentMethod === 'Card') {
    // Формула: 0.26€ + 1.9% от сумата
    gatewayFee = 0.26 + (totalAmount * 0.019)
  }

  // 3. Логика за заключване на прихода
  // Ако е с карта -> парите са наши веднага (false)
  // Ако е наложен платеж -> парите са заключени (true)
  const isRevenueLocked = paymentMethod === 'COD'

  // 4. Записваме в базата
  await prisma.order.create({
    data: {
      id: Math.random().toString(36).substr(2, 9), // Генерираме служебно ID (по-късно ще идва от Shopify)
      orderNumber: `#${orderNumber}`,
      createdAt: new Date(),
      paymentMethod: paymentMethod,
      totalAmount: totalAmount,
      productCost: productCost,
      shippingCost: shippingCost,
      gatewayFee: gatewayFee, // Забравихме да го добавим в схемата, но сега ще го ползваме за сметки
      isRevenueLocked: isRevenueLocked,
      // Ако парите не са заключени, значи са взети сега
      unlockedAt: isRevenueLocked ? null : new Date(),
      
      // Добавяме продукта
      items: {
        create: {
          productName: itemType === 'small' ? 'Играчка с песен (Малка)' : 'Играчка с песен (Голяма)',
          quantity: 1,
          costPerUnit: productCost
        }
      }
    }
  })

  // 5. Казваме на Next.js да обнови екрана веднага
  revalidatePath('/')
}