'use client'

import { createOrder } from "../actions"

export default function AddOrderForm() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-8">
      <h3 className="font-bold text-lg mb-4">🖐 Ръчна симулация на поръчка</h3>
      <form action={createOrder} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Номер на поръчка */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Номер (напр. 1001)</label>
            <input name="orderNumber" type="text" required className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50" />
        </div>

        {/* Тип Продукт (за да вземем цената) */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Продукт</label>
            <select name="itemType" className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50">
                <option value="small">Малка играчка (Cost: 13.80€)</option>
                <option value="big">Голяма играчка (Cost: 19.50€)</option>
            </select>
        </div>

        {/* Продажна цена */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Продажна цена (към клиента)</label>
            <input name="totalAmount" type="number" step="0.01" defaultValue="49.90" className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50" />
        </div>

        {/* Себестойност (скрито попълване за демото) */}
        {/* Тук хардкодвам цената за малката, за по-лесно можеш да го променяш ръчно */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Себестойност (Разход за продукт)</label>
            <input name="productCost" type="number" step="0.01" defaultValue="13.80" className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50" />
        </div>

        {/* Доставка */}
        <div>
             <label className="block text-sm font-medium text-gray-700">Цена доставка (Разход Еконт)</label>
             <input name="shippingCost" type="number" step="0.01" defaultValue="5.50" className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50" />
        </div>

        {/* Начин на плащане */}
        <div>
            <label className="block text-sm font-medium text-gray-700">Плащане</label>
            <select name="paymentMethod" className="mt-1 block w-full rounded-md border border-gray-300 p-2 bg-gray-50">
                <option value="COD">Наложен Платеж (Заключен приход)</option>
                <option value="Card">Карта (Веднага приход + такса)</option>
            </select>
        </div>

        <button type="submit" className="md:col-span-2 bg-black text-white py-2 px-4 rounded-md hover:bg-gray-800 transition">
            Добави Поръчка
        </button>
      </form>
    </div>
  )
}