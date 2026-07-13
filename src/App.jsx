import { useState, useMemo, useEffect } from "react";
import { Plus, X, FileText, TrendingUp, TrendingDown, Scissors, Upload, Trash2 } from "lucide-react";
import Papa from "papaparse";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

const CATEGORIES_IN = ["Job income", "Tip / bonus", "Other income"];
const CATEGORIES_OUT = ["Supplies", "Gas / travel", "Equipment", "Labor", "Other expense"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STORAGE_KEY = "greenline-ledger-entries";
const NAME_KEY = "greenline-ledger-name";

const seedEntries = [
  { id: 1, type: "in", category: "Job income", note: "Miller residence — biweekly", amount: 480, month: 4 },
  { id: 2, type: "in", category: "Job income", note: "Chen residence — mow + edge", amount: 260, month: 4 },
  { id: 3, type: "out", category: "Gas / travel", note: "Truck fill-up", amount: 62, month: 4 },
  { id: 4, type: "out", category: "Supplies", note: "Trimmer line, bags", amount: 45, month: 4 },
  { id: 5, type: "in", category: "Job income", note: "Miller residence — biweekly", amount: 480, month: 5 },
  { id: 6, type: "in", category: "Job income", note: "3 new spring cleanups", amount: 720, month: 5 },
  { id: 7, type: "out", category: "Equipment", note: "Blade sharpening", amount: 30, month: 5 },
  { id: 8, type: "out", category: "Gas / travel", note: "Truck fill-up x2", amount: 118, month: 5 },
];

function currency(n) {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seedEntries;
  } catch {
    return seedEntries;
  }
}

export default function App() {
  const [entries, setEntries] = useState(loadEntries);
  const [businessName, setBusinessName] = useState(() => localStorage.getItem(NAME_KEY) || "Your Business Name");
  const [editingName, setEditingName] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm] = useState({ type: "in", category: CATEGORIES_IN[0], note: "", amount: "" });
  const [invoice, setInvoice] = useState({ client: "", job: "", amount: "" });
  const [csvText, setCsvText] = useState("");
  const [importError, setImportError] = useState("");

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(NAME_KEY, businessName);
  }, [businessName]);

  const totals = useMemo(() => {
    const income = entries.filter((e) => e.type === "in").reduce((s, e) => s + e.amount, 0);
    const expense = entries.filter((e) => e.type === "out").reduce((s, e) => s + e.amount, 0);
    return { income, expense, profit: income - expense, margin: income ? ((income - expense) / income) * 100 : 0 };
  }, [entries]);

  const chartData = useMemo(() => {
    const byMonth = {};
    entries.forEach((e) => {
      const key = e.month;
      if (!byMonth[key]) byMonth[key] = { month: MONTHS[key], income: 0, expense: 0 };
      if (e.type === "in") byMonth[key].income += e.amount;
      else byMonth[key].expense += e.amount;
    });
    return Object.keys(byMonth).sort((a, b) => a - b).map((k) => byMonth[k]);
  }, [entries]);

  function addEntry() {
    if (!form.note || !form.amount) return;
    setEntries((prev) => [
      { id: Date.now(), type: form.type, category: form.category, note: form.note, amount: Number(form.amount), month: new Date().getMonth() },
      ...prev,
    ]);
    setForm({ type: "in", category: CATEGORIES_IN[0], note: "", amount: "" });
    setShowForm(false);
  }

  function deleteEntry(id) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function resetData() {
    if (confirm("This clears all your real entries and restores the sample data. Continue?")) {
      setEntries(seedEntries);
    }
  }

  function importCsv() {
    setImportError("");
    if (!csvText.trim()) {
      setImportError("Paste some CSV text first.");
      return;
    }
    const parsed = Papa.parse(csvText.trim(), { header: true, skipEmptyLines: true });
    if (parsed.errors.length) {
      setImportError("Couldn't read that CSV. Check the format and try again.");
      return;
    }
    const rows = parsed.data;
    if (!rows.length) {
      setImportError("No rows found.");
      return;
    }
    const findKey = (candidates) => Object.keys(rows[0]).find((k) => candidates.includes(k.toLowerCase().trim()));
    const noteKey = findKey(["note", "description", "memo", "name"]);
    const amountKey = findKey(["amount", "value", "total"]);
    const typeKey = findKey(["type"]);
    const categoryKey = findKey(["category"]);

    if (!amountKey) {
      setImportError("Couldn't find an amount column. Include a header called 'amount'.");
      return;
    }

    const newEntries = rows
      .map((row, i) => {
        const rawAmount = parseFloat(String(row[amountKey]).replace(/[^0-9.-]/g, ""));
        if (isNaN(rawAmount) || rawAmount === 0) return null;
        const type = typeKey ? (String(row[typeKey]).toLowerCase().includes("in") ? "in" : "out") : rawAmount < 0 ? "out" : "in";
        return {
          id: Date.now() + i,
          type,
          category: categoryKey ? row[categoryKey] : type === "in" ? "Job income" : "Other expense",
          note: noteKey ? row[noteKey] : "Imported entry",
          amount: Math.abs(rawAmount),
          month: new Date().getMonth(),
        };
      })
      .filter(Boolean);

    if (!newEntries.length) {
      setImportError("No usable rows found in that file.");
      return;
    }
    setEntries((prev) => [...newEntries, ...prev]);
    setCsvText("");
    setShowImport(false);
  }

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#1C2321]">
      <div className="border-b-2 border-[#1C2321] px-6 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs tracking-[0.2em] uppercase text-[#8C8A80]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Weekly ledger
          </p>
          {editingName ? (
            <input
              autoFocus
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditingName(false)}
              className="text-2xl sm:text-3xl font-bold bg-transparent border-b-2 border-[#1C2321] outline-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            />
          ) : (
            <h1
              onClick={() => setEditingName(true)}
              className="text-2xl sm:text-3xl font-bold cursor-pointer"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              title="Click to rename"
            >
              {businessName}
            </h1>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 border-2 border-[#1C2321] px-4 py-2 text-sm font-medium hover:bg-[#1C2321] hover:text-[#F6F3EC] transition-colors">
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={() => setShowInvoice(true)} className="flex items-center gap-2 border-2 border-[#1C2321] px-4 py-2 text-sm font-medium hover:bg-[#1C2321] hover:text-[#F6F3EC] transition-colors">
            <FileText size={16} /> New invoice
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="col-span-2 sm:col-span-1 relative border-2 border-[#2D5A4A] p-4">
            <p className="text-xs uppercase tracking-wider text-[#8C8A80] mb-1">All time</p>
            <p className="text-3xl font-bold text-[#2D5A4A]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              {currency(totals.profit)}
            </p>
            <p className="text-xs text-[#8C8A80] mt-1">net profit</p>
            <div className="absolute -top-3 -right-3 rotate-12 border-2 border-[#E2A23B] text-[#E2A23B] text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#F6F3EC]">
              Stamped
            </div>
          </div>
          <Stat icon={<TrendingUp size={16} />} label="Income" value={currency(totals.income)} color="#2D5A4A" />
          <Stat icon={<TrendingDown size={16} />} label="Expenses" value={currency(totals.expense)} color="#B0503F" />
          <Stat icon={<Scissors size={16} />} label="Margin" value={`${totals.margin.toFixed(0)}%`} color="#1C2321" />
        </div>

        <div className="border-2 border-[#1C2321] p-4 sm:p-6">
          <p className="text-xs uppercase tracking-wider text-[#8C8A80] mb-4" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            Income vs. expenses by month
          </p>
          {chartData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid stroke="#e2ddd0" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8C8A80", fontSize: 12 }} axisLine={{ stroke: "#1C2321" }} tickLine={false} />
                <YAxis tick={{ fill: "#8C8A80", fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "#1C2321", border: "none", borderRadius: 0, color: "#F6F3EC" }} formatter={(v) => currency(v)} />
                <Bar dataKey="income" fill="#2D5A4A" radius={0} />
                <Bar dataKey="expense" fill="#B0503F" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[#8C8A80] py-8 text-center">No entries yet. Add one to see your trend.</p>
          )}
        </div>

        <div className="border-2 border-[#1C2321]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-b-2 border-[#1C2321]">
            <p className="text-xs uppercase tracking-wider text-[#8C8A80]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
              Entries ({entries.length})
            </p>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1 text-sm font-medium border-2 border-[#1C2321] px-3 py-1.5 hover:bg-[#1C2321] hover:text-[#F6F3EC] transition-colors">
              <Plus size={14} /> Add entry
            </button>
          </div>
          <div>
            {entries.length === 0 && (
              <p className="text-sm text-[#8C8A80] px-4 sm:px-6 py-6 text-center">Nothing logged yet. Add your first job or expense above.</p>
            )}
            {entries.map((e) => (
              <div key={e.id} className="group flex items-center justify-between px-4 sm:px-6 py-3 border-b border-dashed border-[#d8d3c4] last:border-b-0">
                <div>
                  <p className="text-sm font-medium">{e.note}</p>
                  <p className="text-xs text-[#8C8A80]">{e.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium" style={{ fontFamily: "'IBM Plex Mono', monospace", color: e.type === "in" ? "#2D5A4A" : "#B0503F" }}>
                    {e.type === "in" ? "+" : "-"}
                    {currency(e.amount)}
                  </p>
                  <button onClick={() => deleteEntry(e.id)} className="opacity-0 group-hover:opacity-100 sm:opacity-0 text-[#8C8A80] hover:text-[#B0503F] transition-opacity" aria-label="Delete entry">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 sm:hidden">
          <button onClick={() => setShowImport(true)} className="flex-1 flex items-center justify-center gap-2 border-2 border-[#1C2321] px-4 py-3 text-sm font-medium">
            <Upload size={16} /> Import
          </button>
          <button onClick={() => setShowInvoice(true)} className="flex-1 flex items-center justify-center gap-2 border-2 border-[#1C2321] px-4 py-3 text-sm font-medium">
            <FileText size={16} /> Invoice
          </button>
        </div>

        <button onClick={resetData} className="text-xs text-[#8C8A80] underline hover:text-[#1C2321]">
          Reset to sample data
        </button>
      </div>

      {showForm && (
        <Modal onClose={() => setShowForm(false)} title="Add entry">
          <div className="space-y-4">
            <div className="flex gap-2">
              {["in", "out"].map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((f) => ({ ...f, type: t, category: t === "in" ? CATEGORIES_IN[0] : CATEGORIES_OUT[0] }))}
                  className={`flex-1 py-2 text-sm font-medium border-2 ${form.type === t ? "bg-[#1C2321] text-[#F6F3EC] border-[#1C2321]" : "border-[#d8d3c4] text-[#8C8A80]"}`}
                >
                  {t === "in" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
            <Field label="Category">
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-full border-2 border-[#1C2321] px-3 py-2 text-sm bg-transparent">
                {(form.type === "in" ? CATEGORIES_IN : CATEGORIES_OUT).map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Note">
              <input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="e.g. Miller residence — mow + edge" className="w-full border-2 border-[#1C2321] px-3 py-2 text-sm bg-transparent" />
            </Field>
            <Field label="Amount">
              <input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="0" className="w-full border-2 border-[#1C2321] px-3 py-2 text-sm bg-transparent" style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
            </Field>
            <button onClick={addEntry} className="w-full bg-[#1C2321] text-[#F6F3EC] py-2.5 text-sm font-medium hover:bg-[#2D5A4A] transition-colors">Save entry</button>
          </div>
        </Modal>
      )}

      {showInvoice && (
        <Modal onClose={() => setShowInvoice(false)} title="New invoice">
          <div className="space-y-4">
            <Field label="Client">
              <input value={invoice.client} onChange={(e) => setInvoice((f) => ({ ...f, client: e.target.value }))} placeholder="e.g. Chen residence" className="w-full border-2 border-[#1C2321] px-3 py-2 text-sm bg-transparent" />
            </Field>
            <Field label="Job description">
              <input value={invoice.job} onChange={(e) => setInvoice((f) => ({ ...f, job: e.target.value }))} placeholder="e.g. Mow, edge, and cleanup" className="w-full border-2 border-[#1C2321] px-3 py-2 text-sm bg-transparent" />
            </Field>
            <Field label="Amount due">
              <input value={invoice.amount} onChange={(e) => setInvoice((f) => ({ ...f, amount: e.target.value.replace(/[^0-9.]/g, "") }))} placeholder="0" className="w-full border-2 border-[#1C2321] px-3 py-2 text-sm bg-transparent" style={{ fontFamily: "'IBM Plex Mono', monospace" }} />
            </Field>
            {invoice.client && invoice.amount && (
              <div className="border-2 border-dashed border-[#1C2321] p-4 mt-2" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                <p className="text-xs uppercase tracking-widest text-[#8C8A80] mb-2">Invoice preview</p>
                <p className="text-sm">Bill to: {invoice.client}</p>
                <p className="text-sm text-[#8C8A80]">{invoice.job || "Service rendered"}</p>
                <p className="text-xl font-bold mt-2 text-[#2D5A4A]">{currency(Number(invoice.amount) || 0)}</p>
              </div>
            )}
            <button
              onClick={() => {
                if (invoice.client && invoice.amount) {
                  setEntries((prev) => [
                    { id: Date.now(), type: "in", category: "Job income", note: `${invoice.client} — ${invoice.job || "invoice"}`, amount: Number(invoice.amount), month: new Date().getMonth() },
                    ...prev,
                  ]);
                }
                setInvoice({ client: "", job: "", amount: "" });
                setShowInvoice(false);
              }}
              className="w-full bg-[#1C2321] text-[#F6F3EC] py-2.5 text-sm font-medium hover:bg-[#2D5A4A] transition-colors"
            >
              Send invoice &amp; log as income
            </button>
          </div>
        </Modal>
      )}

      {showImport && (
        <Modal onClose={() => setShowImport(false)} title="Import from CSV">
          <div className="space-y-4">
            <p className="text-xs text-[#8C8A80]">
              Paste a CSV export from your bank or Venmo. Needs an "amount" column at minimum — "note" and "category" columns are used if present. Negative amounts are treated as expenses.
            </p>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"note,amount,category\nChen residence,260,Job income\nGas station,-42,Gas / travel"}
              rows={7}
              className="w-full border-2 border-[#1C2321] px-3 py-2 text-xs bg-transparent"
              style={{ fontFamily: "'IBM Plex Mono', monospace" }}
            />
            {importError && <p className="text-xs text-[#B0503F]">{importError}</p>}
            <button onClick={importCsv} className="w-full bg-[#1C2321] text-[#F6F3EC] py-2.5 text-sm font-medium hover:bg-[#2D5A4A] transition-colors">Import rows</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color }) {
  return (
    <div className="border-2 border-[#1C2321] p-4">
      <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#8C8A80] mb-1">{icon} {label}</div>
      <p className="text-xl sm:text-2xl font-bold" style={{ fontFamily: "'IBM Plex Mono', monospace", color }}>{value}</p>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#8C8A80] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-[#1C2321]/50 flex items-end sm:items-center justify-center p-0 sm:p-6 z-50">
      <div className="bg-[#F6F3EC] w-full sm:max-w-sm border-t-2 sm:border-2 border-[#1C2321] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#1C2321] hover:text-[#F6F3EC]"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
