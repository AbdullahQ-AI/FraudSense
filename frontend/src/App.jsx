import { useState } from "react";
import defaultValues from "./data/defaultValues.json";
import { predictTransaction } from "./api";

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

function App() {
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
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-1">FraudSense</h1>
        <p className="text-slate-400 mb-8">Real-time transaction fraud detection</p>

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
      </div>
    </div>
  );
}

export default App;