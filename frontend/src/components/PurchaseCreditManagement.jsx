import React, { useState, useEffect, useCallback } from 'react';
import {
  Truck, Phone, MapPin, Calendar, Clock, DollarSign,
  Plus, Search, RefreshCw, CheckCircle2, AlertCircle, FileText,
  Printer, Trash2, ArrowUpRight, ArrowDownLeft, ShieldCheck, X, Building2
} from 'lucide-react';
import {
  getPurchaseCredits,
  getPurchaseCreditById,
  createPurchaseCredit,
  recordPurchaseCreditPayment,
  syncPurchaseCredits,
  deletePurchaseCredit
} from '../services/api';
import { toast } from 'sonner';

const STATUS_BADGE = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  PARTIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

const fmt = (n) => `Rs. ${(Number(n) || 0).toLocaleString('en-PK')}`;

export function PurchaseCreditManagement({ shopId = 1 }) {
  const [credits, setCredits] = useState([]);
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalAmount: 0,
    totalPaidAmount: 0,
    totalDueBalance: 0,
    activeCreditors: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [paymentModalData, setPaymentModalData] = useState(null);
  const [ledgerModalData, setLedgerModalData] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // Add Form
  const [addForm, setAddForm] = useState({
    supplierName: '',
    supplierPhone: '',
    supplierAddress: '',
    billNumber: '',
    totalAmount: '',
    amountPaid: '',
    dueDate: '',
    notes: '',
    paymentMethod: 'CASH'
  });
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amountPaid: '',
    paymentMethod: 'CASH',
    receiptNumber: '',
    transactionId: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchCredits = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPurchaseCredits(shopId, {
        status: statusFilter,
        search
      });
      if (data.success) {
        setCredits(data.credits || []);
        setStats({
          totalCredits: data.totalCredits || 0,
          totalAmount: data.totalAmount || 0,
          totalPaidAmount: data.totalPaidAmount || 0,
          totalDueBalance: data.totalDueBalance || 0,
          activeCreditors: data.activeCreditors || 0
        });
      }
    } catch (err) {
      console.error('Fetch purchase credits error:', err);
      toast.error('Failed to load purchase credits');
    } finally {
      setLoading(false);
    }
  }, [shopId, statusFilter, search]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Handle Sync from Purchases Table
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncPurchaseCredits(shopId);
      if (res.success) {
        toast.success(res.message || 'Synced supplier credits successfully');
        fetchCredits();
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync purchase credits');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Add Purchase Credit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.supplierName.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    if (!addForm.totalAmount || Number(addForm.totalAmount) <= 0) {
      toast.error('Please enter a valid bill amount');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await createPurchaseCredit({
        ...addForm,
        shopId,
        totalAmount: Number(addForm.totalAmount),
        amountPaid: Number(addForm.amountPaid) || 0
      });
      if (res.success) {
        toast.success('Purchase credit recorded successfully!');
        setAddModalOpen(false);
        setAddForm({
          supplierName: '',
          supplierPhone: '',
          supplierAddress: '',
          billNumber: '',
          totalAmount: '',
          amountPaid: '',
          dueDate: '',
          notes: '',
          paymentMethod: 'CASH'
        });
        fetchCredits();
      }
    } catch (err) {
      console.error('Create purchase credit error:', err);
      toast.error(err.response?.data?.message || 'Failed to add purchase credit record');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Open Payment Modal
  const openPaymentModal = (credit) => {
    setPaymentModalData(credit);
    setPaymentForm({
      amountPaid: '',
      paymentMethod: 'CASH',
      receiptNumber: `VOUCH-${Date.now().toString().slice(-6)}`,
      transactionId: '',
      notes: ''
    });
  };

  // Handle Record Payment to Supplier
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalData) return;

    const amt = Number(paymentForm.amountPaid);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (amt > Number(paymentModalData.dueBalance)) {
      toast.error(`Amount cannot exceed remaining payable of ${fmt(paymentModalData.dueBalance)}`);
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordPurchaseCreditPayment(paymentModalData.id, {
        ...paymentForm,
        amountPaid: amt
      });
      if (res.success) {
        toast.success(res.message || 'Supplier payment recorded successfully!');
        setPaymentModalData(null);
        fetchCredits();
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.response?.data?.message || 'Failed to record supplier payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Ledger Modal
  const openLedgerModal = async (credit) => {
    try {
      const res = await getPurchaseCreditById(credit.id);
      if (res.success) {
        setLedgerModalData({
          credit: res.credit,
          payments: res.payments || []
        });
      }
    } catch (err) {
      toast.error('Failed to load supplier payment history');
    }
  };

  // Delete Credit
  const handleDelete = async (id) => {
    try {
      const res = await deletePurchaseCredit(id);
      if (res.success) {
        toast.success('Purchase credit deleted');
        setDeleteConfirmId(null);
        fetchCredits();
      }
    } catch (err) {
      toast.error('Failed to delete purchase credit record');
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header Banner ─── */}
      <div className="bg-gradient-to-r from-[#0d2228] via-[#053b47] to-[#06242c] p-5 sm:p-7 rounded-3xl border border-cyan-500/20 shadow-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">
            <Truck className="w-4 h-4" /> Supplier Purchases & Khata Ledger (د سپلائرانو پور او کهاته)
          </div>
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            Purchase Credit Ledger
          </h2>
          <p className="text-xs text-cyan-200/80 mt-1 max-w-xl">
            Track pending dues to suppliers, stock purchase credits, payment vouchers, and vendor account statements.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-white shadow-sm"
            title="Import unpaid stock purchases from Purchases table"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Stock Dues'}</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Purchase Credit</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Purchase Bills */}
        <div className="bg-gradient-to-br from-[#121c1f] to-[#081114] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-300/80">Total Purchase Credit</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{fmt(stats.totalAmount)}</div>
          <div className="text-[10px] text-zinc-400 font-bold mt-1">د سپلائرانو ټول پور ({stats.totalCredits} bills)</div>
        </div>

        {/* Total Paid to Suppliers */}
        <div className="bg-gradient-to-br from-[#121c17] to-[#08120c] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300/80">Paid to Suppliers</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{fmt(stats.totalPaidAmount)}</div>
          <div className="text-[10px] text-zinc-400 font-bold mt-1">ټول ادا شوي پیسې (Total Cleared)</div>
        </div>

        {/* Remaining Payable Balance */}
        <div className="bg-gradient-to-br from-[#1c1214] to-[#12080a] p-5 rounded-2xl border border-rose-500/20 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-300/80">Remaining Payable</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{fmt(stats.totalDueBalance)}</div>
          <div className="text-[10px] text-rose-300/70 font-bold mt-1">باقي واجب الاداء (Pending Supplier Dues)</div>
        </div>

        {/* Active Creditors */}
        <div className="bg-gradient-to-br from-[#181523] to-[#0c0a15] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-purple-300/80">Active Suppliers</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.activeCreditors} Suppliers</div>
          <div className="text-[10px] text-zinc-400 font-bold mt-1">پور ورکوونکي سپلائران</div>
        </div>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="bg-[#101c20] p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search supplier, phone, bill #..."
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Bills' },
            { id: 'PENDING', label: 'Pending Dues' },
            { id: 'PARTIAL', label: 'Partially Paid' },
            { id: 'PAID', label: 'Fully Paid' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-cyan-500 text-zinc-950 font-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-[#0b1619] rounded-3xl border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm font-bold">Loading Purchase Credits...</p>
          </div>
        ) : credits.length === 0 ? (
          <div className="py-20 text-center text-zinc-400">
            <Truck className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-300">No Purchase Credit records found</p>
            <p className="text-xs text-zinc-500 mt-1">Click "Add Purchase Credit" or "Sync Stock Dues" to import dues.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-cyan-300/80 uppercase text-[10px] font-black tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Supplier Details</th>
                  <th className="py-3.5 px-4">Bill / Date</th>
                  <th className="py-3.5 px-4 text-right">Total Bill</th>
                  <th className="py-3.5 px-4 text-right">Paid Amount</th>
                  <th className="py-3.5 px-4 text-right">Remaining Due</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {credits.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-black text-xs shrink-0">
                          {item.supplierName?.charAt(0)?.toUpperCase() || 'S'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-[13px]">{item.supplierName}</div>
                          {item.supplierPhone && (
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-cyan-400" />
                              <span>{item.supplierPhone}</span>
                            </div>
                          )}
                          {item.supplierAddress && (
                            <div className="text-[10px] text-zinc-500 truncate max-w-[200px] mt-0.5">
                              {item.supplierAddress}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-zinc-300 text-[11px] font-bold">{item.billNumber || '—'}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {item.creditDate ? new Date(item.creditDate).toLocaleDateString('en-GB') : '—'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-white text-[13px]">
                      {fmt(item.totalAmount)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      {fmt(item.amountPaid)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-[13px]">
                      <span className={Number(item.dueBalance) > 0 ? 'text-rose-400' : 'text-emerald-400'}>
                        {fmt(item.dueBalance)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border tracking-wider ${
                        STATUS_BADGE[item.status] || STATUS_BADGE.PENDING
                      }`}>
                        {item.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {Number(item.dueBalance) > 0 && (
                          <button
                            onClick={() => openPaymentModal(item)}
                            className="px-2.5 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Pay Supplier Installment"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay Dues</span>
                          </button>
                        )}

                        <button
                          onClick={() => openLedgerModal(item)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                          title="View Supplier Ledger / Vouchers"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-400" />
                          <span>Ledger</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── ADD NEW PURCHASE CREDIT MODAL ─── */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1f24] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">Record Supplier Purchase Credit</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Supplier / Vendor Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.supplierName}
                  onChange={(e) => setAddForm({ ...addForm, supplierName: e.target.value })}
                  placeholder="e.g. Alfaham Traders Peshawar"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Supplier Phone
                  </label>
                  <input
                    type="text"
                    value={addForm.supplierPhone}
                    onChange={(e) => setAddForm({ ...addForm, supplierPhone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Bill / Invoice #
                  </label>
                  <input
                    type="text"
                    value={addForm.billNumber}
                    onChange={(e) => setAddForm({ ...addForm, billNumber: e.target.value })}
                    placeholder="e.g. BILL-4910"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Total Bill Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addForm.totalAmount}
                    onChange={(e) => setAddForm({ ...addForm, totalAmount: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-black text-cyan-400 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Advance Paid (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.amountPaid}
                    onChange={(e) => setAddForm({ ...addForm, amountPaid: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-bold text-emerald-400 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={addForm.dueDate}
                    onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Initial Payment Method
                  </label>
                  <select
                    value={addForm.paymentMethod}
                    onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                  >
                    <option value="CASH">Cash (نغد)</option>
                    <option value="EASYPAISA">EasyPaisa / JazzCash</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Supplier Address / Market
                </label>
                <input
                  type="text"
                  value={addForm.supplierAddress}
                  onChange={(e) => setAddForm({ ...addForm, supplierAddress: e.target.value })}
                  placeholder="e.g. Shop #12, Karkhano Market, Peshawar"
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Notes / Supplied Items
                </label>
                <textarea
                  rows="2"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Perfume stock batch, cartons, terms..."
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5"
                >
                  {submittingAdd ? 'Saving...' : 'Save Purchase Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── PAY SUPPLIER DUES MODAL ─── */}
      {paymentModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1f24] border border-cyan-500/30 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-cyan-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">Pay Supplier Dues</h3>
              </div>
              <button onClick={() => setPaymentModalData(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10">
              <div className="text-xs text-zinc-400">Supplier Name:</div>
              <div className="text-base font-black text-white">{paymentModalData.supplierName}</div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                <span className="text-xs text-zinc-400">Remaining Payable:</span>
                <span className="text-base font-black text-rose-400">{fmt(paymentModalData.dueBalance)}</span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Payment Amount (Rs.) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max={paymentModalData.dueBalance}
                  value={paymentForm.amountPaid}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountPaid: e.target.value })}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-black text-cyan-400 focus:outline-none focus:border-cyan-500/60"
                />
                {/* Quick Fill Buttons */}
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amountPaid: String(paymentModalData.dueBalance) })}
                    className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold rounded-lg text-cyan-300"
                  >
                    Full: {fmt(paymentModalData.dueBalance)}
                  </button>
                  {Number(paymentModalData.dueBalance) > 1000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amountPaid: String(Math.floor(Number(paymentModalData.dueBalance) / 2)) })}
                      className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold rounded-lg text-zinc-300"
                    >
                      50%: {fmt(Math.floor(Number(paymentModalData.dueBalance) / 2))}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                >
                  <option value="CASH">Cash (نغد)</option>
                  <option value="EASYPAISA">EasyPaisa / JazzCash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Voucher / Slip #
                </label>
                <input
                  type="text"
                  value={paymentForm.receiptNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Installment paid to supplier..."
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/60"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-bold text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg"
                >
                  {submittingPayment ? 'Processing...' : 'Pay Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── SUPPLIER LEDGER STATEMENT MODAL ─── */}
      {ledgerModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b181c] border border-cyan-500/30 rounded-3xl p-6 max-w-2xl w-full text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" /> Supplier Purchase Ledger Statement
                </h3>
                <p className="text-xs text-zinc-400">Statement for {ledgerModalData.credit.supplierName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all text-white flex items-center gap-1.5"
                  title="Print Statement"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setLedgerModalData(null)} className="text-zinc-400 hover:text-white p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Supplier Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Total Bill</div>
                <div className="text-sm font-black text-white mt-1">{fmt(ledgerModalData.credit.totalAmount)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Total Paid</div>
                <div className="text-sm font-black text-emerald-400 mt-1">{fmt(ledgerModalData.credit.amountPaid)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Payable Due</div>
                <div className="text-sm font-black text-rose-400 mt-1">{fmt(ledgerModalData.credit.dueBalance)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Status</div>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${STATUS_BADGE[ledgerModalData.credit.status]}`}>
                    {ledgerModalData.credit.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Vouchers History List */}
            <div className="mt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-cyan-300 mb-2">
                Supplier Payments & Vouchers ({ledgerModalData.payments.length})
              </h4>

              {ledgerModalData.payments.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 bg-black/20 rounded-xl">
                  No payment vouchers recorded yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerModalData.payments.map((p) => (
                    <div key={p.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Paid: {fmt(p.amountPaid)}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-md text-zinc-300">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-3">
                          <span>Voucher: {p.receiptNumber || '—'}</span>
                          <span>Paid By: {p.paidBy || 'Admin'}</span>
                          {p.notes && <span className="italic text-zinc-500">"{p.notes}"</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono">
                        {p.paymentDate ? new Date(p.paymentDate).toLocaleString('en-GB') : '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setLedgerModalData(null)}
                className="px-5 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1214] border border-rose-500/30 rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl">
            <h3 className="text-base font-black uppercase text-rose-400">Delete Purchase Credit?</h3>
            <p className="text-xs text-zinc-300 mt-2">
              Are you sure you want to delete this purchase credit record and all linked payment vouchers?
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseCreditManagement;
