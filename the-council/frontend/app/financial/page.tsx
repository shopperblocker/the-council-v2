"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import GlassPanel from "@/components/GlassPanel";
import {
  fetchAccounts,
  createAccount,
  fetchTransactions,
  createTransaction,
  startGenericStream,
} from "@/lib/api";
import type { FinancialAccount, Transaction } from "@/lib/types";

export default function FinancialHQPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAddTx, setShowAddTx] = useState(false);
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAccounts().then(setAccounts).catch(() => {});
    fetchTransactions().then(setTransactions).catch(() => {});
  }, []);

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const tuitionAccount = accounts.find((a) => a.account_type === "goal");
  const tuitionProgress = tuitionAccount
    ? (tuitionAccount.balance / (tuitionAccount.target || 30000)) * 100
    : 0;

  const handleAddAccount = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const account = await createAccount({
        name: form.get("name") as string,
        account_type: form.get("type") as string,
        balance: parseFloat(form.get("balance") as string) || 0,
        target: form.get("target") ? parseFloat(form.get("target") as string) : null,
      });
      setAccounts((prev) => [...prev, account]);
      setShowAddAccount(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    try {
      const tx = await createTransaction({
        account_id: parseInt(form.get("account_id") as string),
        amount: parseFloat(form.get("amount") as string),
        category: form.get("category") as string,
        description: form.get("description") as string,
      });
      setTransactions((prev) => [tx, ...prev]);
      setShowAddTx(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = () => {
    setAnalyzing(true);
    setAnalysis("");
    startGenericStream(
      "/financial/analyze",
      { accounts, transactions: transactions.slice(0, 20) },
      {
        onAgentToken: (data) => setAnalysis((prev) => prev + (data as { token: string }).token),
        onRoundEnd: () => setAnalyzing(false),
        onError: () => setAnalyzing(false),
      }
    );
  };

  return (
    <div className="min-h-[100dvh] p-3 sm:p-6 bg-[#F8F9FA]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-gray-700 text-sm">
            &larr; Back
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">Financial HQ</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <GlassPanel className="p-4 sm:p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Total Balance</p>
            <p className="text-2xl font-bold text-gray-900">${totalBalance.toLocaleString()}</p>
          </GlassPanel>
          <GlassPanel className="p-4 sm:p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Tuition Progress</p>
            <p className="text-2xl font-bold text-emerald-600">{tuitionProgress.toFixed(0)}%</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${Math.min(tuitionProgress, 100)}%` }} />
            </div>
          </GlassPanel>
          <GlassPanel className="p-4 sm:p-5">
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Accounts</p>
            <p className="text-2xl font-bold text-gray-900">{accounts.length}</p>
          </GlassPanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Accounts */}
          <GlassPanel className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Accounts</h2>
              <button onClick={() => setShowAddAccount(!showAddAccount)} className="text-sm text-blue-500 hover:text-blue-700">
                + Add
              </button>
            </div>

            {showAddAccount && (
              <form onSubmit={handleAddAccount} className="mb-4 p-3 bg-white/30 rounded-xl space-y-2">
                <input name="name" placeholder="Account name" required className="glass-input w-full px-3 py-2 text-sm" />
                <select name="type" className="glass-input w-full px-3 py-2 text-sm">
                  <option value="checking">Checking</option>
                  <option value="savings">Savings</option>
                  <option value="investment">Investment</option>
                  <option value="goal">Goal</option>
                </select>
                <input name="balance" type="number" step="0.01" placeholder="Balance" className="glass-input w-full px-3 py-2 text-sm" />
                <input name="target" type="number" step="0.01" placeholder="Target (optional)" className="glass-input w-full px-3 py-2 text-sm" />
                <button type="submit" className="btn-primary px-4 py-2 text-sm w-full">Create</button>
              </form>
            )}

            <div className="space-y-2">
              {accounts.map((a) => (
                <div key={a.id} className="flex items-center justify-between p-3 bg-white/20 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{a.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{a.account_type}</p>
                  </div>
                  <p className="text-sm font-bold" style={{ color: a.balance >= 0 ? "#059669" : "#DC2626" }}>
                    ${a.balance.toLocaleString()}
                  </p>
                </div>
              ))}
              {accounts.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No accounts yet</p>}
            </div>
          </GlassPanel>

          {/* Transactions */}
          <GlassPanel className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Transactions</h2>
              <button onClick={() => setShowAddTx(!showAddTx)} className="text-sm text-blue-500 hover:text-blue-700">
                + Add
              </button>
            </div>

            {showAddTx && (
              <form onSubmit={handleAddTransaction} className="mb-4 p-3 bg-white/30 rounded-xl space-y-2">
                <select name="account_id" required className="glass-input w-full px-3 py-2 text-sm">
                  <option value="">Select account</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <input name="amount" type="number" step="0.01" placeholder="Amount (- for expense)" required className="glass-input w-full px-3 py-2 text-sm" />
                <input name="category" placeholder="Category" required className="glass-input w-full px-3 py-2 text-sm" />
                <input name="description" placeholder="Description" className="glass-input w-full px-3 py-2 text-sm" />
                <button type="submit" className="btn-primary px-4 py-2 text-sm w-full">Add</button>
              </form>
            )}

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-white/20 rounded-xl">
                  <div>
                    <p className="text-sm text-gray-900">{tx.description || tx.category}</p>
                    <p className="text-xs text-gray-400">{tx.category}</p>
                  </div>
                  <p className={`text-sm font-bold ${tx.amount >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {tx.amount >= 0 ? "+" : ""}${Math.abs(tx.amount).toLocaleString()}
                  </p>
                </div>
              ))}
              {transactions.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No transactions yet</p>}
            </div>
          </GlassPanel>
        </div>

        {/* Rockefeller Analysis */}
        <GlassPanel className="p-4 sm:p-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400">Ask Rockefeller</h2>
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Analyze Finances"}
            </button>
          </div>
          {analysis && (
            <div className="p-4 bg-white/30 rounded-xl text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {analysis}
              {analyzing && <span className="inline-block w-1.5 h-4 bg-emerald-500 animate-pulse ml-0.5" />}
            </div>
          )}
        </GlassPanel>
      </div>
    </div>
  );
}
