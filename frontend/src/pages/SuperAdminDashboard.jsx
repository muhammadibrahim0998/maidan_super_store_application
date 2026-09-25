import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { shopSchema } from '../schemas/shopSchema';
import api from '../services/api';
import {
    Store, Plus, Building2, Edit2, Trash2, X, Check,
    LayoutDashboard, Users, Activity, Eye, EyeOff,
    Package, ShoppingBag, DollarSign, TrendingUp, Calendar, BarChart3, Truck,
    Lock, Phone, Mail, MapPin, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useProducts } from '../contexts/ProductContext';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { CountUpNumber } from '../components/CountUpNumber';

export function SuperAdminDashboard() {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setTab] = useState(() => sessionStorage.getItem('superAdminTab') || 'overview');
  const setActiveTab = (tab) => {
    setTab(tab);
    sessionStorage.setItem('superAdminTab', tab);
  };
    const [editingShop, setEditingShop] = useState(null);
    const [editData, setEditData] = useState({
        name: '',
        address: '',
        contactNumber: '',
        status: 'active',
        adminFullName: '',
        adminUsername: '',
        adminPassword: '',
        easypaisaNumber: ''
    });
    const [isSavingShop, setIsSavingShop] = useState(false);
    const [viewingShop, setViewingShop] = useState(null);
    const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, id: null, name: '' });
    const [isDeleting, setIsDeleting] = useState(false);
    const [showAdminPassword, setShowAdminPassword] = useState(false);
    const { searchTerm } = useProducts();

    const [totalCustomers, setTotalCustomers] = useState(0);
    const [totalStockUnits, setTotalStockUnits] = useState(0);
    const [totalSalesCount, setTotalSalesCount] = useState(0);
    const [totalRevenue, setTotalRevenue] = useState(0);
    const [dailySalesVal, setDailySalesVal] = useState(0);
    const [monthlySalesVal, setMonthlySalesVal] = useState(0);
    const [yearlySalesVal, setYearlySalesVal] = useState(0);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting }
    } = useForm({
        resolver: zodResolver(shopSchema),
        defaultValues: {
            name: '',
            address: '',
            contactNumber: '',
            adminFullName: '',
            adminUsername: '',
            adminPassword: '',
            easypaisaNumber: ''
        }
    });

    const [orders, setOrders] = useState([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [selectedShopFilter, setSelectedShopFilter] = useState('ALL');
    const [selectedProofImage, setSelectedProofImage] = useState(null);
    const [deleteOrderModal, setDeleteOrderModal] = useState({
        isOpen: false,
        orderId: null,
        type: 'proof',
        title: '',
        message: ''
    });
    const [isDeletingOrder, setIsDeletingOrder] = useState(false);

    useEffect(() => {
        fetchShops();
        fetchOrders();
        fetchGlobalStats();
        const timer = setInterval(() => {
            fetchOrders();
            fetchGlobalStats();
        }, 8000);
        return () => clearInterval(timer);
    }, []);

    const fetchGlobalStats = async () => {
        try {
            const [custRes, itemsRes, salesRes, ordersRes] = await Promise.all([
                api.get('/customers/all').catch(() => ({ data: { count: 0 } })),
                api.get('/items').catch(() => ({ data: [] })),
                api.get('/sales/all').catch(() => ({ data: [] })),  // super admin sees all shops' POS sales
                api.get('/checkout/orders').catch(() => ({ data: { orders: [] } }))
            ]);

            if (custRes.data?.count !== undefined) setTotalCustomers(custRes.data.count);
            
            const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
            const stockCount = items.filter(i => (i.stock || 0) > 0).length;
            setTotalStockUnits(stockCount);

            // POS Sales
            const salesList = Array.isArray(salesRes.data) ? salesRes.data : [];
            // EasyPaisa/Checkout orders (PAID only)
            const checkoutOrders = Array.isArray(ordersRes.data?.orders) ? ordersRes.data.orders : [];
            const paidOrders = checkoutOrders.filter(o => o.paymentStatus === 'PAID');

            setTotalSalesCount(salesList.length + paidOrders.length);

            const today = new Date(); today.setHours(0,0,0,0);
            const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            const thisYear = new Date(today.getFullYear(), 0, 1);

            // Valid POS sales (not returned/cancelled)
            const validSales = salesList.filter(s => s.status !== 'returned' && s.status !== 'cancelled');
            const posTotal = validSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
            const orderTotal = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            setTotalRevenue(posTotal + orderTotal);

            // Daily
            const dayRev = validSales.filter(s => new Date(s.saleDate) >= today).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                + paidOrders.filter(o => new Date(o.createdAt) >= today).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            // Monthly
            const monthRev = validSales.filter(s => new Date(s.saleDate) >= thisMonth).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                + paidOrders.filter(o => new Date(o.createdAt) >= thisMonth).reduce((sum, o) => sum + (o.totalAmount || 0), 0);
            // Yearly
            const yearRev = validSales.filter(s => new Date(s.saleDate) >= thisYear).reduce((sum, s) => sum + (s.totalAmount || 0), 0)
                + paidOrders.filter(o => new Date(o.createdAt) >= thisYear).reduce((sum, o) => sum + (o.totalAmount || 0), 0);

            setDailySalesVal(dayRev);
            setMonthlySalesVal(monthRev);
            setYearlySalesVal(yearRev);
        } catch (err) {
            console.error('Failed to load global stats:', err);
        }
    };

    const fetchOrders = async () => {
        setOrdersLoading(true);
        try {
            const res = await api.get('/checkout/orders');
            if (res.data.success) {
                setOrders(res.data.orders);
            }
        } catch (err) {
            console.error('Failed to load orders:', err);
        } finally {
            setOrdersLoading(false);
        }
    };

    const handleUpdateOrderStatus = async (orderId, paymentStatus) => {
        try {
            await api.patch(`/checkout/order/${orderId}/status`, { paymentStatus });
            toast.success(`Payment status updated to ${paymentStatus}`);
            fetchOrders();
            fetchGlobalStats();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleDeleteProof = (orderId) => {
        setDeleteOrderModal({
            isOpen: true,
            orderId,
            type: 'proof',
            title: 'Delete Screenshot Proof',
            message: 'Are you sure you want to delete this payment screenshot proof?'
        });
    };

    const handleDeleteOrder = (orderId) => {
        setDeleteOrderModal({
            isOpen: true,
            orderId,
            type: 'order',
            title: 'Delete Entire Order',
            message: 'Are you sure you want to permanently delete this customer order?'
        });
    };

    const confirmDeleteOrderAction = async () => {
        const { orderId, type } = deleteOrderModal;
        if (!orderId) return;
        setIsDeletingOrder(true);
        try {
            if (type === 'proof') {
                await api.delete(`/checkout/order/${orderId}/proof`);
                toast.success('Payment screenshot proof deleted successfully');
                if (selectedProofImage?.orderId === orderId) {
                    setSelectedProofImage(null);
                }
            } else {
                await api.delete(`/checkout/order/${orderId}`);
                toast.success('Order deleted successfully');
                if (selectedProofImage?.orderId === orderId) {
                    setSelectedProofImage(null);
                }
            }
            setDeleteOrderModal({ isOpen: false, orderId: null, type: 'proof', title: '', message: '' });
            fetchOrders();
        } catch (err) {
            toast.error(type === 'proof' ? 'Failed to delete screenshot proof' : 'Failed to delete order');
        } finally {
            setIsDeletingOrder(false);
        }
    };

    const fetchShops = async () => {
        try {
            const res = await api.get('/shops');
            setShops(res.data);
        } catch (error) {
            toast.error('Failed to load shops');
        } finally {
            setLoading(false);
        }
    };

    const onAddShop = async (data) => {
        try {
            await api.post('/shops', data);
            toast.success('Shop created successfully!');
            reset();
            fetchShops();
            fetchGlobalStats();
        } catch (err) {
            const serverError = err.response?.data?.message || 'Failed to create shop';
            toast.error(serverError);
        }
    };

    const handleDeleteShop = (shop) => {
        setDeleteDialog({
            isOpen: true,
            id: shop._id || shop.id,
            name: shop.name
        });
    };

    const confirmDeleteShop = async () => {
        const { id } = deleteDialog;
        if (!id) return;
        setIsDeleting(true);
        try {
            await api.delete(`/shops/${id}`);
            toast.success("Shop and all its data deleted successfully");
            setDeleteDialog({ isOpen: false, id: null, name: '' });
            fetchShops();
            fetchGlobalStats();
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to delete shop";
            toast.error(msg);
        } finally {
            setIsDeleting(false);
        }
    };

    const startEdit = (shop) => {
        setEditingShop(shop);
        setEditData({
            name: shop.name || '',
            address: shop.address || '',
            contactNumber: shop.contactNumber || '',
            adminFullName: shop.ownerDetails?.fullName || shop.adminFullName || shop.ownerFullName || '',
            adminUsername: shop.ownerDetails?.email || shop.adminUsername || shop.ownerEmail || '',
            adminPassword: '',
            easypaisaNumber: shop.easypaisaNumber || '',
            status: shop.status || 'active'
        });
    };

    const handleSaveShopEdit = async (e) => {
        if (e) e.preventDefault();
        if (!editingShop) return;
        if (!editData.name || editData.name.trim().length < 2) {
            toast.error('Shop name must be at least 2 characters');
            return;
        }
        setIsSavingShop(true);
        try {
            const id = editingShop._id || editingShop.id;
            await api.put(`/shops/${id}`, editData);
            toast.success("Shop updated successfully!");
            setEditingShop(null);
            fetchShops();
            fetchGlobalStats();
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to update shop";
            toast.error(msg);
        } finally {
            setIsSavingShop(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 shadow-[0_0_15px_rgba(22,163,74,0.3)]"></div>
            </div>
        );
    }

    const activeShops = shops.filter(shop => shop.status === 'active').length;
    const inactiveShops = shops.length - activeShops;

    const filteredShops = shops.filter(shop =>
        shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.contactNumber?.includes(searchTerm)
    );

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-green-500/10 rounded-[1.5rem] border border-green-500/20">
                        <Building2 className="w-8 h-8 text-[var(--color-primary)]" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-[var(--color-text-primary)] tracking-tighter leading-none uppercase">
                            Global Dashboard
                        </h1>
                        <p className="text-[var(--color-text-secondary)] font-bold uppercase text-[10px] tracking-[0.4em] mt-2">
                            General Management
                        </p>
                    </div>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-2 bg-[var(--color-surface-card)] p-1.5 rounded-[1.5rem] border border-[var(--color-border-subtle)] shadow-sm overflow-x-auto w-full md:w-auto no-scrollbar">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'overview'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('management')}
                        className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'management'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        Manage Shops
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'orders'
                            ? 'bg-green-600 text-white shadow-lg'
                            : 'text-zinc-500 hover:text-zinc-900'
                            }`}
                    >
                        EasyPaisa Receipts & Orders
                    </button>
                </div>
            </div>

            {activeTab === 'overview' ? (
                /* Overview Content (Integrated from SuperAdminOverview) */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                    {/* Primary Network Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white border border-zinc-100 rounded-2xl p-6 shadow-rich flex items-center gap-5 group">
                            <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20 group-hover:scale-110 transition-transform">
                                <Building2 className="w-7 h-7 text-green-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Network Shops</p>
                                <h3 className="text-3xl font-black text-zinc-900 mt-1 tracking-tighter">
                                    <CountUpNumber value={shops.length} />
                                </h3>
                                <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">{activeShops} Active Stores</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 sm:p-10 shadow-rich">
                        <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-[0.2em] mb-10">Registered Store Network</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredShops.map(shop => (
                                <div key={shop._id} className="p-8 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:border-green-500/30 transition-all shadow-sm hover:shadow-rich group/card">
                                    <div className="flex items-center justify-between mb-6 relative">
                                        <div className="p-4 bg-white rounded-2xl border border-zinc-100 group-hover/card:scale-110 transition-transform shadow-inner">
                                            <Store className="w-7 h-7 text-zinc-400 group-hover/card:text-green-500 transition-colors" />
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all group-hover/card:opacity-0 group-hover/card:scale-0 ${shop.status === 'active' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                                {shop.status}
                                            </span>
                                            {/* Card Action Overlay */}
                                            <div className="absolute top-0 right-0 flex items-center gap-1.5 opacity-0 group-hover/card:opacity-100 transition-all scale-75 group-hover/card:scale-100 origin-right">
                                                <button onClick={() => window.open(`/shop/${shop._id}`, '_blank')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 cursor-pointer" title="Open Branch Admin Portal">
                                                    <Store className="w-3.5 h-3.5" /> Open Store Portal
                                                </button>
                                                <button onClick={() => { setSelectedShopFilter(shop._id); setActiveTab('orders'); }} className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1" title="Inspect & Approve EasyPaisa Orders">
                                                    <Truck className="w-3.5 h-3.5" /> Approve Orders
                                                </button>
                                                <button onClick={() => setViewingShop(shop)} className="p-2.5 bg-white text-zinc-400 hover:text-green-600 rounded-xl border border-zinc-100 shadow-sm transition-all" title="View Details"><Eye className="w-4 h-4" /></button>
                                                <button onClick={() => startEdit(shop)} className="p-2.5 bg-white text-zinc-400 hover:text-amber-600 rounded-xl border border-zinc-100 shadow-sm transition-all" title="Edit Shop"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteShop(shop)} className="p-2.5 bg-white text-zinc-400 hover:text-rose-600 rounded-xl border border-zinc-100 shadow-sm transition-all" title="Delete Shop"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <h4
                                        onClick={() => window.open(`/shop/${shop._id}`, '_blank')}
                                        className="text-xl font-black text-zinc-900 mb-2 truncate tracking-tight uppercase group-hover/card:text-green-600 transition-colors cursor-pointer flex items-center justify-between"
                                        title="Click to Open Store Portal"
                                    >
                                        <span>{shop.name}</span>
                                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">Open Portal ↗</span>
                                    </h4>
                                    <p className="text-[11px] font-black text-zinc-400 truncate tracking-[0.1em] uppercase">{shop.address || "Global Access"}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : activeTab === 'management' ? (
                /* Management Content (Integrated from SuperAdminDashboard) */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Create Shop Form */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-rich h-fit">
                        <h2 className="text-xl font-black mb-6 text-zinc-900 flex items-center gap-3 uppercase tracking-tight">
                            <Plus className="w-6 h-6 text-green-600" />
                            Register New Shop
                        </h2>
                        <form onSubmit={handleSubmit(onAddShop)} className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Shop Name</label>
                                    <input
                                        {...register('name')}
                                        className={`w-full px-5 py-3 rounded-xl border ${errors.name ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold placeholder:text-zinc-300 outline-none focus:bg-white focus:border-green-500/40 transition-all`}
                                        placeholder="Ex: Premium Supermarket"
                                    />
                                    {errors.name && <p className="text-[9px] font-bold text-rose-500 mt-1 pl-1 uppercase tracking-tighter">{errors.name.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Address</label>
                                    <input
                                        {...register('address')}
                                        className={`w-full px-5 py-3 rounded-xl border ${errors.address ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold placeholder:text-zinc-300 outline-none focus:bg-white focus:border-green-500/40 transition-all`}
                                        placeholder="123 Business Avenue"
                                    />
                                    {errors.address && <p className="text-[9px] font-bold text-rose-500 mt-1 pl-1 uppercase tracking-tighter">{errors.address.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">Phone</label>
                                    <input
                                        {...register('contactNumber')}
                                        type="tel"
                                        className={`w-full px-5 py-3 rounded-xl border ${errors.contactNumber ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold placeholder:text-zinc-300 outline-none focus:bg-white focus:border-green-500/40 transition-all`}
                                        placeholder="+92 300 1234567"
                                    />
                                    {errors.contactNumber && <p className="text-[9px] font-bold text-rose-500 mt-1 pl-1 uppercase tracking-tighter">{errors.contactNumber.message}</p>}
                                </div>
                            </div>
                            <div className="pt-6 border-t border-zinc-50">
                                <h3 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] mb-4">Admin Credentials</h3>
                                <div className="space-y-4">
                                    <div>
                                        <input
                                            {...register('adminFullName')}
                                            className={`w-full px-5 py-3 rounded-xl border ${errors.adminFullName ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-green-500/40 transition-all`}
                                            placeholder="Full Name"
                                        />
                                        {errors.adminFullName && <p className="text-[9px] font-bold text-rose-500 mt-1 pl-1 uppercase tracking-tighter">{errors.adminFullName.message}</p>}
                                    </div>
                                    <input
                                        {...register('adminUsername')}
                                        type="email"
                                        autoComplete="off"
                                        className={`w-full px-5 py-3 rounded-xl border ${errors.adminUsername ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-green-500/40 transition-all`}
                                        placeholder="email@example.com"
                                    />
                                    <input
                                        {...register('adminPassword')}
                                        type="password"
                                        autoComplete="new-password"
                                        className={`w-full px-5 py-3 rounded-xl border ${errors.adminPassword ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold outline-none focus:bg-white focus:border-blue-500/40 transition-all`}
                                        placeholder="password"
                                    />
                                </div>
                            </div>
                            <div className="pt-4 border-t border-zinc-50">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                    EasyPaisa Payment
                                </h3>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 pl-1">EasyPaisa Number</label>
                                    <input
                                        {...register('easypaisaNumber')}
                                        type="tel"
                                        className={`w-full px-5 py-3 rounded-xl border ${errors.easypaisaNumber ? 'border-rose-500/50 bg-rose-50/50' : 'border-zinc-100 bg-zinc-50'} text-zinc-900 text-sm font-bold placeholder:text-zinc-300 outline-none focus:bg-white focus:border-emerald-500/40 transition-all`}
                                        placeholder="03001234567"
                                    />
                                    {errors.easypaisaNumber && <p className="text-[9px] font-bold text-rose-500 mt-1 pl-1 uppercase tracking-tighter">{errors.easypaisaNumber.message}</p>}
                                    <p className="text-[9px] text-zinc-400 font-bold mt-1 pl-1">Customers will send EasyPaisa payments to this number.</p>
                                </div>
                            </div>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 shadow-lg shadow-green-500/20 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSubmitting ? 'Registering...' : 'Create Shop'}
                            </button>
                        </form>
                    </div>                    {/* Shops List for Management */}
                    <div className="lg:col-span-2 space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 pl-2">Modify Existing Access</h3>
                        {filteredShops.map(shop => (
                            <div key={shop._id || shop.id} className="bg-white p-5 rounded-2xl border border-zinc-100 flex items-center justify-between shadow-sm hover:shadow-rich hover:border-green-500/20 transition-all group/shop relative overflow-hidden">
                                <div className="flex items-center gap-5 flex-1 min-w-0">
                                    <div className="p-3.5 bg-zinc-50 rounded-xl border border-zinc-100 transition-colors group-hover/shop:bg-green-50/50 flex-shrink-0">
                                        <Store className="w-6 h-6 text-zinc-400 group-hover/shop:text-green-500 transition-colors" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-zinc-900 text-sm uppercase tracking-tight truncate">{shop.name}</h3>
                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${shop.status === 'active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                                {shop.status}
                                            </span>
                                        </div>
                                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest mt-0.5 truncate">
                                            {shop.address || 'Global'} {shop.contactNumber && `• ${shop.contactNumber}`} {shop.ownerDetails?.email && `• ${shop.ownerDetails.email}`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                                    <button onClick={() => window.open(`/shop/${shop._id || shop.id}`, '_blank')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1 cursor-pointer" title="Open Store Portal">
                                        <Store className="w-3.5 h-3.5" /> Open Portal
                                    </button>
                                    <button onClick={() => setViewingShop(shop)} className="p-2.5 bg-zinc-50 text-zinc-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all border border-zinc-100" title="View Details">
                                        <Eye className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => startEdit(shop)} className="p-2.5 bg-zinc-50 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-zinc-100" title="Edit Shop">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteShop(shop)} className="p-2.5 bg-zinc-50 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-zinc-100" title="Delete Shop">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                /* EasyPaisa Receipts & Orders Tab Content */
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface-card p-6 rounded-3xl border border-[var(--color-border-subtle)] shadow-xl">
                        <div>
                            <h2 className="text-2xl font-black uppercase text-zinc-900 tracking-tight">EasyPaisa Orders — Monitor View</h2>
                            <p className="text-xs text-zinc-500 font-bold mt-1 uppercase tracking-wider">🔒 Read-Only • Shop Admins Approve Orders for Their Own Shops</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <select
                                value={selectedShopFilter}
                                onChange={(e) => setSelectedShopFilter(e.target.value)}
                                className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs font-black uppercase tracking-wider text-zinc-900 shadow-sm outline-none cursor-pointer"
                            >
                                <option value="ALL">All Shops</option>
                                {shops.map(s => (
                                    <option key={s._id || s.id} value={s._id || s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button onClick={fetchOrders} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-lg active:scale-95">
                                Refresh Orders
                            </button>
                        </div>
                    </div>

                    {ordersLoading ? (
                        <div className="py-20 text-center text-slate-400 font-bold">Loading orders and payment receipts...</div>
                    ) : orders.filter(o => selectedShopFilter === 'ALL' || String(o.shopId?._id || o.shopId?.id || o.shopId) === String(selectedShopFilter)).length === 0 ? (
                        <div className="py-20 text-center bg-surface-card border border-[var(--color-border-subtle)] rounded-3xl text-slate-400 font-bold">
                            No customer orders placed for this selection yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {orders.filter(o => selectedShopFilter === 'ALL' || String(o.shopId?._id || o.shopId?.id || o.shopId) === String(selectedShopFilter)).map(ord => (
                                <div key={ord._id || ord.id} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
                                    <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span className="text-xs font-black px-3 py-1 bg-zinc-900 text-white rounded-lg">#{String(ord._id || ord.id).slice(-6).toUpperCase()}</span>
                                            <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${ord.paymentMethod === 'EASYPAISA' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                                {ord.paymentMethod}
                                            </span>
                                            <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full flex items-center gap-1.5 ${
                                                ord.paymentStatus === 'PAID'
                                                    ? 'bg-emerald-600 text-white'
                                                    : ord.paymentStatus === 'FAILED'
                                                    ? 'bg-rose-600 text-white'
                                                    : 'bg-amber-100 text-amber-700 border border-amber-200'
                                            }`}>
                                                {ord.paymentStatus === 'PAID' ? '✅ PAID — Approved by Shop Admin' :
                                                 ord.paymentStatus === 'FAILED' ? '❌ REJECTED by Shop Admin' :
                                                 '⏳ PENDING — Awaiting Shop Admin Approval'}
                                            </span>
                                            <span className="text-xs font-bold text-zinc-400">{new Date(ord.createdAt).toLocaleString()}</span>
                                        </div>

                                        <div className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                                            🏪 Shop: <span className="text-emerald-700">{ord.shopId?.name || 'Unknown Shop'}</span>
                                        </div>

                                        <div className="text-sm font-bold text-zinc-800">
                                            Customer: <span className="text-emerald-700">{ord.customerId?.fullName || ord.shippingDetails?.fullName || 'Customer'}</span>
                                            {' '}
                                            <span className="text-zinc-500 text-xs">({ord.shippingDetails?.phone || ord.customerId?.phone || 'No phone'})</span>
                                        </div>

                                        {ord.transactionId && (
                                            <div className="text-xs font-bold text-zinc-600">
                                                Transaction ID / Sender: <span className="text-amber-600 font-black">{ord.transactionId}</span>
                                            </div>
                                        )}

                                        <div className="text-xs text-zinc-400">
                                            Items: {ord.items?.map(i => `${i.name} x${i.quantity}`).join(', ')} | Total: <span className="font-black text-emerald-600 text-sm">RS {ord.totalAmount?.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Proof Screenshot */}
                                    <div className="flex items-center gap-4">
                                        {ord.paymentProof ? (
                                            <div
                                                onClick={() => setSelectedProofImage({ url: ord.paymentProof, orderId: ord._id || ord.id })}
                                                className="cursor-pointer group relative border-2 border-emerald-400/60 rounded-2xl overflow-hidden shadow-lg hover:scale-105 transition-all"
                                                title="Click to view screenshot"
                                            >
                                                <img src={ord.paymentProof} alt="Payment Proof" className="w-24 h-24 object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider transition-all">
                                                    👁 View
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="w-24 h-24 rounded-2xl border border-dashed border-zinc-300 flex flex-col items-center justify-center p-2 text-center text-zinc-400 text-[10px] font-bold">
                                                No Screenshot Yet
                                            </div>
                                        )}

                                        <div className="flex flex-col items-center justify-center text-center gap-1.5 px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-2xl min-w-[130px]">
                                            <span className="text-xl">🔒</span>
                                            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-tight">Shop Admin<br />Approval Only</p>
                                            <p className="text-[8px] text-zinc-400 font-bold">SuperAdmin is Monitor</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Global Delete Confirmation Modal for Shops */}
            <DeleteConfirmationModal
                isOpen={deleteDialog.isOpen}
                onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
                onConfirm={confirmDeleteShop}
                title="Confirm Shop Deletion"
                message="Are you sure you want to permanently delete this shop and all its users, inventory items, sales records, and settings? This action cannot be undone."
                itemName={deleteDialog.name}
                isDeleting={isDeleting}
            />

            {/* Edit Shop Modal */}
            {editingShop && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-zinc-50/50">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600">
                                    <Edit2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-zinc-900 uppercase tracking-tight">Edit Shop Details</h2>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">#{editingShop._id || editingShop.id} • {editingShop.name}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setEditingShop(null)}
                                className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSaveShopEdit} className="p-6 overflow-y-auto space-y-5">
                            {/* Basic Shop Info */}
                            <div className="space-y-3.5">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Store Profile</h3>
                                
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Shop Name *</label>
                                    <input
                                        type="text"
                                        value={editData.name}
                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                        placeholder="Shop Name"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Address</label>
                                        <input
                                            type="text"
                                            value={editData.address}
                                            onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                            placeholder="Location / City"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Contact Phone</label>
                                        <input
                                            type="text"
                                            value={editData.contactNumber}
                                            onChange={(e) => setEditData({ ...editData, contactNumber: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                            placeholder="+92 300 1234567"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Store Status</label>
                                    <select
                                        value={editData.status}
                                        onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all cursor-pointer"
                                    >
                                        <option value="active">Active (Full Access)</option>
                                        <option value="inactive">Inactive (Suspended)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Admin Credentials */}
                            <div className="pt-4 border-t border-zinc-100 space-y-3.5">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Shop Administrator</h3>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Admin Full Name</label>
                                        <input
                                            type="text"
                                            value={editData.adminFullName}
                                            onChange={(e) => setEditData({ ...editData, adminFullName: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                            placeholder="Admin Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">Admin Email / Username</label>
                                        <input
                                            type="email"
                                            value={editData.adminUsername}
                                            onChange={(e) => setEditData({ ...editData, adminUsername: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                            placeholder="admin@shop.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">
                                        Reset Admin Password <span className="text-zinc-400 font-normal lowercase">(leave empty to keep unchanged)</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showAdminPassword ? "text" : "password"}
                                            value={editData.adminPassword}
                                            onChange={(e) => setEditData({ ...editData, adminPassword: e.target.value })}
                                            className="w-full px-4 py-2.5 pr-11 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-green-500 transition-all"
                                            placeholder="Enter new password (min 6 chars)"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAdminPassword(!showAdminPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                                        >
                                            {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* EasyPaisa Settings */}
                            <div className="pt-4 border-t border-zinc-100 space-y-3.5">
                                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                                    EasyPaisa Account
                                </h3>
                                <div>
                                    <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1 pl-1">EasyPaisa Mobile Number</label>
                                    <input
                                        type="tel"
                                        value={editData.easypaisaNumber}
                                        onChange={(e) => setEditData({ ...editData, easypaisaNumber: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white text-zinc-900 text-sm font-bold outline-none focus:border-emerald-500 transition-all"
                                        placeholder="03001234567"
                                    />
                                    <p className="text-[9px] text-zinc-400 font-bold mt-1 pl-1">Online orders will be directed to this EasyPaisa account.</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-3 pt-4 border-t border-zinc-100">
                                <button
                                    type="submit"
                                    disabled={isSavingShop}
                                    className="flex-1 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-green-600/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSavingShop ? (
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" /> Save Changes
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setEditingShop(null)}
                                    disabled={isSavingShop}
                                    className="px-6 py-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl font-black text-xs uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shop View Modal */}
            {viewingShop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-zinc-900/60 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-[420px] rounded-3xl shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-200">
                        <div className="relative p-5 space-y-4">
                            <button
                                onClick={() => setViewingShop(null)}
                                className="absolute top-4 right-4 p-1.5 bg-zinc-100 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200 rounded-xl transition-all active:scale-95"
                            >
                                <X className="w-4 h-4" />
                            </button>

                            <div className="flex items-center gap-3.5 pt-1 pr-6">
                                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 shrink-0">
                                    <Store className="w-6 h-6 text-emerald-600" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight truncate">{viewingShop.name}</h2>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border shrink-0 ${viewingShop.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                            {viewingShop.status}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest truncate">{viewingShop.address || "Attock, Pakistan"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-zinc-100">
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest pl-1">Store Identity</h4>
                                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 space-y-0.5">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Reference ID</p>
                                        <p className="text-[11px] font-bold text-zinc-700 truncate">#{String(viewingShop._id || viewingShop.id).toUpperCase()}</p>
                                    </div>
                                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 space-y-0.5">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Contact</p>
                                        <p className="text-[11px] font-bold text-zinc-700">{viewingShop.contactNumber || "Not Provided"}</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-[9px] font-black text-emerald-600 uppercase tracking-widest pl-1">Administrator</h4>
                                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 space-y-0.5">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Authorized</p>
                                        <p className="text-[11px] font-bold text-zinc-800 truncate">{viewingShop.ownerDetails?.fullName || viewingShop.adminFullName || "Shop Admin"}</p>
                                    </div>
                                    <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-100 space-y-0.5">
                                        <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest">Email Username</p>
                                        <p className="text-[10px] font-bold text-emerald-600 truncate">{viewingShop.ownerDetails?.email || viewingShop.adminUsername || "Not Provided"}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    startEdit(viewingShop);
                                    setViewingShop(null);
                                }}
                                className="w-full mt-2 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-2xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                Edit Shop Details
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox Screenshot Modal - VIEW ONLY for SuperAdmin */}
            {selectedProofImage && (
                <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedProofImage(null)}>
                    <div className="relative max-w-4xl max-h-[90vh] bg-white border border-zinc-200 rounded-3xl p-4 shadow-2xl flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <div className="w-full flex justify-between items-center pb-3 mb-3 border-b border-zinc-100 gap-4">
                            <div>
                                <h3 className="text-sm font-black text-emerald-700 uppercase tracking-wider">Transaction Payment Screenshot</h3>
                                <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">🔒 View-Only — SuperAdmin Monitor</p>
                            </div>
                            <button onClick={() => setSelectedProofImage(null)} className="p-2 hover:bg-zinc-100 rounded-full text-zinc-700 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <img src={selectedProofImage.url || selectedProofImage} alt="Full Payment Proof" className="max-h-[75vh] w-auto object-contain rounded-2xl border border-zinc-200" />
                    </div>
                </div>
            )}

            {/* Order / Screenshot Delete Confirmation Modal */}
            <DeleteConfirmationModal
                isOpen={deleteOrderModal.isOpen}
                onClose={() => setDeleteOrderModal({ ...deleteOrderModal, isOpen: false })}
                onConfirm={confirmDeleteOrderAction}
                title={deleteOrderModal.title}
                message={deleteOrderModal.message}
                itemName={deleteOrderModal.orderId ? `#${String(deleteOrderModal.orderId).slice(-6).toUpperCase()}` : ''}
                isDeleting={isDeletingOrder}
            />
        </div>
    );
}
