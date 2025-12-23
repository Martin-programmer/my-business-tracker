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

import axios from 'axios';

export async function syncMetaAdSpend() {
  const AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID;
  const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;

  if (!AD_ACCOUNT_ID || !ACCESS_TOKEN) {
    throw new Error("Липсват настройки за Meta (ID или Token)");
  }

  // 1. Определяме датата: "Вчера"
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateString = yesterday.toISOString().split('T')[0]; // Формат "2023-10-25"

  try {
    // 2. Питаме Facebook API
    // URL: https://graph.facebook.com/v17.0/act_ID/insights...
    const url = `https://graph.facebook.com/v17.0/act_${AD_ACCOUNT_ID}/insights`;
    
    const response = await axios.get(url, {
      params: {
        access_token: ACCESS_TOKEN,
        time_range: JSON.stringify({ since: dateString, until: dateString }),
        fields: 'spend',
        level: 'account'
      }
    });

    // 3. Обработваме отговора
    const data = response.data.data[0];
    
    if (!data) {
      console.log(`Няма данни за разходи за дата ${dateString}`);
      return; // Няма изхарчени пари
    }

    const spendAmount = parseFloat(data.spend); // Facebook връща сумата в основната валута на акаунта
    const vatAmount = spendAmount * 0.20; // 20% ДДС
    const totalAmount = spendAmount + vatAmount;

    // 4. Записваме в базата
    // Използваме upsert: Ако вече има запис за тази дата -> го обновяваме. Ако няма -> създаваме нов.
    await prisma.adSpend.upsert({
      where: { date: new Date(dateString) },
      update: {
        amount: spendAmount,
        vatAmount: vatAmount,
        total: totalAmount
      },
      create: {
        date: new Date(dateString),
        amount: spendAmount,
        vatAmount: vatAmount,
        total: totalAmount
      }
    });

    console.log(`Успешно записани разходи за ${dateString}: ${totalAmount} (с ДДС)`);
    revalidatePath('/'); // Обновяваме екрана

  } catch (error: any) {
    console.error("Грешка при връзка с Meta:", error.response?.data || error.message);
    throw new Error("Неуспешно извличане на данни от Meta");
  }
}