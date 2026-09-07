import { useState, useEffect } from "react";
import defaultValues from "./data/defaultValues.json";
import { predictTransaction, getDriftStatus } from "./api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts";

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

function PredictTab() {
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
    <>
      <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 space-y-4">
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

      {error && (
        <div className="mt-6 bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-200">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`mt-6 rounded-xl p-6 border ${
            result.is_fraud
              ? "bg-red-900/30 border-red-700"
              : "bg-green-900/30 border-green-700"
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-semibold">
              {result.is_fraud ? "⚠️ Fraud Detected" : "✅ Transaction Looks Safe"}
            </span>
            <span className="text-2xl font-bold">
              {(result.fraud_probability * 100).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 ${result.is_fraud ? "bg-red-500" : "bg-green-500"}`}
              style={{ width: `${result.fraud_probability * 100}%` }}
            />
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
                    ? "⚠ Unusual Pattern"
                    : "✓ Typical Pattern"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Reconstruction score: {result.anomaly_detection.anomaly_score}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function DriftTab() {
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

  if (loading) {
    return <div className="text-slate-400 text-center py-12">Loading drift status...</div>;
  }

  if (error) {
    return (
      <div className="bg-red-900/40 border border-red-700 rounded-xl p-4 text-red-200">
        {error}
      </div>
    );
  }

  if (drift.status === "no_data" || drift.status === "not_enough_data") {
    return (
      <div className="bg-slate-800 rounded-xl p-6 text-center">
        <p className="text-slate-300">{drift.message}</p>
        <button
          onClick={fetchDrift}
          className="mt-4 bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 text-sm"
        >
          Refresh
        </button>
      </div>
    );
  }

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
            {isDrifted ? "⚠ Data Drift Detected" : "✅ Model Input Distribution Stable"}
          </span>
          <button
            onClick={fetchDrift}
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
        <div className="bg-slate-800 rounded-xl p-6">
          <p className="text-sm font-semibold text-slate-300 mb-4">
            Top Drifted Features (KS-test)
          </p>
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
          <p className="text-xs text-slate-500 mt-2">
            Higher bars indicate stronger statistical evidence that live traffic differs from training data for that feature.
          </p>
        </div>
      )}
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState("predict");

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">FraudSense</h1>
        <p className="text-slate-400 mb-6">Real-time transaction fraud detection</p>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("predict")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "predict"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            Check Transaction
          </button>
          <button
            onClick={() => setActiveTab("drift")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
              activeTab === "drift"
                ? "bg-indigo-600 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            Drift Monitor
          </button>
        </div>

        {activeTab === "predict" ? <PredictTab /> : <DriftTab />}
      </div>
    </div>
  );
}

export default App;