import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    console.log("📥 Получена поръчка от Shopify:", data.name);

    // 1. Извличане на основни данни
    const orderId = data.id.toString();
    const orderNumber = data.name; // напр. #1024
    const totalPrice = parseFloat(data.total_price); // Крайна сума, която клиента плаща
    const createdAt = new Date(data.created_at);
    
    // 2. Определяне на метод на плащане (COD или Карта)
    // Shopify връща масив `payment_gateway_names`. 
    // Обикновено "manual" е Наложен платеж, a "shopify_payments" или "stripe" е карта.
    const gateways = data.payment_gateway_names || [];
    let paymentMethod = 'Card'; // По подразбиране приемаме, че е платено
    let isRevenueLocked = false;

    // ПРОВЕРИ ТОВА: Виж в Shopify как точно се води наложения ти платеж. 
    // Често е 'manual' или съдържа думата 'cod' или 'cash'.
    if (gateways.includes('manual') || gateways.includes('cash_on_delivery')) {
        paymentMethod = 'COD';
        isRevenueLocked = true; // Заключваме парите
    }

    // 3. Изчисляване на банкови такси (ако е с карта)
    let gatewayFee = 0;
    if (!isRevenueLocked) {
        // Твоята формула: 0.26€ + 1.9%
        gatewayFee = 0.26 + (totalPrice * 0.019);
    }

    // 4. Обработка на продуктите и изчисляване на нашите разходи
    let totalProductCost = 0;
    
    // Създаваме списък с продукти за базата
    const orderItemsData = data.line_items.map((item: any) => {
        let cost = 0;
        const title = item.title.toLowerCase();
        const variant = item.variant_title ? item.variant_title.toLowerCase() : '';

        // ЛОГИКА ЗА ЦЕНАТА: Тук трябва да сме сигурни как се казват продуктите ти
        // Примерна логика според твоето описание:
        if (title.includes('малка') || variant.includes('small') || variant.includes('малка')) {
            cost = 13.80;
        } else if (title.includes('голяма') || variant.includes('big') || variant.includes('голяма')) {
            cost = 19.50;
        } else {
            // Ако не разпознаем, слагаме средно или 0 (трябва да следиш логовете)
            console.warn(`⚠️ Неразпознат продукт: ${title}. Слагам цена 0.`);
            cost = 0;
        }

        totalProductCost += (cost * item.quantity);

        return {
            productName: item.title,
            quantity: item.quantity,
            costPerUnit: cost
        };
    });

    // 5. Цена за доставка (Разход за нас към Еконт/Спиди)
    // Трябва да знаем колко НИЕ плащаме на куриера. 
    // Засега слагаме усреднена стойност, ако няма как да я разберем от Shopify веднага.
    // Ти ми каза: "Econt доставки – 0.77€ (може би има API)". 
    // Засега ще сложим твърда стойност, която можеш да промениш.
    const estimatedShippingCost = 4.50; // Слагам примерна цена 4.50 EUR, промени я ако е фиксирана другаде

    // 6. Запис в базата
    // Проверяваме дали вече не съществува (Shopify понякога праща по 2 пъти)
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });

    if (!existingOrder) {
        await prisma.order.create({
            data: {
                id: orderId,
                orderNumber: orderNumber,
                createdAt: createdAt,
                paymentMethod: paymentMethod,
                totalAmount: totalPrice,
                productCost: totalProductCost,
                shippingCost: estimatedShippingCost,
                gatewayFee: gatewayFee,
                isRevenueLocked: isRevenueLocked,
                deliveryStatus: 'Unshipped',
                items: {
                    create: orderItemsData
                }
            }
        });
        console.log(`✅ Поръчка ${orderNumber} записана успешно!`);
    } else {
        console.log(`ℹ️ Поръчка ${orderNumber} вече съществува.`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ Грешка при обработка на Webhook:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}