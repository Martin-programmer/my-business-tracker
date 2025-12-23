'use client'

import { syncMetaAdSpend } from "../actions" // Ще трябва да експортнем функцията

export default function SyncMetaButton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-4">
      <h3 className="font-bold text-lg mb-2">📊 Meta Ads Sync</h3>
      <p className="text-sm text-gray-500 mb-4">Изтегли разхода за вчерашния ден и го запиши в базата.</p>
      <button 
        onClick={() => syncMetaAdSpend()}
        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition"
      >
        Синхронизирай Meta
      </button>
    </div>
  )
}