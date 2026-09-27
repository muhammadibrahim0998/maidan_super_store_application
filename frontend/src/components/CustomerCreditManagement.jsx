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
  PENDING: 'bg-amber-50 text-amber-700 border-amber-300',
  PARTIAL: 'bg-blue-50 text-blue-700 border-blue-300',
  PAID: 'bg-emerald-50 text-emerald-700 border-emerald-300'
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
    <div className="space-y-6 bg-slate-100 p-4 sm:p-6 rounded-3xl min-h-screen">
      {/* ─── Header Banner ─── */}
      <div className="bg-white p-5 sm:p-7 rounded-3xl border border-slate-200 shadow-sm text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest mb-1">
            <CreditCard className="w-4 h-4 text-emerald-600" /> Customer Credit Ledger
          </div>
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
            Customer Credit Ledger
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Track customer credits, pending dues, installment payments, and view comprehensive customer ledger statements.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 text-slate-700 shadow-sm"
            title="Import credit sales from POS automatically"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync POS Credits'}</span>
          </button>

          <button
            onClick={() => setAddModalOpen(true)}
            className="flex-1 md:flex-initial px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-sm flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer Credit</span>
          </button>
        </div>
      </div>

      {/* ─── Metric Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Credit Given */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Credit Given</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{fmt(stats.totalCreditAmount)}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-1">Total Credit Given ({stats.totalCredits} entries)</div>
        </div>

        {/* Total Recovered / Paid */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Total Recovered</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{fmt(stats.totalPaidAmount)}</div>
          <div className="text-[10px] text-slate-500 font-bold mt-1">Total Amount Recovered</div>
        </div>

        {/* Outstanding Due Balance */}
        <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-600">Remaining Outstanding</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">{fmt(stats.totalDueBalance)}</div>
          <div className="text-[10px] text-rose-500 font-bold mt-1">Pending Customer Dues</div>
        </div>

        {/* Active Debtors */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">Active Debtors</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <User className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.activeDebtors} Customers</div>
          <div className="text-[10px] text-slate-500 font-bold mt-1">Active Debtors</div>
        </div>
      </div>

      {/* ─── Search & Status Filters ─── */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, invoice..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
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
                  ? 'bg-slate-900 text-white font-black shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-8 h-8 animate-spin text-slate-600" />
            <p className="text-sm font-bold">Loading Customer Credits...</p>
          </div>
        ) : credits.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700">No Customer Credit records found</p>
            <p className="text-xs text-slate-400 mt-1">Click "Add Customer Credit" or "Sync POS Credits" to record credit.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-black tracking-wider border-b border-slate-200">
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
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {credits.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-xs shrink-0">
                          {item.customerName?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-[13px]">{item.customerName}</div>
                          {item.customerPhone && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{item.customerPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-mono text-slate-800 text-[11px] font-bold">{item.invoiceNumber || '—'}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {item.creditDate ? new Date(item.creditDate).toLocaleDateString('en-GB') : '—'}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-slate-900 text-[13px]">
                      {fmt(item.totalCredit)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-bold text-emerald-600">
                      {fmt(item.amountPaid)}
                    </td>

                    <td className="py-3.5 px-4 text-right font-black text-[13px]">
                      <span className={Number(item.dueBalance) > 0 ? 'text-rose-600' : 'text-emerald-600'}>
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
                            className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1 shadow-sm"
                            title="Receive Installment / Payment"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Receive</span>
                          </button>
                        )}

                        <button
                          onClick={() => openLedgerModal(item)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                          title="View Ledger Statement"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ledger</span>
                        </button>

                        <button
                          onClick={() => setDeleteConfirmId(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full text-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-slate-700" />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Record Customer Credit</h3>
              </div>
              <button onClick={() => setAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  placeholder="e.g. Haji Janan Khan"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={addForm.customerPhone}
                    onChange={(e) => setAddForm({ ...addForm, customerPhone: e.target.value })}
                    placeholder="03001234567"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Invoice / Bill #
                  </label>
                  <input
                    type="text"
                    value={addForm.invoiceNumber}
                    onChange={(e) => setAddForm({ ...addForm, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-1049"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Total Credit Amount (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={addForm.totalCredit}
                    onChange={(e) => setAddForm({ ...addForm, totalCredit: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-black text-amber-600 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Advance Paid (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.amountPaid}
                    onChange={(e) => setAddForm({ ...addForm, amountPaid: e.target.value })}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold text-emerald-600 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={addForm.dueDate}
                    onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Payment Method
                  </label>
                  <select
                    value={addForm.paymentMethod}
                    onChange={(e) => setAddForm({ ...addForm, paymentMethod: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="EASYPAISA">EasyPaisa / JazzCash</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notes / Detail
                </label>
                <textarea
                  rows="2"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  placeholder="Items taken on credit, remarks..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm flex items-center gap-1.5"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full text-slate-900 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Receive Credit Installment</h3>
              </div>
              <button onClick={() => setPaymentModalData(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">Customer Name:</div>
              <div className="text-base font-black text-slate-900">{paymentModalData.customerName}</div>
              <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200">
                <span className="text-xs text-slate-500">Remaining Balance:</span>
                <span className="text-base font-black text-rose-600">{fmt(paymentModalData.dueBalance)}</span>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
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
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-emerald-600 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
                {/* Quick Fill Buttons */}
                <div className="flex items-center gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, amountPaid: String(paymentModalData.dueBalance) })}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold rounded-lg text-emerald-700"
                  >
                    Full: {fmt(paymentModalData.dueBalance)}
                  </button>
                  {Number(paymentModalData.dueBalance) > 1000 && (
                    <button
                      type="button"
                      onClick={() => setPaymentForm({ ...paymentForm, amountPaid: String(Math.floor(Number(paymentModalData.dueBalance) / 2)) })}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-[10px] font-bold rounded-lg text-slate-700"
                    >
                      50%: {fmt(Math.floor(Number(paymentModalData.dueBalance) / 2))}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="EASYPAISA">EasyPaisa / JazzCash</option>
                  <option value="BANK">Bank Transfer</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Receipt / Transaction #
                </label>
                <input
                  type="text"
                  value={paymentForm.receiptNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, receiptNumber: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Notes / Remarks
                </label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  placeholder="Installment payment..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-slate-400 focus:bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPaymentModalData(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-sm"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-2xl w-full text-slate-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-slate-700" /> Customer Credit Ledger Statement
                </h3>
                <p className="text-xs text-slate-500">Statement for {ledgerModalData.credit.customerName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold transition-all text-slate-700 flex items-center gap-1.5"
                  title="Print Statement"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
                <button onClick={() => setLedgerModalData(null)} className="text-slate-400 hover:text-slate-700 p-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Customer Summary Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center">
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-black">Total Credit</div>
                <div className="text-sm font-black text-slate-900 mt-1">{fmt(ledgerModalData.credit.totalCredit)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-black">Amount Paid</div>
                <div className="text-sm font-black text-emerald-600 mt-1">{fmt(ledgerModalData.credit.amountPaid)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-black">Balance Due</div>
                <div className="text-sm font-black text-rose-600 mt-1">{fmt(ledgerModalData.credit.dueBalance)}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-500 uppercase font-black">Status</div>
                <div className="mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${STATUS_BADGE[ledgerModalData.credit.status]}`}>
                    {ledgerModalData.credit.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment History List */}
            <div className="mt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
                Payment Transactions & Installments ({ledgerModalData.payments.length})
              </h4>

              {ledgerModalData.payments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl">
                  No installments paid yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {ledgerModalData.payments.map((p) => (
                    <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Paid: {fmt(p.amountPaid)}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 rounded-md text-slate-800">
                            {p.paymentMethod}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-3">
                          <span>Ref: {p.receiptNumber || '—'}</span>
                          <span>By: {p.receivedBy || 'Admin'}</span>
                          {p.notes && <span className="italic text-slate-500">"{p.notes}"</span>}
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
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
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── DELETE CONFIRMATION ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full text-slate-900 shadow-2xl">
            <h3 className="text-base font-black uppercase text-rose-600">Delete Credit Record?</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to delete this customer credit record and all of its associated payment records?
            </p>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-bold text-slate-700"
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
