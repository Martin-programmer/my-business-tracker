import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log(`📥 Нова поръчка: ${data.name} (${data.total_price} ${data.currency})`);

    // 1. ВАЛУТНА КОНВЕРСИЯ (КРИТИЧНО!)
    // Shopify праща BGN, ние искаме EUR.
    let totalPrice = parseFloat(data.total_price);
    if (data.currency === 'BGN') {
        totalPrice = totalPrice / 1.95583; // Конвертиране в Евро
    }

    const orderId = data.id.toString();
    const orderNumber = data.name;
    const createdAt = new Date(data.created_at);
    
    // 2. Метод на плащане
    const gateways = data.payment_gateway_names || [];
    let paymentMethod = 'Card'; 
    let isRevenueLocked = false;

    // Проверка за наложен платеж (COD)
    // Търсим думи като manual, cash, cod
    if (gateways.includes('manual') || gateways.includes('cash_on_delivery') || gateways.some((g: string) => g.includes('cash'))) {
        paymentMethod = 'COD';
        isRevenueLocked = true;
    }

    // 3. Такси (ако е платено с карта/онлайн)
    let gatewayFee = 0;
    if (!isRevenueLocked) {
        // Формула: 0.26€ + 1.9% (прилагаме я върху сумата в ЕВРО)
        gatewayFee = 0.26 + (totalPrice * 0.019);
    }

    // 4. Логика за РАЗХОД НА ПРОДУКТ (Спрямо твоята снимка)
    let totalProductCost = 0;
    
    const orderItemsData = data.line_items.map((item: any) => {
        let cost = 13.80; // По подразбиране приемаме, че е малка (най-честата)
        const title = item.title.toLowerCase();

        // Ако името съдържа 50см, капибара или голямо -> по-високия разход
        if (title.includes('50см') || title.includes('капибара') || title.includes('голямо')) {
            cost = 19.50;
        } 
        // Ако изрично е 30см или друго -> остава 13.80
        
        console.log(`📦 Продукт: ${item.title} -> Разход: ${cost}€`);

        totalProductCost += (cost * item.quantity);

        return {
            productName: item.title,
            quantity: item.quantity,
            costPerUnit: cost
        };
    });

    // 5. Доставка (Разход към Еконт)
    // Засега слагаме фиксирана, докато не направим интеграция
    const estimatedShippingCost = 4.50; 

    // 6. Запис в базата
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });

    if (!existingOrder) {
        await prisma.order.create({
            data: {
                id: orderId,
                orderNumber: orderNumber,
                createdAt: createdAt,
                paymentMethod: paymentMethod,
                totalAmount: totalPrice, // Вече е в EUR
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
        console.log(`✅ Поръчка ${orderNumber} записана. Сума: ${totalPrice.toFixed(2)}€`);
    } else {
        console.log(`ℹ️ Поръчка ${orderNumber} вече съществува.`);
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("❌ ГРЕШКА:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}