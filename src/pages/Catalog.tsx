import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Package, DollarSign, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface CatalogItem {
  id: string;
  companyAccount: string;
  name: string;
  description: string;
  category: string;
  unitPriceCents: number;
  unitType: string;
  taxable: boolean;
  active: boolean;
}

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

const COMPANY_OPTIONS = [
  { value: "", label: "All Companies" },
  { value: "astro-cleaning-services", label: "Astro Cleaning Services" },
  { value: "content-co-op", label: "Content Co-op" },
];

export function Catalog() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CatalogItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CatalogItem>>({ companyAccount: "astro-cleaning-services", unitType: "visit", taxable: true, active: true });

  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/catalog");
      const json = await res.json();
      setItems(json.data || []);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (accountFilter && item.companyAccount !== accountFilter) return false;
      const q = search.toLowerCase();
      if (q && !item.name.toLowerCase().includes(q) && !item.category.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, accountFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogItem[]>();
    for (const item of filtered) {
      const key = item.category;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  async function handleSave() {
    const payload = {
      ...form,
      unitPriceCents: Math.round((parseFloat(String(form.unitPriceCents)) || 0) * 100),
    };
    const url = editing ? `/api/catalog/${editing.id}` : "/api/catalog";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      setForm({ companyAccount: "astro-cleaning-services", unitType: "visit", taxable: true, active: true });
      fetchItems();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this catalog item?")) return;
    await fetch(`/api/catalog/${id}`, { method: "DELETE" });
    fetchItems();
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Service Catalog</h1>
            <p className="mt-1 text-sm text-slate-500">Manage services and pricing for quotes and invoices.</p>
          </div>
          <button
            onClick={() => { setEditing(null); setForm({ companyAccount: "astro-cleaning-services", unitType: "visit", taxable: true, active: true }); setShowForm(true); }}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Service
          </button>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:outline-none"
            />
          </div>
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
          >
            {COMPANY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Form */}
        {showForm && (
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="mb-4 text-sm font-semibold text-slate-900">{editing ? "Edit Service" : "New Service"}</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Company</label>
                <select
                  value={form.companyAccount}
                  onChange={(e) => setForm({ ...form, companyAccount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                >
                  <option value="astro-cleaning-services">Astro Cleaning Services</option>
                  <option value="content-co-op">Content Co-op</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Name</label>
                <input
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
                <input
                  value={form.category || ""}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Unit Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.unitPriceCents ? form.unitPriceCents / 100 : ""}
                  onChange={(e) => setForm({ ...form, unitPriceCents: Math.round(parseFloat(e.target.value) * 100) })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Unit Type</label>
                <input
                  value={form.unitType || ""}
                  onChange={(e) => setForm({ ...form, unitType: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-4 pt-6">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.taxable}
                    onChange={(e) => setForm({ ...form, taxable: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Taxable
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(e) => setForm({ ...form, active: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Active
                </label>
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-500">Description</label>
                <textarea
                  value={form.description || ""}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleSave} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors">
                {editing ? "Update" : "Create"}
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="py-20 text-center text-sm text-slate-400">Loading catalog...</div>
        ) : grouped.length === 0 ? (
          <div className="py-20 text-center text-sm text-slate-400">No services found.</div>
        ) : (
          <div className="space-y-8">
            {grouped.map(([category, categoryItems]) => (
              <div key={category}>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500">
                  <Tag className="h-3.5 w-3.5" />
                  {category}
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryItems.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        "group relative rounded-xl border bg-white p-4 transition-all hover:border-emerald-300 hover:shadow-sm",
                        item.active ? "border-slate-200" : "border-slate-200 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-emerald-600" />
                          <span className="text-sm font-medium text-slate-900">{item.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditing(item); setForm(item); setShowForm(true); }}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">{item.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCents(item.unitPriceCents)}
                          <span className="text-xs font-normal text-slate-400">/{item.unitType}</span>
                        </div>
                        <span className={cn("text-[10px] font-medium uppercase tracking-wider", item.taxable ? "text-amber-600" : "text-slate-400")}>
                          {item.taxable ? "Taxable" : "Non-taxable"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
