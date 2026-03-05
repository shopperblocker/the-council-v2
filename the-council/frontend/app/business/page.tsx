"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import ErrorBanner from "@/components/ErrorBanner";
import { fetchProducts, createProduct, fetchOrders, startGenericStream, isTokenEvent } from "@/lib/api";
import type { Product, BusinessOrder } from "@/lib/types";

type Tab = "deals" | "orders" | "tools";

export default function BusinessPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("deals");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<BusinessOrder[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [aiTool, setAiTool] = useState<string | null>(null);
  const [aiInput, setAiInput] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts().then(setProducts).catch(() => setError("Failed to load products. Is the backend running?"));
    fetchOrders().then(setOrders).catch(() => setError("Failed to load orders."));
  }, []);

  const handleAddProduct = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const sourcePrice = parseFloat(form.get("source_price") as string) || 0;
    const targetPrice = parseFloat(form.get("target_price") as string) || 0;
    const fees = sourcePrice * 0.13; // Estimate 13% platform fees
    const profit = targetPrice - sourcePrice - fees;
    const roi = sourcePrice > 0 ? (profit / sourcePrice) * 100 : 0;

    const product = await createProduct({
      name: form.get("name") as string,
      category: form.get("category") as string,
      source_platform: form.get("source_platform") as string,
      source_price: sourcePrice,
      target_platform: form.get("target_platform") as string,
      target_price: targetPrice || undefined,
      estimated_profit: profit,
      roi_pct: roi,
      status: "researching",
    });
    setProducts((prev) => [...prev, product]);
    setShowAdd(false);
  };

  const handleAiTool = (tool: string) => {
    if (!aiInput.trim() || streaming) return;
    setStreaming(true);
    setAiResponse("");
    setAiTool(tool);

    const body: Record<string, unknown> =
      tool === "analyze-deal" ? { deal_description: aiInput } :
      tool === "listing-copy" ? { product_description: aiInput } :
      { product_description: aiInput };

    startGenericStream(
      `/business/${tool}`,
      body,
      {
        onAgentToken: (data) => { if (isTokenEvent(data)) setAiResponse((prev) => prev + data.token); },
        onRoundEnd: () => setStreaming(false),
        onError: () => setStreaming(false),
      }
    );
  };

  const totalProfit = products
    .filter((p) => p.status === "sold")
    .reduce((sum, p) => sum + (p.estimated_profit || 0), 0);
  const activeDeals = products.filter((p) => p.status !== "sold" && p.status !== "abandoned");

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-700 text-sm">&larr; Back</button>
          <h1 className="text-xl sm:text-2xl font-bold">Business Engine</h1>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <GlassPanel className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Active Deals</p>
            <p className="text-2xl font-bold text-gray-900">{activeDeals.length}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Profit</p>
            <p className={`text-2xl font-bold ${totalProfit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              ${totalProfit.toLocaleString()}
            </p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Orders</p>
            <p className="text-2xl font-bold text-gray-900">{orders.length}</p>
          </GlassPanel>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-white/30 rounded-xl w-fit">
          {(["deals", "orders", "tools"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Deals Tab */}
        {tab === "deals" && (
          <div>
            <div className="flex justify-end mb-4">
              <button onClick={() => setShowAdd(!showAdd)} className="btn-primary px-4 py-2 text-sm">+ Add Deal</button>
            </div>

            {showAdd && (
              <GlassPanel className="p-4 mb-4">
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input name="name" placeholder="Product name" required className="glass-input px-3 py-2 text-sm" />
                  <input name="category" placeholder="Category (sneakers, electronics...)" required className="glass-input px-3 py-2 text-sm" />
                  <input name="source_platform" placeholder="Source (Amazon, eBay, retail)" required className="glass-input px-3 py-2 text-sm" />
                  <input name="source_price" type="number" step="0.01" placeholder="Buy price" required className="glass-input px-3 py-2 text-sm" />
                  <input name="target_platform" placeholder="Sell on (StockX, eBay, Grailed)" required className="glass-input px-3 py-2 text-sm" />
                  <input name="target_price" type="number" step="0.01" placeholder="Target sell price" className="glass-input px-3 py-2 text-sm" />
                  <button type="submit" className="btn-primary px-4 py-2 text-sm sm:col-span-2">Add Deal</button>
                </form>
              </GlassPanel>
            )}

            <div className="space-y-2">
              {products.map((p) => (
                <GlassPanel key={p.id} className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.source_platform} &rarr; {p.target_platform}</p>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-500">${p.source_price}</span>
                      <span>&rarr;</span>
                      <span className="font-bold">${p.target_price || "?"}</span>
                      {p.estimated_profit != null && (
                        <span className={`font-bold ${p.estimated_profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                          {p.estimated_profit >= 0 ? "+" : ""}${p.estimated_profit.toFixed(0)}
                          {p.roi_pct != null && <span className="text-xs ml-1">({p.roi_pct.toFixed(0)}%)</span>}
                        </span>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-lg capitalize ${
                        p.status === "sold" ? "bg-emerald-100 text-emerald-700" :
                        p.status === "listed" ? "bg-blue-100 text-blue-700" :
                        p.status === "abandoned" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {p.status}
                      </span>
                    </div>
                  </div>
                </GlassPanel>
              ))}
              {products.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No deals yet</p>}
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-2">
            {orders.map((o) => (
              <GlassPanel key={o.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{o.order_type} - {o.platform}</p>
                    {o.tracking && <p className="text-xs text-gray-400 mt-1">Tracking: {o.tracking}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">${o.amount.toLocaleString()}</p>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg capitalize">{o.status}</span>
                  </div>
                </div>
              </GlassPanel>
            ))}
            {orders.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No orders yet</p>}
          </div>
        )}

        {/* AI Tools Tab */}
        {tab === "tools" && (
          <GlassPanel className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              {[
                { key: "analyze-deal", label: "Analyze Deal", emoji: "📈" },
                { key: "listing-copy", label: "Listing Copy", emoji: "📝" },
                { key: "find-buyers", label: "Find Buyers", emoji: "🔍" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => { setAiTool(t.key); setAiResponse(""); }}
                >
                  <GlassPanel className={`p-3 text-center ${aiTool === t.key ? "ring-2 ring-orange-400" : "hover:-translate-y-0.5"} transition-all`}>
                    <span>{t.emoji}</span> {t.label}
                  </GlassPanel>
                </button>
              ))}
            </div>

            <textarea
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              placeholder={
                aiTool === "analyze-deal" ? "Describe the deal (product, buy price, sell price, platform)..." :
                aiTool === "listing-copy" ? "Describe the product for the listing..." :
                "Describe what you're selling and who might buy it..."
              }
              className="glass-input w-full px-4 py-3 text-sm min-h-[100px] resize-y mb-3"
              disabled={streaming}
            />

            <button
              onClick={() => aiTool && handleAiTool(aiTool)}
              disabled={streaming || !aiInput.trim() || !aiTool}
              className="btn-primary px-6 py-3 text-sm w-full disabled:opacity-50"
            >
              {streaming ? "Analyzing..." : "Run"}
            </button>

            {aiResponse && (
              <div className="mt-4 p-4 bg-white/30 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {aiResponse}
                {streaming && <span className="inline-block w-1.5 h-4 bg-orange-500 animate-pulse ml-0.5" />}
              </div>
            )}
          </GlassPanel>
        )}
      </div>
    </div>
  );
}
