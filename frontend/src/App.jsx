import { useState, useEffect } from "react";
import defaultValues from "./data/defaultValues.json";
import {
  predictTransaction, getDriftStatus, getModelInfo, getTransactions, getStats
} from "./api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  RadialBarChart, RadialBar, PolarAngleAxis, LineChart, Line
} from "recharts";
import {
  LayoutDashboard, PlusCircle, List, Activity, Cpu, ShieldCheck
} from "lucide-react";

const PRODUCT_OPTIONS = ["C", "H", "R", "S", "W"];
const CARD4_OPTIONS = ["Missing", "american express", "discover", "mastercard", "visa"];
const CARD6_OPTIONS = ["Missing", "charge card", "credit", "debit", "debit or credit"];
const DEVICE_OPTIONS = ["Missing", "desktop", "mobile"];
const EMAIL_OPTIONS = [
  "Missing", "Other", "anonymous.com", "aol.com", "att.net", "bellsouth.net",
  "comcast.net", "cox.net", "gmail.com", "hotmail.com", "icloud.com", "live.com",
  "me.com", "msn.com", "optonline.net", "outlook.com", "sbcglobal.net",
  "verizon.net", "yahoo.com", "yahoo.com.mx", "ymail.com"
];

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new", label: "New Transaction", icon: PlusCircle },
  { id: "transactions", label: "Transactions", icon: List },
  { id: "drift", label: "Drift Monitor", icon: Activity },
  { id: "model", label: "Model Info", icon: Cpu },
];

function Sidebar({ activePage, setActivePage }) {
  return (
    <div className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col flex-shrink-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-indigo-500" size={26} />
          <span className="text-xl font-bold text-white">FraudSense</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Fraud Intelligence Platform</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-600">
        XGBoost + Autoencoder Ensemble
      </div>
    </div>
  );
}

function PageHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      {subtitle && <p className="text-slate-400 text-sm mt-1">{subtitle}</p>}
    </div>
  );
}

function StatusBadge({ isFraud }) {
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
        isFraud ? "bg-red-900/50 text-red-300" : "bg-green-900/50 text-green-300"
      }`}
    >
      {isFraud ? "Fraud" : "Safe"}
    </span>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getStats(), getTransactions(8)])
      .then(([statsRes, txRes]) => {
        setStats(statsRes.data);
        setTransactions(txRes.data.transactions || []);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-slate-400 text-center py-16">Loading dashboard...</div>;
  }

  const trendData = (stats?.daily_trend || []).map((d) => ({
    date: d.date.slice(5),
    total: d.count,
    flagged: d.flagged,
  }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Live overview of fraud screening activity" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Transactions</p>
          <p className="text-3xl font-bold text-white mt-2">{stats?.total_transactions ?? 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Flagged as Fraud</p>
          <p className="text-3xl font-bold text-red-400 mt-2">{stats?.total_flagged ?? 0}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Fraud Rate</p>
          <p className="text-3xl font-bold text-orange-400 mt-2">
            {((stats?.fraud_rate ?? 0) * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      {trendData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <p className="text-sm font-semibold text-slate-300 mb-4">Daily Volume Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="flagged" stroke="#ef4444" strokeWidth={2} name="Flagged" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        <p className="text-sm font-semibold text-slate-300 mb-4">Recent Transactions</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-700">
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Amount</th>
                <th className="pb-2 pr-4">Card</th>
                <th className="pb-2 pr-4">Probability</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, idx) => (
                <tr key={idx} className="border-b border-slate-700/50">
                  <td className="py-2.5 pr-4 text-slate-400">
                    {new Date(tx.timestamp).toLocaleString()}
                  </td>
                  <td className="py-2.5 pr-4 text-slate-200">${tx.TransactionAmt}</td>
                  <td className="py-2.5 pr-4 text-slate-400">{tx.card4} / {tx.card6}</td>
                  <td className="py-2.5 pr-4 text-slate-200">
                    {(tx.fraud_probability * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5">
                    <StatusBadge isFraud={String(tx.is_fraud) === "True" || tx.is_fraud === true} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function NewTransactionPage() {
  const [form, setForm] = useState({
    TransactionAmt: 100,
    ProductCD: "W",
    card4: "visa",
    card6: "debit",
    DeviceType: "desktop",
    P_emaildomain_clean: "gmail.com",
    dist1: 10,
    addr1: 200,
    addr2: 87,
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = { ...defaultValues, ...form };
      const response = await predictTransaction(payload);
      setResult(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail
          ? JSON.stringify(err.response.data.detail)
          : "Something went wrong. Is the backend running?"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="New Transaction" subtitle="Screen a transaction in real time" />

      <div className="grid grid-cols-2 gap-6">
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4 h-fit">
          <div>
            <label className="block text-sm text-slate-300 mb-1">Transaction Amount ($)</label>
            <input
              type="number"
              value={form.TransactionAmt}
              onChange={(e) => handleChange("TransactionAmt", parseFloat(e.target.value))}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Product Category</label>
              <select
                value={form.ProductCD}
                onChange={(e) => handleChange("ProductCD", e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {PRODUCT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Card Network</label>
              <select
                value={form.card4}
                onChange={(e) => handleChange("card4", e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CARD4_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Card Type</label>
              <select
                value={form.card6}
                onChange={(e) => handleChange("card6", e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {CARD6_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">Device Type</label>
              <select
                value={form.DeviceType}
                onChange={(e) => handleChange("DeviceType", e.target.value)}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {DEVICE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-slate-300 mb-1">Purchaser Email Domain</label>
            <select
              value={form.P_emaildomain_clean}
              onChange={(e) => handleChange("P_emaildomain_clean", e.target.value)}
              className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {EMAIL_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm text-slate-300 mb-1">Distance</label>
              <input
                type="number"
                value={form.dist1}
                onChange={(e) => handleChange("dist1", parseFloat(e.target.value))}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Billing Region</label>
              <input
                type="number"
                value={form.addr1}
                onChange={(e) => handleChange("addr1", parseFloat(e.target.value))}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 mb-1">Country Code</label>
              <input
                type="number"
                value={form.addr2}
                onChange={(e) => handleChange("addr2", parseFloat(e.target.value))}
                className="w-full bg-slate-700 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg py-3 font-semibold transition"
          >
            {loading ? "Checking..." : "Check Transaction"}
          </button>
        </form>

        <div>
          {error && (
            <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-200">
              {error}
            </div>
          )}

          {!result && !error && (
            <div className="bg-slate-800/50 border border-dashed border-slate-700 rounded-xl p-10 text-center text-slate-500 h-full flex items-center justify-center">
              Results will appear here after you check a transaction
            </div>
          )}

          {result && (
            <div
              className={`rounded-xl p-6 border ${
                result.is_fraud
                  ? "bg-red-900/30 border-red-700"
                  : "bg-green-900/30 border-green-700"
              }`}
            >
              <div className="flex items-center gap-6 mb-3">
                <div className="relative w-28 h-28 flex-shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart
                      innerRadius="70%"
                      outerRadius="100%"
                      data={[{ value: result.fraud_probability * 100 }]}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                      <RadialBar
                        background={{ fill: "#334155" }}
                        dataKey="value"
                        cornerRadius={30}
                        fill={result.is_fraud ? "#ef4444" : "#22c55e"}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold">
                      {(result.fraud_probability * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-lg font-semibold block">
                    {result.is_fraud ? "Fraud Detected" : "Transaction Looks Safe"}
                  </span>
                  <span className="text-sm text-slate-400">Fraud probability score</span>
                </div>
              </div>
              <p className="text-sm text-slate-400 mt-2">
                Threshold used: {(result.threshold_used * 100).toFixed(0)}%
              </p>

              {result.top_factors && result.top_factors.length > 0 && (
                <div className="mt-5 pt-4 border-t border-slate-700">
                  <p className="text-sm font-semibold text-slate-300 mb-3">
                    Top factors behind this decision
                  </p>
                  <div className="space-y-2">
                    {result.top_factors.map((factor, idx) => {
                      const maxAbs = Math.max(
                        ...result.top_factors.map((f) => Math.abs(f.impact))
                      );
                      const widthPct = (Math.abs(factor.impact) / maxAbs) * 100;
                      const isRisk = factor.direction === "increases_risk";
                      return (
                        <div key={idx} className="text-sm">
                          <div className="flex justify-between mb-1">
                            <span className="text-slate-300">{factor.feature}</span>
                            <span className={isRisk ? "text-red-400" : "text-green-400"}>
                              {isRisk ? "↑ risk" : "↓ risk"}
                            </span>
                          </div>
                          <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 ${isRisk ? "bg-red-500" : "bg-green-500"}`}
                              style={{ width: `${widthPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {result.anomaly_detection && (
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-300">
                      Anomaly Detection (Autoencoder)
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        result.anomaly_detection.anomaly_flag === "unusual_pattern"
                          ? "bg-orange-900/50 text-orange-300"
                          : "bg-blue-900/50 text-blue-300"
                      }`}
                    >
                      {result.anomaly_detection.anomaly_flag === "unusual_pattern"
                        ? "Unusual Pattern"
                        : "Typical Pattern"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reconstruction score: {result.anomaly_detection.anomaly_score}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getTransactions(100)
      .then((res) => setTransactions(res.data.transactions || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter((tx) => {
    const q = search.toLowerCase();
    return (
      String(tx.card4).toLowerCase().includes(q) ||
      String(tx.card6).toLowerCase().includes(q) ||
      String(tx.ProductCD).toLowerCase().includes(q) ||
      String(tx.DeviceType).toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <PageHeader title="Transactions" subtitle="Full history of screened transactions" />

      <input
        type="text"
        placeholder="Search by card, product, or device..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 mb-4 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
      />

      <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
        {loading ? (
          <div className="text-slate-400 text-center py-8">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-700">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Product</th>
                  <th className="pb-2 pr-4">Card</th>
                  <th className="pb-2 pr-4">Device</th>
                  <th className="pb-2 pr-4">Probability</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx, idx) => (
                  <tr key={idx} className="border-b border-slate-700/50">
                    <td className="py-2.5 pr-4 text-slate-400 whitespace-nowrap">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-200">${tx.TransactionAmt}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{tx.ProductCD}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{tx.card4} / {tx.card6}</td>
                    <td className="py-2.5 pr-4 text-slate-400">{tx.DeviceType}</td>
                    <td className="py-2.5 pr-4 text-slate-200">
                      {(tx.fraud_probability * 100).toFixed(1)}%
                    </td>
                    <td className="py-2.5">
                      <StatusBadge isFraud={String(tx.is_fraud) === "True" || tx.is_fraud === true} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-slate-500 py-8">No matching transactions.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DriftMonitorPage() {
  const [drift, setDrift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDrift = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getDriftStatus();
      setDrift(response.data);
    } catch (err) {
      setError("Could not load drift status. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrift();
  }, []);

  return (
    <div>
      <PageHeader title="Drift Monitor" subtitle="Statistical comparison of live traffic vs. training data" />

      {loading && <div className="text-slate-400 text-center py-12">Loading drift status...</div>}

      {error && (
        <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-200">{error}</div>
      )}

      {!loading && !error && drift && (drift.status === "no_data" || drift.status === "not_enough_data") && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 text-center">
          <p className="text-slate-300">{drift.message}</p>
          <button
            onClick={fetchDrift}
            className="mt-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 text-sm"
          >
            Refresh
          </button>
        </div>
      )}

      {!loading && !error && drift && drift.status !== "no_data" && drift.status !== "not_enough_data" && (
        <DriftResults drift={drift} onRefresh={fetchDrift} />
      )}
    </div>
  );
}

function DriftResults({ drift, onRefresh }) {
  const chartData = (drift.top_drifted_features || []).map((f) => ({
    feature: f.feature,
    driftScore: Math.round((1 - f.p_value) * 100) / 100,
  }));
  const isDrifted = drift.status === "drift_detected";

  return (
    <div className="space-y-6">
      <div
        className={`rounded-xl p-6 border ${
          isDrifted ? "bg-orange-900/30 border-orange-700" : "bg-green-900/30 border-green-700"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold">
            {isDrifted ? "Data Drift Detected" : "Model Input Distribution Stable"}
          </span>
          <button
            onClick={onRefresh}
            className="text-xs bg-slate-700 hover:bg-slate-600 rounded-lg px-3 py-1.5"
          >
            Refresh
          </button>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{drift.logged_count}</p>
            <p className="text-xs text-slate-400">Transactions Logged</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{drift.features_checked}</p>
            <p className="text-xs text-slate-400">Features Checked</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{(drift.drift_ratio * 100).toFixed(0)}%</p>
            <p className="text-xs text-slate-400">Features Drifted</p>
          </div>
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm font-semibold text-slate-300 mb-4">Top Drifted Features (KS-test)</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis type="number" domain={[0, 1]} stroke="#94a3b8" fontSize={12} />
              <YAxis type="category" dataKey="feature" stroke="#94a3b8" fontSize={12} width={90} />
              <Tooltip
                contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }}
                labelStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="driftScore" radius={[0, 4, 4, 0]}>
                {chartData.map((_, idx) => (
                  <Cell key={idx} fill={isDrifted ? "#f97316" : "#eab308"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function ModelInfoPage() {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getModelInfo()
      .then((res) => setInfo(res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-slate-400 text-center py-12">Loading model info...</div>;
  if (!info) return null;

  return (
    <div>
      <PageHeader title="Model Info" subtitle="Performance metrics for both models in the ensemble" />

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm font-semibold text-indigo-400 mb-4">XGBoost (Supervised Classifier)</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">ROC-AUC</span><span className="text-white font-semibold">{(info.xgboost.roc_auc * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Precision</span><span className="text-white font-semibold">{(info.xgboost.precision * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Recall</span><span className="text-white font-semibold">{(info.xgboost.recall * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">F1 Score</span><span className="text-white font-semibold">{(info.xgboost.f1_score * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Features Used</span><span className="text-white font-semibold">{info.xgboost.num_features}</span></div>
            <div className="flex justify-between border-t border-slate-700 pt-3"><span className="text-slate-400">Model Size (ONNX)</span><span className="text-white font-semibold">{info.xgboost.model_size_kb} KB</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Size Reduction</span><span className="text-green-400 font-semibold">{info.xgboost.size_reduction_pct}%</span></div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <p className="text-sm font-semibold text-orange-400 mb-4">Autoencoder (Anomaly Detector)</p>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-400">Original AUC</span><span className="text-white font-semibold">{(info.autoencoder.original_auc * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Quantized AUC</span><span className="text-white font-semibold">{(info.autoencoder.quantized_auc * 100).toFixed(1)}%</span></div>
            <div className="flex justify-between border-t border-slate-700 pt-3"><span className="text-slate-400">Original Size</span><span className="text-white font-semibold">{info.autoencoder.original_size_kb} KB</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Quantized Size</span><span className="text-white font-semibold">{info.autoencoder.quantized_size_kb} KB</span></div>
            <div className="flex justify-between"><span className="text-slate-400">Size Reduction</span><span className="text-green-400 font-semibold">{info.autoencoder.size_reduction_pct}%</span></div>
            <p className="text-xs text-slate-500 pt-3 border-t border-slate-700">{info.autoencoder.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const pages = {
    dashboard: <DashboardPage />,
    new: <NewTransactionPage />,
    transactions: <TransactionsPage />,
    drift: <DriftMonitorPage />,
    model: <ModelInfoPage />,
  };

  return (
    <div className="flex min-h-screen bg-slate-900 text-white">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className="flex-1 p-8 overflow-y-auto">
        {pages[activePage]}
      </main>
    </div>
  );
}

export default App;