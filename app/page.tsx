import { prisma } from '@/lib/prisma';
import AddOrderForm from './components/AddOrderForm';
import SyncMetaButton from './components/SyncMetaButton';

const formatMoney = (amount: number) => {
  return new Intl.NumberFormat('bg-BG', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export default async function Home() {
  // 1. Взимаме Фиксираните разходи
  const fixedCosts = await prisma.fixedCostDefinition.findMany({ where: { isActive: true } });
  
  // ПОПРАВКА: Добавено ": number" след acc
  const totalFixedExpenses = fixedCosts.reduce((acc: number, cost) => acc + Number(cost.amount), 0);

  // 2. Взимаме Поръчките
  const orders = await prisma.order.findMany({ orderBy: { createdAt: 'desc' } });

  // НОВО: Дърпаме последния лог от Shopify
  const lastWebhook = await prisma.webhookLog.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  // 3. СМЕТКИ (Logic)
  
  // А) Реален Приход (само отключени поръчки)
  // ПОПРАВКА: Добавено ": number"
  const realRevenue = orders
    .filter(o => !o.isRevenueLocked) 
    .reduce((acc: number, o) => acc + Number(o.totalAmount), 0);

  // Б) Заключен Приход (чакащи в куриера)
  // ПОПРАВКА: Добавено ": number"
  const lockedRevenue = orders
    .filter(o => o.isRevenueLocked)
    .reduce((acc: number, o) => acc + Number(o.totalAmount), 0);

  // В) Променливи Разходи
  // ПОПРАВКА: Добавено ": number"
  const variableExpenses = orders.reduce((acc: number, o) => {
    return acc 
      + Number(o.productCost) 
      + Number(o.shippingCost) 
      + Number(o.gatewayFee); 
  }, 0);

  // Г) Общо Разходи
  const totalExpenses = totalFixedExpenses + variableExpenses;

  // Д) Баланс
  const currentBalance = realRevenue - totalExpenses;

  return (
    <main className="min-h-screen bg-gray-100 p-8 pb-20">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">
          MyGiftStory Dashboard
        </h1>

        {/* --- КАРТИ С ДАННИ --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          
          {/* Баланс */}
          <div className={`p-6 rounded-xl shadow-sm border border-gray-200 bg-white`}>
            <h3 className="text-gray-500 text-xs font-bold uppercase">Текущ Баланс (Кеш)</h3>
            <p className={`text-2xl font-bold mt-2 ${currentBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatMoney(currentBalance)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Реални пари в джоба</p>
          </div>

          {/* Приходи */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-xs font-bold uppercase">Приходи (Отключени)</h3>
            <p className="text-2xl font-bold text-gray-800 mt-2">
              {formatMoney(realRevenue)}
            </p>
          </div>

          {/* Чакащи */}
          <div className="bg-blue-50 p-6 rounded-xl shadow-sm border border-blue-100">
            <h3 className="text-blue-500 text-xs font-bold uppercase">Очакван приход (Заключен)</h3>
            <p className="text-2xl font-bold text-blue-700 mt-2">
              {formatMoney(lockedRevenue)}
            </p>
            <p className="text-xs text-blue-400 mt-1">При куриерите</p>
          </div>

           {/* Разходи */}
           <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="text-gray-500 text-xs font-bold uppercase">Общо Разходи</h3>
            <p className="text-2xl font-bold text-red-600 mt-2">
              {formatMoney(totalExpenses)}
            </p>
            <p className="text-xs text-gray-400 mt-1">Фиксирани + Променливи</p>
          </div>
        </div>

        {/* ФОРМА ЗА ТЕСТВАНЕ */}
        <AddOrderForm />

                {/* Фейсбук */}
        <SyncMetaButton />

        {/* СПИСЪК С ПОСЛЕДНИ ПОРЪЧКИ */}
        <div className="mt-8">
            <h3 className="font-bold text-lg mb-4">Последни транзакции</h3>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500">
                    <tr>
                        <th className="px-6 py-3">Поръчка</th>
                        <th className="px-6 py-3">Метод</th>
                        <th className="px-6 py-3">Приход</th>
                        <th className="px-6 py-3">Разходи за нея</th>
                        <th className="px-6 py-3">Статус</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                    {orders.map((o) => (
                        <tr key={o.id}>
                            <td className="px-6 py-3 font-medium">{o.orderNumber}</td>
                            <td className="px-6 py-3">{o.paymentMethod}</td>
                            <td className="px-6 py-3">{formatMoney(Number(o.totalAmount))}</td>
                            <td className="px-6 py-3 text-red-500">
                                -{formatMoney(Number(o.productCost) + Number(o.shippingCost) + Number(o.gatewayFee))}
                            </td>
                            <td className="px-6 py-3">
                                {o.isRevenueLocked ? (
                                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">Заключена</span>
                                ) : (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">Взета</span>
                                )}
                            </td>
                        </tr>
                    ))}
                    {orders.length === 0 && (
                        <tr><td colSpan={5} className="px-6 py-4 text-center text-gray-500">Няма поръчки за месеца</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </div>

{/* --- ЗОНА ЗА ДЕБЪГВАНЕ (САМО ЗА ТЕБ) --- */}
        <div className="mt-12 p-6 bg-slate-900 text-green-400 rounded-xl overflow-hidden shadow-lg">
            <h3 className="text-white font-bold text-lg mb-4">👾 Shopify Raw Data Debugger</h3>
            <p className="text-gray-400 text-sm mb-4">Тук се показва точно какво е изпратил Shopify последния път:</p>
            
            {lastWebhook ? (
                <pre className="whitespace-pre-wrap break-all text-xs font-mono bg-black p-4 rounded border border-slate-700 h-96 overflow-y-auto">
                    {lastWebhook.payload}
                </pre>
            ) : (
                <p className="text-gray-500 italic">Все още няма получени данни...</p>
            )}
        </div>

      </div>
    </main>
  );
}