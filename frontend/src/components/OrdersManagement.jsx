import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Eye, Trash2, CheckCircle2, Clock, X, RefreshCw, Printer,
  Truck, Home, XCircle, CreditCard, MapPin, Phone, User as UserIcon
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { useProducts } from '../contexts/ProductContext';
import { getShopOrders, updateOrderStatus, deleteOrder, deleteOrderProof } from '../services/api';

const PAYMENT_BADGE = {
  PENDING: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  PAID: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  FAILED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

const ORDER_BADGE = {
  PROCESSING: 'bg-[#1E293B] text-blue-400 border-blue-500/20',
  SHIPPED: 'bg-[#1E293B] text-indigo-400 border-indigo-500/20',
  DELIVERED: 'bg-[#1E293B] text-emerald-400 border-emerald-500/20',
  CANCELLED: 'bg-[#1E293B] text-rose-400 border-rose-500/20',
};

const fmt = (n) => `Rs. ${(n || 0).toLocaleString('en-PK')}`;

export function OrdersManagement({ shopId = null }) {
  const { user } = useUser();
  const { fetchData } = useProducts() || {};
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const [selectedProofImage, setSelectedProofImage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (shopId) params.shopId = shopId;
      if (paymentFilter !== 'ALL') params.paymentStatus = paymentFilter;
      if (statusFilter !== 'ALL') params.orderStatus = statusFilter;
      const data = await getShopOrders(params);
      let list = data.orders || [];
      if (shopId) {
        list = list.filter(o => String(o.shopId?._id || o.shopId) === String(shopId) || String(o.shopId?.name || '').toLowerCase() === String(shopId).toLowerCase());
      }
      setOrders(list);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [paymentFilter, statusFilter, shopId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleUpdateOrderStatus = async (orderId, paymentStatus) => {
    setBusyId(orderId);
    try {
      const data = await updateOrderStatus(orderId, { paymentStatus });
      setOrders(prev => prev.map(o => o._id === orderId ? data.order : o));
      if (fetchData) fetchData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment status');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteProof = async (orderId) => {
    setBusyId(orderId);
    try {
      await deleteOrderProof(orderId);
      setOrders(prev => prev.map(o => o._id === orderId ? { ...o, paymentProof: null } : o));
      if (selectedProofImage?.orderId === orderId) {
        setSelectedProofImage(null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete payment proof');
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    setBusyId(orderId);
    try {
      await deleteOrder(orderId);
      setOrders(prev => prev.filter(o => o._id !== orderId));
      if (deleteTarget?._id === orderId) setDeleteTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete order');
    } finally {
      setBusyId(null);
    }
  };

  const handlePrintSingleOrder = (ord) => {
    const customerName = ord.customerId?.fullName || ord.shippingDetails?.fullName || 'Registered Customer';
    const customerPhone = ord.shippingDetails?.phone || ord.customerId?.phone || '';
    const orderDate = new Date(ord.createdAt).toLocaleString();
    const totalAmount = ord.totalAmount || 0;
    const items = ord.items || [];
    const paymentMethod = ord.paymentMethod || 'ONLINE';
    const paymentStatus = ord.paymentStatus || 'PENDING';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print the customer order record');
      return;
    }

    let itemsHtml = items.map((item, idx) => {
      const cleanName = (item.name || item.title || 'Perfume Product')
        .replace(/\(Egg\)/gi, '(Product)')
        .replace(/\bEgg\b/gi, 'Product')
        .replace(/\bEggs\b/gi, 'Products')
        .replace(/\begge\b/gi, 'Product')
        .replace(/\(Peti\)/gi, '(Box)')
        .replace(/\(Tray\)/gi, '(Pack)')
        .replace(/\s+/g, ' ')
        .trim();
      return `
      <tr>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:center;">${idx + 1}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; font-weight:bold;">${cleanName}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:center; font-weight:bold; color:#059669;">${item.quantity}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:right;">RS ${(item.price || 0).toLocaleString()}</td>
        <td style="padding:10px; border:1px solid #cbd5e1; text-align:right; font-weight:bold;">RS ${((item.quantity || 1) * (item.price || 0)).toLocaleString()}</td>
      </tr>
    `;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Customer Order Receipt - ${customerName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #0f172a; background: #ffffff; }
            .header { text-align: center; border-bottom: 3px double #059669; padding-bottom: 15px; margin-bottom: 25px; }
            .header h1 { margin: 0; color: #047857; text-transform: uppercase; font-size: 24px; font-weight: 900; }
            .header p { margin: 4px 0 0; color: #475569; font-weight: 800; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; }
            .meta { display: flex; justify-content: space-between; font-size: 12px; font-weight: 800; margin-bottom: 20px; background: #f8fafc; padding: 14px 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background: #f1f5f9; text-transform: uppercase; font-weight: 900; font-size: 11px; color: #475569; padding: 10px; border: 1px solid #cbd5e1; text-align: left; }
            .total-bar { margin-top: 20px; padding: 15px 20px; background: #ecfdf5; border: 2px solid #a7f3d0; border-radius: 12px; display: flex; justify-content: space-between; font-weight: 900; font-size: 16px; color: #047857; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px; font-weight: 800; color: #64748b; }
            .sign { border-top: 2px solid #cbd5e1; width: 200px; text-align: center; padding-top: 6px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Maidan Perfume Shop</h1>
            <p>Registered Customer Order Receipt</p>
          </div>
          <div class="meta">
            <div>
              <span style="color:#059669; text-transform:uppercase;">Customer Name:</span> <strong style="font-size:14px;">${customerName}</strong><br/>
              ${customerPhone ? `<span>Phone: ${customerPhone}</span><br/>` : ''}
              <span>Payment Method: <strong>${paymentMethod}</strong> (${paymentStatus})</span>
            </div>
            <div style="text-align:right;">
              <span>Order Date: ${orderDate}</span><br/>
              <span>Order ID: #${(ord._id || '').slice(-8).toUpperCase()}</span>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="text-align:center;">#</th>
                <th>Item Description</th>
                <th style="text-align:center;">Qty</th>
                <th style="text-align:right;">Unit Price</th>
                <th style="text-align:right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          <div class="total-bar">
            <span>TOTAL ORDER AMOUNT:</span>
            <span>RS ${totalAmount.toLocaleString('en-PK')}</span>
          </div>
          <div class="footer">
            <div class="sign">Customer Signature</div>
            <div class="sign">Maidan Perfume Shop Stamp</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  return (
    <div className="bg-[var(--color-surface-card)] rounded-xl border border-[var(--color-border-subtle)] shadow-sm p-6 overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-700 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[var(--color-border-subtle)]">
        <div className="space-y-1.5">
          <h3 className="text-2xl font-black text-[var(--color-text-primary)] tracking-tighter flex items-center gap-3 uppercase">
            Customer EasyPaisa & Orders Verification
            <span className="text-[9px] font-black bg-emerald-600/10 text-emerald-500 px-2.5 py-0.5 rounded-full border border-emerald-600/20 uppercase tracking-widest">
              {orders.length} Orders
            </span>
          </h3>
          <div className="text-[10px] text-[var(--color-text-muted)] font-black uppercase tracking-[0.2em]">
            Inspect transaction screenshot proofs & manage payment statuses for your shop
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
          >
            <option value="ALL">All Payments</option>
            <option value="PENDING">Pending</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-lg px-3 py-2 text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
          >
            <option value="ALL">All Delivery</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
          <button
            onClick={fetchOrders}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all shadow-md active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Orders
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs font-bold text-center">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-slate-400 font-bold">Loading shop orders and payment receipts...</div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/80 rounded-3xl border-2 border-dashed border-slate-200 text-center space-y-3">
          <Package className="w-14 h-14 text-slate-300 animate-pulse" />
          <p className="text-lg font-black text-slate-800 uppercase tracking-tight">No Orders Found</p>
          <p className="text-xs text-slate-500 font-medium">Customer orders and EasyPaisa payment receipts will show up here in real-time</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {orders.map((ord) => {
            const customerName = ord.customerId?.fullName || ord.shippingDetails?.fullName || 'Registered Customer';
            const customerPhone = ord.shippingDetails?.phone || ord.customerId?.phone || '';
            const isPaid = ord.paymentStatus === 'PAID';
            const isFailed = ord.paymentStatus === 'FAILED';
            const isPending = !isPaid && !isFailed;

            return (
              <div
                key={ord._id}
                className="group relative bg-white border border-slate-200/90 hover:border-emerald-500/40 rounded-3xl p-5 sm:p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col xl:flex-row gap-6 justify-between items-stretch xl:items-center overflow-hidden"
              >
                {/* Accent Top Border */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  isPaid ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : isFailed ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gradient-to-r from-amber-400 to-orange-400'
                }`} />

                {/* ── Left Section: Order Details & Customer Metadata ── */}
                <div className="space-y-3.5 flex-1 min-w-0">
                  {/* Header Row: ID, Badges & Time */}
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="font-mono text-xs font-black px-3 py-1 bg-slate-900 text-white rounded-xl tracking-wider shadow-sm">
                      #{ord._id.slice(-6).toUpperCase()}
                    </span>

                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl border tracking-wider flex items-center gap-1.5 ${
                      ord.paymentMethod === 'EASYPAISA'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-extrabold'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}>
                      <CreditCard className="w-3 h-3" />
                      {ord.paymentMethod || 'EASYPAISA'}
                    </span>

                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-xl border tracking-wider flex items-center gap-1.5 ${
                      isPaid
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-500/30'
                        : isFailed
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-500/30'
                        : 'bg-amber-100 text-amber-800 border-amber-300'
                    }`}>
                      {isPaid ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" /> PAID / VERIFIED
                        </>
                      ) : isFailed ? (
                        <>
                          <XCircle className="w-3 h-3" /> REJECTED
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 animate-spin" /> PENDING VERIFICATION
                        </>
                      )}
                    </span>

                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1 ml-auto sm:ml-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(ord.createdAt).toLocaleString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer Information Box */}
                  <div className="flex flex-wrap items-center gap-3 bg-slate-50/80 rounded-2xl p-3 border border-slate-100">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-700 flex items-center justify-center font-black text-xs">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Customer</div>
                        <div className="text-sm font-black text-slate-900 tracking-tight">{customerName}</div>
                      </div>
                    </div>

                    {customerPhone && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Phone</div>
                          <div className="text-xs font-black text-slate-700 font-mono">{customerPhone}</div>
                        </div>
                      </div>
                    )}

                    {ord.transactionId && (
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                        <div>
                          <div className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-700">EasyPaisa TRX / Sender</div>
                          <div className="text-xs font-black text-emerald-900 font-mono bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-300">
                            {ord.transactionId}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Ordered Items List & Total Price */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Purchased Products</div>
                      <div className="flex flex-wrap gap-1.5">
                        {ord.items?.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>{(item.name || item.title || '').replace(/\(Egg\)/gi, '(Product)').replace(/\bEgg\b/gi, 'Product')}</span>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              x{item.quantity}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl px-4 py-2 flex items-center justify-between md:justify-end gap-3 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Total Bill:</span>
                      <span className="text-lg sm:text-xl font-black text-emerald-700 tracking-tight">
                        RS {ord.totalAmount?.toLocaleString('en-PK')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Right Section: Screenshot Proof Card & Action Deck ── */}
                <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 justify-end pt-4 xl:pt-0 border-t xl:border-t-0 border-slate-100">
                  {/* Screenshot Thumbnail Card */}
                  {ord.paymentProof ? (
                    <div className="relative group/proof shrink-0">
                      <div
                        onClick={() => setSelectedProofImage({ url: ord.paymentProof, orderId: ord._id })}
                        className="cursor-pointer relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-emerald-500/80 bg-slate-950 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] group/btn"
                        title="Click to zoom screenshot receipt"
                      >
                        <img
                          src={ord.paymentProof}
                          alt="EasyPaisa Payment Screenshot"
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/proof:scale-110"
                        />
                        {/* Interactive Hover Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/40 to-transparent opacity-0 group-hover/proof:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-end p-2 text-white">
                          <Eye className="w-5 h-5 text-emerald-400 mb-0.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600/90 px-2 py-0.5 rounded-full shadow">
                            View Receipt
                          </span>
                        </div>
                      </div>

                      {/* Small Delete Screenshot Float Badge */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteProof(ord._id); }}
                        title="Delete this screenshot"
                        className="absolute -top-2 -right-2 w-7 h-7 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg transition-all flex items-center justify-center hover:scale-110 cursor-pointer border-2 border-white z-10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 flex flex-col items-center justify-center p-3 text-center text-slate-400 text-[10px] font-bold shrink-0">
                      <CreditCard className="w-6 h-6 mb-1 text-slate-300" />
                      <span>No Proof Uploaded</span>
                    </div>
                  )}

                  {/* High-End Action Deck */}
                  <div className="flex flex-col gap-2 w-full sm:w-48">
                    {/* Approve (PAID) Button */}
                    <button
                      onClick={() => handleUpdateOrderStatus(ord._id, 'PAID')}
                      disabled={busyId === ord._id || isPaid}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 cursor-default opacity-80'
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 active:scale-95 hover:shadow-lg'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {isPaid ? 'Approved ✓' : 'Approve Payment'}
                    </button>

                    {/* Reject Payment Button */}
                    <button
                      onClick={() => handleUpdateOrderStatus(ord._id, 'FAILED')}
                      disabled={busyId === ord._id || isFailed}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
                        isFailed
                          ? 'bg-rose-100 text-rose-700 border border-rose-300 cursor-default opacity-80'
                          : 'bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-300 hover:border-rose-500 active:scale-95 shadow-sm'
                      }`}
                    >
                      <XCircle className="w-4 h-4" />
                      {isFailed ? 'Rejected ✕' : 'Reject Payment'}
                    </button>

                    {/* Secondary Actions: Print & Delete */}
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <button
                        onClick={() => handlePrintSingleOrder(ord)}
                        className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                        title="Print Order Receipt"
                      >
                        <Printer className="w-3.5 h-3.5 text-slate-500" /> Print
                      </button>

                      <button
                        onClick={() => setDeleteTarget(ord)}
                        disabled={busyId === ord._id}
                        className="px-2.5 py-2 bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1 cursor-pointer"
                        title="Delete Order Record"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox Screenshot Modal */}
      {selectedProofImage && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedProofImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
            <div className="w-full flex justify-between items-center pb-3 mb-3 border-b border-slate-800 gap-4">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Customer EasyPaisa Payment Proof</h3>
              </div>
              <div className="flex items-center gap-2">
                {selectedProofImage.orderId && (
                  <button
                    onClick={() => handleDeleteProof(selectedProofImage.orderId)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete Proof
                  </button>
                )}
                <button onClick={() => setSelectedProofImage(null)} className="p-2 hover:bg-white/10 rounded-full text-white cursor-pointer transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-black flex items-center justify-center max-h-[75vh]">
              <img src={selectedProofImage.url || selectedProofImage} alt="Full Payment Proof" className="max-h-[75vh] w-auto object-contain" />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteTarget(null); }}
        >
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 text-center space-y-4">
            <div className="w-14 h-14 mx-auto bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center border border-rose-200">
              <Trash2 className="w-7 h-7" />
            </div>
            <div>
              <p className="font-black text-slate-900 text-lg uppercase tracking-tight">Delete this order?</p>
              <p className="text-xs text-slate-500 mt-1">Order #{deleteTarget._id.slice(-6).toUpperCase()} will be permanently removed from your shop.</p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteOrder(deleteTarget._id)}
                disabled={busyId === deleteTarget._id}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xs uppercase tracking-wider disabled:opacity-50 cursor-pointer transition-all shadow-md shadow-rose-600/30"
              >
                {busyId === deleteTarget._id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}