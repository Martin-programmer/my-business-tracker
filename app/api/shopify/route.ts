import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();

    // Записваме суровия webhook payload за дебъг
    await prisma.webhookLog.create({
      data: { payload: JSON.stringify(data, null, 2) },
    });

    console.log(`📥 Нова поръчка: ${data.name} (${data.total_price} ${data.currency})`);

    // 1) Конвертиране към EUR, ако идва в BGN
    let totalPrice = parseFloat(data.total_price);
    if (data.currency === 'BGN') {
      totalPrice = totalPrice / 1.95583;
    }

    const orderId = data.id.toString();
    const orderNumber = data.name;
    const createdAt = new Date(data.created_at);

    // 2) Метод на плащане
    const gateways = data.payment_gateway_names || [];
    let paymentMethod = 'Card';
    let isRevenueLocked = false;

    if (
      gateways.includes('manual') ||
      gateways.includes('cash_on_delivery') ||
      gateways.some((g: string) => g.includes('cash'))
    ) {
      paymentMethod = 'COD';
      isRevenueLocked = true;
    }

    // 3) Такси за gateway (само при карта)
    let gatewayFee = 0;
    if (!isRevenueLocked) {
      gatewayFee = 0.26 + totalPrice * 0.019;
    }

    // 4) Разходи за продукт
    let totalProductCost = 0;
    const orderItemsData = (data.line_items ?? []).map((item: any) => {
      let cost = 13.8;
      const title = (item.title || '').toLowerCase();
      if (title.includes('50см') || title.includes('капибара') || title.includes('голямо')) {
        cost = 19.5;
      }

      const quantity = item.quantity ?? 1;
      totalProductCost += cost * quantity;

      console.log(`📦 Продукт: ${item.title} -> Разход: ${cost}€`);

      return {
        productName: item.title,
        quantity,
        costPerUnit: cost,
      };
    });

    // 5) Разход за доставка (фиксиран засега)
    const estimatedShippingCost = 4.5;

    // 6) Запис/пропускане ако съществува
    const existingOrder = await prisma.order.findUnique({ where: { id: orderId } });

    if (!existingOrder) {
      await prisma.order.create({
        data: {
          id: orderId,
          orderNumber,
          createdAt,
          paymentMethod,
          totalAmount: totalPrice,
          productCost: totalProductCost,
          shippingCost: estimatedShippingCost,
          gatewayFee,
          isRevenueLocked,
          deliveryStatus: 'Unshipped',
          items: { create: orderItemsData },
        },
      });
      console.log(`✅ Поръчка ${orderNumber} записана. Сума: ${totalPrice.toFixed(2)}€`);
    } else {
      console.log(`ℹ️ Поръчка ${orderNumber} вече съществува.`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ ГРЕШКА:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}