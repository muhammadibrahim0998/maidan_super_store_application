import React, { useState, useEffect, useCallback } from 'react';
import {
  CreditCard, User, Phone, MapPin, Calendar, Clock, DollarSign,
  Plus, Search, RefreshCw, CheckCircle2, AlertCircle, FileText,
  Printer, Trash2, ArrowUpRight, ArrowDownLeft, ShieldCheck, X
} from 'lucide-react';
import {
  getCustomerCredits,
  getCustomerCreditById,
  createCustomerCredit,
  recordCustomerCreditPayment,
  syncCustomerCredits,
  deleteCustomerCredit
} from '../services/api';
import { toast } from 'sonner';

const STATUS_BADGE = {
  PENDING: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  PARTIAL: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
};

const fmt = (n) => `Rs. ${(Number(n) || 0).toLocaleString('en-PK')}`;

export function CustomerCreditManagement({ shopId = 1 }) {
  const [credits, setCredits] = useState([]);
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalCreditAmount: 0,
    totalPaidAmount: 0,
    totalDueBalance: 0,
    activeDebtors: 0
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
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    invoiceNumber: '',
    totalCredit: '',
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
      const data = await getCustomerCredits(shopId, {
        status: statusFilter,
        search
      });
      if (data.success) {
        setCredits(data.credits || []);
        setStats({
          totalCredits: data.totalCredits || 0,
          totalCreditAmount: data.totalCreditAmount || 0,
          totalPaidAmount: data.totalPaidAmount || 0,
          totalDueBalance: data.totalDueBalance || 0,
          activeDebtors: data.activeDebtors || 0
        });
      }
    } catch (err) {
      console.error('Fetch customer credits error:', err);
      toast.error('Failed to load customer credits');
    } finally {
      setLoading(false);
    }
  }, [shopId, statusFilter, search]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits]);

  // Handle Sync from POS Sales
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncCustomerCredits(shopId);
      if (res.success) {
        toast.success(res.message || 'Synced credit sales successfully');
        fetchCredits();
      }
    } catch (err) {
      console.error('Sync error:', err);
      toast.error('Failed to sync sales credits');
    } finally {
      setIsSyncing(false);
    }
  };

  // Handle Add Credit
  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.customerName.trim()) {
      toast.error('Customer name is required');
      return;
    }
    if (!addForm.totalCredit || Number(addForm.totalCredit) <= 0) {
      toast.error('Please enter a valid credit amount');
      return;
    }

    setSubmittingAdd(true);
    try {
      const res = await createCustomerCredit({
        ...addForm,
        shopId,
        totalCredit: Number(addForm.totalCredit),
        amountPaid: Number(addForm.amountPaid) || 0
      });
      if (res.success) {
        toast.success('Customer credit recorded successfully!');
        setAddModalOpen(false);
        setAddForm({
          customerName: '',
          customerPhone: '',
          customerAddress: '',
          invoiceNumber: '',
          totalCredit: '',
          amountPaid: '',
          dueDate: '',
          notes: '',
          paymentMethod: 'CASH'
        });
        fetchCredits();
      }
    } catch (err) {
      console.error('Create credit error:', err);
      toast.error(err.response?.data?.message || 'Failed to add credit record');
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
      receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      transactionId: '',
      notes: ''
    });
  };

  // Handle Record Payment
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentModalData) return;

    const amt = Number(paymentForm.amountPaid);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    if (amt > Number(paymentModalData.dueBalance)) {
      toast.error(`Amount cannot exceed due balance of ${fmt(paymentModalData.dueBalance)}`);
      return;
    }

    setSubmittingPayment(true);
    try {
      const res = await recordCustomerCreditPayment(paymentModalData.id, {
        ...paymentForm,
        amountPaid: amt
      });
      if (res.success) {
        toast.success(res.message || 'Payment recorded successfully!');
        setPaymentModalData(null);
        fetchCredits();
      }
    } catch (err) {
      console.error('Payment error:', err);
      toast.error(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmittingPayment(false);
    }
  };

  // Open Ledger Modal
  const openLedgerModal = async (credit) => {
    try {
      const res = await getCustomerCreditById(credit.id);
      if (res.success) {
        setLedgerModalData({
          credit: res.credit,
          payments: res.payments || []
        });
      }
    } catch (err) {
      toast.error('Failed to load payment history');
    }
  };

  // Delete Credit
  const handleDelete = async (id) => {
    try {
      const res = await deleteCustomerCredit(id);
      if (res.success) {
        toast.success('Customer credit deleted');
        setDeleteConfirmId(null);
        fetchCredits();
      }
    } catch (err) {
      toast.error('Failed to delete credit record');
    }
  };

  return (
    <div className="space-y-6">
      {/* ─── Header Banner ─── */}
      <div className="bg-gradient-to-r from-[#0d2818] via-[#04471c] to-[#052c16] p-5 sm:p-7 rounded-3xl border border-emerald-500/20 shadow-2xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
            <CreditCard className="w-4 h-4" /> Customer Khata & Credit Ledger (د پیرودونکو کهاته او پور)
          </div>
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white flex items-center gap-2">
            Customer Credit Ledger
          </h2>
          <p className="text-xs text-emerald-200/80 mt-1 max-w-xl">
            Track customer credits, pending dues, installment payments, and view comprehensive customer ledger statements.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-white shadow-sm"
            title="Import credit sales from POS automatically"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync POS Credits'}</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex-1 md:flex-initial px-5 py-2.5 bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-400 hover:from-amber-500 hover:to-yellow-500 text-zinc-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer Credit</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credit Given */}
        <div className="bg-gradient-to-br from-[#121c17] to-[#08120c] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-amber-300/80">Total Credit Given</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{fmt(stats.totalCreditAmount)}</div>
          <div className="text-[10px] text-zinc-400 font-bold mt-1">ټول پور ورکړل شوی ({stats.totalCredits} entries)</div>
        </div>

        {/* Total Recovered / Paid */}
        <div className="bg-gradient-to-br from-[#121c17] to-[#08120c] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300/80">Total Recovered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400">{fmt(stats.totalPaidAmount)}</div>
          <div className="text-[10px] text-zinc-400 font-bold mt-1">ټول وصول شوي پیسې</div>
        </div>

        {/* Outstanding Due Balance */}
        <div className="bg-gradient-to-br from-[#1c1214] to-[#12080a] p-5 rounded-2xl border border-rose-500/20 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-300/80">Remaining Outstanding</span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400">{fmt(stats.totalDueBalance)}</div>
          <div className="text-[10px] text-rose-300/70 font-bold mt-1">باقي پاتې پور (Pending Customer Dues)</div>
        </div>

        {/* Active Debtors */}
        <div className="bg-gradient-to-br from-[#121c17] to-[#08120c] p-5 rounded-2xl border border-white/10 shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-blue-300/80">Active Debtors</span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">{stats.activeDebtors} Customers</div>
          <div className="text-[10px] text-zinc-400 font-bold mt-1">پور وړي پیرودونکي</div>
        </div>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="bg-[#121f15] p-4 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, invoice..."
            className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'All Credits' },
            { id: 'PENDING', label: 'Pending / Unpaid' },
            { id: 'PARTIAL', label: 'Partially Paid' },
            { id: 'PAID', label: 'Fully Cleared' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold tracking-wide transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-500 text-zinc-950 font-black shadow-md'
                  : 'bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-[#0e1911] rounded-3xl border border-white/10 shadow-xl overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-zinc-400 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
            <p className="text-sm font-bold">Loading Customer Credits...</p>
          </div>
        ) : credits.length === 0 ? (
          <div className="py-20 text-center text-zinc-400">
            <CreditCard className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-zinc-300">No Customer Credit records found</p>
            <p className="text-xs text-zinc-500 mt-1">Click "Add Customer Credit" or "Sync POS Credits" to record credit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/40 text-emerald-300/80 uppercase text-[10px] font-black tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">Customer Details</th>
                  <th className="py-3.5 px-4">Invoice / Date</th>
                  <th className="py-3.5 px-4 text-right">Total Credit</th>
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
                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-black text-xs shrink-0">
                          {item.customerName?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-white text-[13px]">{item.customerName}</div>
                          {item.customerPhone && (
                            <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>{item.customerPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-zinc-300 text-[11px] font-bold">{item.invoiceNumber || '—'}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">
                        {item.creditDate ? new Date(item.creditDate).toLocaleDateString('en-GB') : '—'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-white text-[13px]">
                      {fmt(item.totalCredit)}
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
                            className="px-2.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Receive Installment / Payment"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Receive</span>
                          </button>
                        )}

                        <button
                          onClick={() => openLedgerModal(item)}
                          className="px-2.5 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                          title="View Ledger Statement"
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

      {/* ─── ADD NEW CUSTOMER CREDIT MODAL ─── */}
      {addModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#102016] border border-emerald-500/30 rounded-3xl p-6 max-w-lg w-full text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">Record Customer Credit</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  placeholder="e.g. Haji Janan Khan"
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={addForm.customerPhone}
                    onChange={(e) => setAddForm({ ...addForm, customerPhone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    value={addForm.invoiceNumber}
                    onChange={(e) => setAddForm({ ...addForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-1049"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Total Credit Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addForm.totalCredit}
                    onChange={(e) => setAddForm({ ...addForm, totalCredit: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-black text-amber-400 focus:outline-none focus:border-emerald-500/60"
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
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white font-bold text-emerald-400 focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={addForm.dueDate}
                    onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={addForm.paymentMethod}
                    onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                  >
                    <option value="CASH">Cash (نغد)</option>
                    <option value="EASYPAISA">EasyPaisa / JazzCash</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Notes / Detail
                </label>
                <textarea
                  rows="2"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Items taken on credit, remarks..."
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
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
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg flex items-center gap-1.5"
                >
                  {submittingAdd ? 'Saving...' : 'Save Credit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── RECEIVE INSTALLMENT MODAL ─── */}
      {paymentModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#102016] border border-emerald-500/30 rounded-3xl p-6 max-w-md w-full text-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-400" />
                <h3 className="text-lg font-black uppercase tracking-tight">Receive Credit Installment</h3>
              </div>
              <button onClick={() => setPaymentModalData(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-black/40 border border-white/10">
              <div className="text-xs text-zinc-400">Customer Name:</div>
              <div className="text-base font-black text-white">{paymentModalData.customerName}</div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/5">
                <span className="text-xs text-zinc-400">Remaining Balance:</span>
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
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm font-black text-emerald-400 focus:outline-none focus:border-emerald-500/60"
                />
                {/* Quick Fill Buttons */}
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amountPaid: String(paymentModalData.dueBalance) })}
                    className="px-2 py-0.5 bg-white/5 hover:bg-white/10 text-[10px] font-bold rounded-lg text-emerald-300"
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
                  className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
                >
                  <option value="CASH">Cash (نغد)</option>
                  <option value="EASYPAISA">EasyPaisa / JazzCash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  Receipt / Transaction #
                </label>
                <input
                  type="text"
                  value={paymentForm.receiptNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
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
                  placeholder="Installment payment..."
                  className="w-full px-3.5 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/60"
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
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-zinc-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-lg"
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── LEDGER STATEMENT MODAL ─── */}
      {ledgerModalData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f1d14] border border-emerald-500/30 rounded-3xl p-6 max-w-2xl w-full text-white shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-emerald-400" /> Customer Credit Ledger Statement
                </h3>
                <p className="text-xs text-zinc-400">Statement for {ledgerModalData.credit.customerName}</p>
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

            {/* Customer Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-4 rounded-2xl bg-black/40 border border-white/10 text-center">
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Total Credit</div>
                <div className="text-sm font-black text-white mt-1">{fmt(ledgerModalData.credit.totalCredit)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Amount Paid</div>
                <div className="text-sm font-black text-emerald-400 mt-1">{fmt(ledgerModalData.credit.amountPaid)}</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase font-black">Balance Due</div>
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

            {/* Payment History List */}
            <div className="mt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300 mb-2">
                Payment Transactions & Installments ({ledgerModalData.payments.length})
              </h4>

              {ledgerModalData.payments.length === 0 ? (
                <div className="py-6 text-center text-xs text-zinc-500 bg-black/20 rounded-xl">
                  No installments paid yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerModalData.payments.map((p) => (
                    <div key={p.id} className="p-3 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-white flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Paid: {fmt(p.amountPaid)}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-white/5 rounded-md text-zinc-300">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1 flex items-center gap-3">
                          <span>Ref: {p.receiptNumber || '—'}</span>
                          <span>By: {p.receivedBy || 'Admin'}</span>
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
            <h3 className="text-base font-black uppercase text-rose-400">Delete Credit Record?</h3>
            <p className="text-xs text-zinc-300 mt-2">
              Are you sure you want to delete this customer credit record and all of its associated payment records?
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

export default CustomerCreditManagement;
