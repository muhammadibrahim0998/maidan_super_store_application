import { useState, useEffect, useMemo } from 'react';
import { Truck, Plus, Search, Filter, Box, Banknote, CreditCard, AlertCircle, Image as ImageIcon, ExternalLink, ShieldCheck, X, FileSpreadsheet, ChevronDown, Printer, Share2, Eye, Edit2, Trash2, CheckCircle2, Building2, UploadCloud, Loader2, Phone, MessageSquare, ArrowUpRight, Users, Sparkles } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useProducts } from '../contexts/ProductContext';
import { getItems, deleteItem, settleSupplierCredit, uploadImages } from '../services/api';
import { CountUpNumber } from './CountUpNumber.jsx';
import { motion, AnimatePresence } from 'framer-motion';

const getReceiptImg = (p) => {
  if (!p) return null;
  if (p.paymentReceipt && typeof p.paymentReceipt === 'string' && p.paymentReceipt.trim()) return p.paymentReceipt;
  if (p.receipt && typeof p.receipt === 'string' && p.receipt.trim()) return p.receipt;
  if (p.paymentProof && typeof p.paymentProof === 'string' && p.paymentProof.trim()) return p.paymentProof;
  return null;
};

export function PurchasesManagement({ products: propProducts, onAddProduct, onEditProduct, onDeleteProduct, onViewProduct, onRefresh }) {
  const productCtx = useProducts() || {};
  const contextProducts = productCtx.products || [];
  const [apiProducts, setApiProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframe, setTimeframe] = useState('ALL');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [localDeleteDialog, setLocalDeleteDialog] = useState({ isOpen: false, item: null, isDeleting: false });
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [selectedVendorStockModal, setSelectedVendorStockModal] = useState(null);

  // Supplier Credit Settlement State
  const [settleModal, setSettleModal] = useState({
    isOpen: false,
    item: null,
    paymentMethod: 'Cash', // 'Cash' | 'Bank Transfer'
    amountPaid: '',
    receiptFile: null,
    receiptPreview: null,
    isSubmitting: false,
    error: null,
    successMsg: null,
  });

  const reloadItems = async () => {
    try {
      const res = await getItems();
      const itemsList = Array.isArray(res) ? res : res?.items || res?.data || [];
      if (itemsList.length > 0) {
        setApiProducts(itemsList);
      }
      if (onRefresh) {
        try { await onRefresh(); } catch (_) {}
      }
    } catch (err) {
      console.error('Failed to reload items:', err);
    }
  };

  // Fetch items directly if prop or context is empty
  useEffect(() => {
    reloadItems();
  }, []);

  const handleOpenSettleModal = (item, dueAmt) => {
    setSettleModal({
      isOpen: true,
      item,
      paymentMethod: 'Cash',
      amountPaid: dueAmt !== undefined ? String(dueAmt) : String(item.dueAmountToSupplier || ''),
      receiptFile: null,
      receiptPreview: null,
      isSubmitting: false,
      error: null,
      successMsg: null,
    });
  };

  const handleReceiptFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSettleModal(prev => ({
        ...prev,
        receiptFile: file,
        receiptPreview: URL.createObjectURL(file),
      }));
    }
  };

  const handleConfirmSettle = async (e) => {
    if (e) e.preventDefault();
    if (!settleModal.item) return;

    const itemId = settleModal.item._id || settleModal.item.id;
    const payAmt = Number(settleModal.amountPaid);
    if (isNaN(payAmt) || payAmt <= 0) {
      setSettleModal(prev => ({ ...prev, error: 'Please enter a valid amount greater than 0' }));
      return;
    }

    setSettleModal(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      let receiptUrl = '';
      if (settleModal.receiptFile) {
        const uploaded = await uploadImages([settleModal.receiptFile]);
        if (uploaded && uploaded.length > 0) {
          receiptUrl = uploaded[0];
        }
      }

      const res = await settleSupplierCredit(itemId, {
        paymentMethod: settleModal.paymentMethod,
        amountPaid: payAmt,
        paymentReceipt: receiptUrl || undefined,
      });

      const updatedItem = res?.item;

      // Update apiProducts locally
      setApiProducts(prev => prev.map(p => {
        if (p._id === itemId) {
          const currentDue = Number(p.dueAmountToSupplier) || 0;
          const currentPaid = Number(p.amountPaidToSupplier) || 0;
          return {
            ...p,
            ...(updatedItem || {}),
            dueAmountToSupplier: Math.max(0, currentDue - payAmt),
            amountPaidToSupplier: currentPaid + payAmt,
            isOnlinePayment: settleModal.paymentMethod !== 'Cash' ? true : p.isOnlinePayment,
            paymentReceipt: receiptUrl || p.paymentReceipt,
          };
        }
        return p;
      }));

      if (productCtx?.fetchProducts) {
        try { await productCtx.fetchProducts(); } catch (_) {}
      }
      if (onRefresh) {
        try { await onRefresh(); } catch (_) {}
      }

      setSettleModal(prev => ({
        ...prev,
        isSubmitting: false,
        successMsg: `Rs. ${payAmt.toLocaleString('en-PK')} successfully paid via ${settleModal.paymentMethod === 'Cash' ? 'Cash' : 'Bank Transfer'}!`,
      }));

      setTimeout(() => {
        setSettleModal({
          isOpen: false,
          item: null,
          paymentMethod: 'Cash',
          amountPaid: '',
          receiptFile: null,
          receiptPreview: null,
          isSubmitting: false,
          error: null,
          successMsg: null,
        });
        reloadItems();
        if (onRefresh) {
          try { onRefresh(); } catch (_) {}
        }
      }, 1200);
    } catch (err) {
      console.error('Error settling supplier credit:', err);
      setSettleModal(prev => ({
        ...prev,
        isSubmitting: false,
        error: err.response?.data?.message || err.message || 'Failed to pay credit',
      }));
    }
  };


  const handleDeleteClick = async (item) => {
    if (!item) return;
    const itemId = typeof item === 'string' ? item : (item._id || item.id);
    const itemName = typeof item === 'string' ? 'this product' : (item.name || 'Product');
    if (!itemId || itemId === 'undefined') return;
    if (!window.confirm(`Are you sure you want to delete product "${itemName}"?`)) return;
    
    // 1. Instantly remove from local UI state
    setDeletedIds(prev => new Set([...prev, itemId]));
    setApiProducts(prev => prev.filter(p => p._id !== itemId));

    // 2. Call backend API
    try {
      await deleteItem(itemId, '', 'shop_admin');
    } catch (err) {
      console.error('[Direct Delete Item API]:', err);
    }

    // 3. Notify parent and product context
    if (onDeleteProduct) {
      try { await onDeleteProduct(item); } catch (_) {}
    }
    if (productCtx.deleteProduct) {
      try { await productCtx.deleteProduct(itemId); } catch (_) {}
    }
  };

  const products = useMemo(() => {
    const raw = (propProducts && propProducts.length > 0)
      ? propProducts
      : ((contextProducts && contextProducts.length > 0) ? contextProducts : apiProducts);
    return raw.filter(p => !deletedIds.has(p._id));
  }, [propProducts, contextProducts, apiProducts, deletedIds]);

  // Timeframe date filtering logic
  const filteredByTimeframeProducts = useMemo(() => {
    if (timeframe === 'ALL') return products;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return products.filter((p) => {
      const dateVal = p.purchaseDate || p.createdAt || p.updatedAt;
      if (!dateVal) return true;

      const pDate = new Date(dateVal);
      if (isNaN(pDate.getTime())) return true;

      if (timeframe === 'DAY') {
        return pDate.toISOString().split('T')[0] === todayStr;
      }
      if (timeframe === 'MONTH') {
        return pDate.getMonth() === currentMonth && pDate.getFullYear() === currentYear;
      }
      if (timeframe === 'YEAR') {
        return pDate.getFullYear() === currentYear;
      }
      return true;
    });
  }, [products, timeframe]);

  const purchaseItems = useMemo(() => {
    return filteredByTimeframeProducts.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplierName && p.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesSearch;
    });
  }, [filteredByTimeframeProducts, searchTerm]);

  const stats = useMemo(() => {
    let totalPurchasesCost = 0;
    let cashPaid = 0;
    let bankPaid = 0;
    let totalDue = 0;
    let totalPetisPurchased = 0;

    filteredByTimeframeProducts.forEach((p) => {
      const stockEggs = Number(p.stock) || 0;
      const petiQty = Number(p.petiQuantity) || 0;
      const trayQty = Number(p.trayQuantity) || 0;
      const eggQty = Number(p.eggQuantity) || 0;

      if (petiQty > 0 || trayQty > 0 || eggQty > 0) {
        totalPetisPurchased += petiQty + (trayQty / 12) + (eggQty / 360);
      } else if (stockEggs > 0) {
        totalPetisPurchased += stockEggs / 360;
      }

      const unitCost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.price || 0);
      const unitDivisor = p.unitType === 'egg' ? 1 : p.unitType === 'tray' ? 30 : 360;

      const cost = Number(p.totalPurchaseCost) > 0
        ? Number(p.totalPurchaseCost)
        : (petiQty > 0 ? petiQty * unitCost : (stockEggs > 0 ? stockEggs * (unitCost / unitDivisor) : 0));

      const receiptImg = getReceiptImg(p);
      const pMethod = String(p.paymentMethod || 'Cash').trim().toLowerCase();

      // 1. Determine payment channel
      const isOnline = p.isOnlinePayment === true || !!receiptImg || (
        pMethod.includes('bank') || 
        pMethod.includes('easy') || 
        pMethod.includes('jazz') || 
        pMethod.includes('online') || 
        pMethod.includes('cheque') || 
        pMethod.includes('transfer') ||
        pMethod.includes('card')
      );

      const isCredit = !isOnline && (
        pMethod.includes('credit') || 
        pMethod.includes('due')
      );

      // 2. Strict Routed Paid vs Due (Credit) calculation (No overlap)
      const hasExplicitDue = p.dueAmountToSupplier !== undefined && p.dueAmountToSupplier !== null && Number(p.dueAmountToSupplier) >= 0;
      let due = 0;
      let paid = 0;

      if (hasExplicitDue || isCredit) {
        const rawDue = hasExplicitDue ? Number(p.dueAmountToSupplier) : cost;
        due = Math.min(cost, Math.max(0, rawDue));
        paid = Math.max(0, cost - due);
      } else {
        // 100% Paid (No Credit)
        paid = cost;
        due = 0;
      }

      if (p.amountPaidToSupplier !== undefined && p.amountPaidToSupplier !== null && Number(p.amountPaidToSupplier) > 0) {
        paid = Number(p.amountPaidToSupplier);
      }

      // 3. Aggregate totals
      totalPurchasesCost += isNaN(cost) ? 0 : cost;
      totalDue += isNaN(due) ? 0 : due;

      let itemCashPaid = 0;
      let itemBankPaid = 0;

      if (p.cashPaidToSupplier !== undefined && p.cashPaidToSupplier !== null && Number(p.cashPaidToSupplier) > 0) {
        itemCashPaid = Number(p.cashPaidToSupplier);
      }
      if (p.bankPaidToSupplier !== undefined && p.bankPaidToSupplier !== null && Number(p.bankPaidToSupplier) > 0) {
        itemBankPaid = Number(p.bankPaidToSupplier);
      }

      if (itemCashPaid === 0 && itemBankPaid === 0 && paid > 0) {
        const isStrictBank = (
          pMethod.includes('bank') || 
          pMethod.includes('easy') || 
          pMethod.includes('jazz') || 
          pMethod.includes('transfer') || 
          pMethod.includes('online') ||
          p.isOnlinePayment === true
        );
        if (isStrictBank) {
          itemBankPaid = paid;
        } else {
          itemCashPaid = paid;
        }
      }

      cashPaid += isNaN(itemCashPaid) ? 0 : itemCashPaid;
      bankPaid += isNaN(itemBankPaid) ? 0 : itemBankPaid;
    });

    return {
      totalPurchasesCost: isNaN(totalPurchasesCost) ? 0 : Math.round(totalPurchasesCost),
      cashPaid: isNaN(cashPaid) ? 0 : Math.round(cashPaid),
      bankPaid: isNaN(bankPaid) ? 0 : Math.round(bankPaid),
      totalDue: isNaN(totalDue) ? 0 : Math.round(totalDue),
      totalPetis: isNaN(totalPetisPurchased) ? 0 : Number(totalPetisPurchased.toFixed(1)),
      totalTrays: isNaN(totalPetisPurchased) ? 0 : Math.round(totalPetisPurchased * 12),
      totalEggs: isNaN(totalPetisPurchased) ? 0 : Math.round(totalPetisPurchased * 360)
    };
  }, [filteredByTimeframeProducts]);

  const attachedReceipts = useMemo(() => {
    return filteredByTimeframeProducts.filter(p => !!getReceiptImg(p));
  }, [filteredByTimeframeProducts]);

  const totalReceiptsAmount = useMemo(() => {
    return attachedReceipts.reduce((sum, p) => {
      const stockEggs = Number(p.stock) || 0;
      const cost = Number(p.totalPurchaseCost) || (Number(p.costPrice) > 0 ? (stockEggs * (Number(p.costPrice) / (p.unitType === 'egg' ? 1 : p.unitType === 'tray' ? 30 : 360))) : 0);
      const receiptImg = getReceiptImg(p);
      const paid = Number(p.amountPaidToSupplier) || (receiptImg ? cost : 0);
      return sum + (isNaN(paid) ? 0 : paid);
    }, 0);
  }, [attachedReceipts]);

  // Aggregated Vendor / Supplier List (Company Ledger)
  const vendorList = useMemo(() => {
    const map = {};
    filteredByTimeframeProducts.forEach(p => {
      const rawName = (p.supplierName && p.supplierName.trim()) ? p.supplierName.trim() : 'Direct / Company Unknown';
      if (!map[rawName]) {
        map[rawName] = {
          name: rawName,
          phone: p.supplierPhone || p.supplierContact || '',
          location: p.supplierLocation || p.farmLocation || '',
          products: [],
          totalCost: 0,
          totalPaid: 0,
          totalCashPaid: 0,
          totalBankPaid: 0,
          totalDue: 0,
          totalBoxes: 0,
          totalPacks: 0,
          totalUnits: 0,
          itemsCount: 0,
          paymentMethods: new Set(),
          hasReceipt: false,
          latestDate: p.purchaseDate || p.createdAt || p.updatedAt || '',
        };
      }

      const v = map[rawName];
      v.products.push(p);
      v.itemsCount += 1;
      if ((!v.phone || v.phone === '') && (p.supplierPhone || p.supplierContact)) {
        v.phone = p.supplierPhone || p.supplierContact;
      }
      if ((!v.location || v.location === '') && (p.supplierLocation || p.farmLocation)) {
        v.location = p.supplierLocation || p.farmLocation;
      }

      const pMethod = String(p.paymentMethod || 'Cash').trim();
      v.paymentMethods.add(pMethod);
      if (getReceiptImg(p)) v.hasReceipt = true;

      const stockEggs = Number(p.stock) || 0;
      const petiQty = Number(p.petiQuantity) || 0;
      const trayQty = Number(p.trayQuantity) || 0;
      const eggQty = Number(p.eggQuantity) || 0;
      v.totalBoxes += petiQty;
      v.totalPacks += trayQty;
      v.totalUnits += (eggQty > 0 ? eggQty : (stockEggs > 0 ? stockEggs : (petiQty * 360 + trayQty * 30)));

      const unitCost = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.price || 0);
      const unitDivisor = p.unitType === 'egg' ? 1 : p.unitType === 'tray' ? 30 : 360;
      const cost = Number(p.totalPurchaseCost) > 0
        ? Number(p.totalPurchaseCost)
        : (petiQty > 0 ? petiQty * unitCost : (stockEggs > 0 ? stockEggs * (unitCost / unitDivisor) : 0));

      const hasExplicitDue = p.dueAmountToSupplier !== undefined && p.dueAmountToSupplier !== null && Number(p.dueAmountToSupplier) >= 0;
      let due = 0;
      let paid = 0;
      if (hasExplicitDue) {
        due = Number(p.dueAmountToSupplier);
        paid = Math.max(0, cost - due);
      } else {
        paid = cost;
        due = 0;
      }
      if (p.amountPaidToSupplier !== undefined && p.amountPaidToSupplier !== null && Number(p.amountPaidToSupplier) > 0) {
        paid = Number(p.amountPaidToSupplier);
      }

      let itemCash = Number(p.cashPaidToSupplier) || 0;
      let itemBank = Number(p.bankPaidToSupplier) || 0;
      if (itemCash === 0 && itemBank === 0 && paid > 0) {
        const isStrictBank = pMethod.toLowerCase().includes('bank') || pMethod.toLowerCase().includes('online') || p.isOnlinePayment === true;
        if (isStrictBank) itemBank = paid;
        else itemCash = paid;
      }

      v.totalCost += isNaN(cost) ? 0 : Math.round(cost);
      v.totalPaid += isNaN(paid) ? 0 : Math.round(paid);
      v.totalCashPaid += isNaN(itemCash) ? 0 : Math.round(itemCash);
      v.totalBankPaid += isNaN(itemBank) ? 0 : Math.round(itemBank);
      v.totalDue += isNaN(due) ? 0 : Math.round(due);
    });

    return Object.values(map).sort((a, b) => b.totalCost - a.totalCost);
  }, [filteredByTimeframeProducts]);

  const fmt = (n) => Number(n || 0).toLocaleString('en-PK');

  // Print Purchases Report Handler
  // ── PDF Generator via jsPDF & autoTable ──
  const generatePurchasesPDF = () => {
    const doc = new jsPDF('portrait', 'pt', 'a4');
    const timeTitle = timeframe === 'DAY' ? 'Today (Day)' : timeframe === 'MONTH' ? 'This Month' : timeframe === 'YEAR' ? 'This Year' : 'All-Time';
    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    // Header
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 595, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text('Maidan Perfume Shop', 30, 26);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(203, 213, 225);
    doc.text(`Official Purchases & Restock Ledger Report • Filter: ${timeTitle}`, 30, 44);
    doc.text(`Generated: ${dateStr}`, 430, 44);

    // Summary Stat Bar
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(30, 72, 535, 42, 6, 6, 'FD');

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text('STOCK PURCHASED', 40, 87);
    doc.text('TOTAL COST', 145, 87);
    doc.text('CASH PAID', 250, 87);
    doc.text('BANK PAID', 355, 87);
    doc.text('DUE (CREDIT)', 460, 87);

    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.totalEggs || stats.totalPetis} Units`, 40, 104);
    doc.setTextColor(5, 150, 105);
    doc.text(`Rs. ${fmt(stats.totalPurchasesCost)}`, 145, 104);
    doc.setTextColor(16, 185, 129);
    doc.text(`Rs. ${fmt(stats.cashPaid)}`, 250, 104);
    doc.setTextColor(37, 99, 235);
    doc.text(`Rs. ${fmt(stats.bankPaid)}`, 355, 104);
    doc.setTextColor(stats.totalDue > 0 ? 225 : 100, stats.totalDue > 0 ? 29 : 116, stats.totalDue > 0 ? 72 : 139);
    doc.text(`Rs. ${fmt(stats.totalDue)}`, 460, 104);

    // Items Table
    const tableData = purchaseItems.map((item, idx) => {
      const units = item.stock || item.eggQuantity || 0;
      const cost = item.totalPurchaseCost || 0;
      const paid = item.amountPaidToSupplier || 0;
      const due = item.dueAmountToSupplier || 0;

      return [
        idx + 1,
        item.name,
        item.supplierName || 'Distributor / Supplier',
        item.unitType || 'Unit',
        Number(units).toLocaleString(),
        `Rs. ${fmt(cost)}`,
        `Rs. ${fmt(paid)}`,
        `Rs. ${fmt(due)}`,
        due > 0 ? 'Credit' : 'Cash'
      ];
    });

    autoTable(doc, {
      startY: 125,
      head: [['#', 'Product Name', 'Supplier', 'Unit', 'Total Stock', 'Cost', 'Cash Paid', 'Credit', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 7.5, textColor: [15, 23, 42] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { cellPadding: 3.5, overflow: 'linebreak' },
      margin: { left: 30, right: 30 },
    });

    const fileName = `Purchases_Report_${timeTitle.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    return fileName;
  };

  // ── Clean Compact Luxury HTML Print Preview ──
  const handlePrintPurchasesReport = () => {
    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const timeTitle = timeframe === 'DAY' ? 'Today (Day)' : timeframe === 'MONTH' ? 'This Month' : timeframe === 'YEAR' ? 'This Year' : 'All-Time';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print the purchases report');
      return;
    }

    const tableRows = purchaseItems.map((item, idx) => {
      const petis = item.petiQuantity || (item.stock ? (item.stock / 360).toFixed(1) : 0);
      const trays = item.trayQuantity || (item.stock ? Math.round(item.stock / 30) : 0);
      const products = item.stock || item.eggQuantity || 0;
      const cost = item.totalPurchaseCost || 0;
      const paid = item.amountPaidToSupplier || 0;
      const due = item.dueAmountToSupplier || 0;
      const cleanName = (item.name || 'Perfume Product')
        .replace(/\(Egg\)/gi, '(Product)')
        .replace(/\bEgg\b/gi, 'Product')
        .replace(/\bEggs\b/gi, 'Products')
        .replace(/\(Peti\)/gi, '(Box)')
        .replace(/\(Tray\)/gi, '(Pack)')
        .trim();

      return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="text-align:center; padding:8px 6px; border:1px solid #e2e8f0; font-weight:700; color:#64748b;">${idx + 1}</td>
        <td style="padding:8px 10px; border:1px solid #e2e8f0; font-weight:800; color:#0f172a;">${cleanName}</td>
        <td style="padding:8px 10px; border:1px solid #e2e8f0; color:#475569; font-weight:600;">${item.supplierName || 'Distributor'}</td>
        <td style="text-align:center; padding:8px 6px; border:1px solid #e2e8f0; font-weight:700;">${petis} Box</td>
        <td style="text-align:center; padding:8px 6px; border:1px solid #e2e8f0; font-weight:700;">${trays} Pack</td>
        <td style="text-align:center; padding:8px 6px; border:1px solid #e2e8f0; font-weight:800; color:#0f172a;">${Number(products).toLocaleString()}</td>
        <td style="text-align:right; padding:8px 10px; border:1px solid #e2e8f0; font-weight:800; color:#0f172a;">Rs. ${fmt(cost)}</td>
        <td style="text-align:right; padding:8px 10px; border:1px solid #e2e8f0; color:#059669; font-weight:800;">Rs. ${fmt(paid)}</td>
        <td style="text-align:right; padding:8px 10px; border:1px solid #e2e8f0; color:${due > 0 ? '#e11d48' : '#64748b'}; font-weight:800;">Rs. ${fmt(due)}</td>
        <td style="text-align:center; padding:8px 6px; border:1px solid #e2e8f0;">
          <span style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:8.5px; font-weight:900; text-transform:uppercase; ${due > 0 ? 'background:#fff1f2; color:#e11d48; border:1px solid #fecdd3;' : 'background:#ecfdf5; color:#059669; border:1px solid #a7f3d0;'}">
            ${due > 0 ? 'Credit' : 'Paid'}
          </span>
        </td>
      </tr>`;
    }).join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchases Ledger Report - ${timeTitle}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          <style>
            @page { size: portrait; margin: 10mm 12mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #0f172a; background: #ffffff; font-size: 11px; margin: 0; }
            .header-banner { background: linear-gradient(135deg, #090d16 0%, #0f172a 45%, #064e3b 100%); color: #ffffff; padding: 18px 24px; border-radius: 14px; display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #10b981; margin-bottom: 16px; }
            .header-banner h1 { margin: 0; font-size: 18px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
            .header-banner p { margin: 3px 0 0; font-size: 9px; font-weight: 800; color: #34d399; letter-spacing: 1.2px; text-transform: uppercase; }
            .tag { background: #f59e0b; color: #0f172a; font-weight: 900; font-size: 10px; padding: 6px 12px; border-radius: 8px; text-transform: uppercase; }
            
            .meta { display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 800; margin-bottom: 14px; background: #f8fafc; padding: 8px 14px; border-radius: 10px; border: 1px solid #e2e8f0; color: #475569; }
            .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
            .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px 12px; border-radius: 10px; text-align: center; }
            .stat-card label { font-size: 8.5px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 2px; }
            .stat-card .val { font-size: 14px; font-weight: 900; color: #0f172a; }
            
            table { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; margin-top: 8px; }
            th { background: #0f172a; color: #ffffff; text-transform: uppercase; font-weight: 900; font-size: 9px; letter-spacing: 0.5px; padding: 8px 10px; border: none; text-align: left; }
            .total-row { background: #f8fafc; font-weight: 900; font-size: 10.5px; }
            .total-row td { padding: 10px 8px; border-top: 2px solid #0f172a; }
            .footer { margin-top: 30px; display: flex; justify-content: space-between; font-size: 9.5px; font-weight: 800; color: #64748b; }
            .sign { border-top: 1.5px solid #94a3b8; width: 160px; text-align: center; padding-top: 6px; text-transform: uppercase; font-size: 9px; }
          </style>
        </head>
        <body>
          <div class="header-banner">
            <div>
              <h1>MAIDAN PERFUME SHOP</h1>
              <p>OFFICIAL STOCK PURCHASES &amp; RESTOCK LEDGER</p>
            </div>
            <div class="tag">
              ${timeTitle}
            </div>
          </div>
          <div class="meta">
            <span>📅 Generated: ${dateStr}</span>
            <span>🔍 Filter Period: ${timeTitle}</span>
            <span>📦 Total Items: ${purchaseItems.length} Products</span>
          </div>
          <div class="stats-grid">
            <div class="stat-card">
              <label>Stock Restocked</label>
              <div class="val">${stats.totalPetis} Boxes (${stats.totalEggs} Products)</div>
            </div>
            <div class="stat-card">
              <label>Total Investment</label>
              <div class="val" style="color:#059669;">Rs. ${fmt(stats.totalPurchasesCost)}</div>
            </div>
            <div class="stat-card">
              <label>Cash / Bank Paid</label>
              <div class="val" style="color:#10b981;">Rs. ${fmt(stats.cashPaid + stats.bankPaid)}</div>
            </div>
            <div class="stat-card">
              <label>Credit (Due)</label>
              <div class="val" style="color:#e11d48;">Rs. ${fmt(stats.totalDue)}</div>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width:25px; text-align:center;">#</th>
                <th>Product Name</th>
                <th>Supplier / Distributor</th>
                <th style="text-align:center; width:65px;">Boxes</th>
                <th style="text-align:center; width:65px;">Packs</th>
                <th style="text-align:center; width:75px;">Products (Units)</th>
                <th style="text-align:right; width:90px;">Cost</th>
                <th style="text-align:right; width:90px;">Paid</th>
                <th style="text-align:right; width:90px;">Credit</th>
                <th style="text-align:center; width:60px;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || '<tr><td colspan="10" style="text-align:center; padding:20px; color:#64748b; font-weight:bold;">No purchases recorded for this period.</td></tr>'}
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="3" style="text-align:right; font-weight:900; color:#0f172a;">GRAND TOTALS:</td>
                <td style="text-align:center; font-weight:900;">${stats.totalPetis} Box</td>
                <td style="text-align:center; font-weight:900;">${stats.totalTrays} Pack</td>
                <td style="text-align:center; font-weight:900; color:#0f172a;">${fmt(stats.totalEggs)} Products</td>
                <td style="text-align:right; color:#059669; font-weight:900;">Rs. ${fmt(stats.totalPurchasesCost)}</td>
                <td style="text-align:right; color:#10b981; font-weight:900;">Rs. ${fmt(stats.cashPaid + stats.bankPaid)}</td>
                <td style="text-align:right; color:#e11d48; font-weight:900;">Rs. ${fmt(stats.totalDue)}</td>
                <td style="text-align:center;">
                  <span style="font-weight:900; color:${stats.totalDue > 0 ? '#e11d48' : '#059669'};">
                    ${stats.totalDue > 0 ? 'Credit Due' : 'Fully Paid'}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
          <div class="footer">
            <div>Official Purchases Audit Report • Maidan Perfume Shop Financial Ledger</div>
            <div class="sign">Authorized Signature &amp; Stamp</div>
          </div>
        </body>
      </html>
    `);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 300);
  };

  // ── WhatsApp PDF Generation & Share Handler ──
  const handleWhatsAppPurchasesShare = () => {
    // 1. Generate & auto-download official PDF document
    const pdfFileName = generatePurchasesPDF();

    // 2. Direct to WhatsApp with clean formatted statement
    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeTitle = timeframe === 'DAY' ? 'Today (Day)' : timeframe === 'MONTH' ? 'This Month' : timeframe === 'YEAR' ? 'This Year' : 'All-Time';

    let message = `📄 *Maidan Perfume Shop - PURCHASES REPORT*\n`;
    message += `📅 *Timeframe:* ${timeTitle} (${dateStr})\n`;
    message += `===============================\n`;
    message += `📦 *Stock Restocked:* ${stats.totalPetis} Boxes (${stats.totalTrays} Packs • ${fmt(stats.totalEggs)} Products)\n`;
    message += `💰 *Total Investment:* Rs. ${fmt(stats.totalPurchasesCost)}\n`;
    message += `💵 *Cash Paid:* Rs. ${fmt(stats.cashPaid)}\n`;
    if (stats.bankPaid > 0) {
      message += `🏦 *Bank Paid:* Rs. ${fmt(stats.bankPaid)}\n`;
    }
    message += `⚠️ *Credit (Due):* Rs. ${fmt(stats.totalDue)}\n`;
    message += `===============================\n`;
    message += `🛒 *PURCHASED PRODUCTS:* (${purchaseItems.length} items)\n`;

    purchaseItems.slice(0, 8).forEach((item, idx) => {
      const petis = item.petiQuantity || (item.stock ? (item.stock / 360).toFixed(1) : 0);
      const paid = item.amountPaidToSupplier || 0;
      const due = item.dueAmountToSupplier || 0;
      const cleanName = (item.name || 'Perfume Product')
        .replace(/\(Egg\)/gi, '(Product)')
        .replace(/\bEgg\b/gi, 'Product')
        .replace(/\bEggs\b/gi, 'Products')
        .trim();
      message += `${idx + 1}. *${cleanName}* (${petis} Boxes)\n`;
      message += `   • Cost: Rs. ${fmt(item.totalPurchaseCost)} | Paid: Rs. ${fmt(paid)} | Due: Rs. ${fmt(due)}\n`;
    });

    if (purchaseItems.length > 8) {
      message += `... and ${purchaseItems.length - 8} more items (see PDF).\n`;
    }

    message += `===============================\n`;
    message += `📎 *Official PDF File (${pdfFileName}) downloaded to your device.*\n`;
    message += `_Maidan Perfume Shop Management System_`;

    const encodedText = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  // ── Luxury Styled Excel (.xls) Export Handler ──
  const handleExportPurchasesExcel = () => {
    const timeTitle = timeframe === 'DAY' ? 'Today' : timeframe === 'MONTH' ? 'This_Month' : timeframe === 'YEAR' ? 'This_Year' : 'All_Time';
    const dateStr = new Date().toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const formattedRowsHtml = purchaseItems.length > 0 ? purchaseItems.map((item, idx) => {
      const petis = Number(item.petiQuantity || (item.stock ? (item.stock / 360).toFixed(1) : 0));
      const trays = Number(item.trayQuantity || (item.stock ? Math.round(item.stock / 30) : 0));
      const products = Number(item.stock || item.eggQuantity || 0);
      const cost = Number(item.totalPurchaseCost || 0);
      const paid = Number(item.amountPaidToSupplier || 0);
      const due = Number(item.dueAmountToSupplier || Math.max(0, cost - paid));
      const method = item.paymentMethod || 'Cash';
      const cleanName = (item.name || 'Perfume Product')
        .replace(/\(Egg\)/gi, '(Product)')
        .replace(/\bEgg\b/gi, 'Product')
        .replace(/\bEggs\b/gi, 'Products')
        .replace(/\(Peti\)/gi, '(Box)')
        .replace(/\(Tray\)/gi, '(Pack)')
        .trim();

      return `
        <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; padding: 7px 10px; vertical-align: middle;">${idx + 1}</td>
          <td style="border: 1px solid #cbd5e1; font-weight: bold; color: #0f172a; padding: 7px 12px; vertical-align: middle;">${cleanName}</td>
          <td style="border: 1px solid #cbd5e1; color: #475569; padding: 7px 12px; vertical-align: middle;">${item.supplierName || 'Distributor / Supplier'}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; padding: 7px 10px; vertical-align: middle;">${petis}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; padding: 7px 10px; vertical-align: middle;">${trays}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: 900; color: #0f172a; padding: 7px 10px; vertical-align: middle;">${products.toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-weight: 900; color: #0f172a; padding: 7px 12px; vertical-align: middle;">RS ${cost.toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-weight: 900; color: #047857; padding: 7px 12px; vertical-align: middle;">RS ${paid.toLocaleString()}</td>
          <td style="text-align: right; border: 1px solid #cbd5e1; font-weight: 900; color: ${due > 0 ? '#dc2626' : '#64748b'}; padding: 7px 12px; vertical-align: middle;">RS ${due.toLocaleString()}</td>
          <td style="text-align: center; border: 1px solid #cbd5e1; font-weight: bold; color: ${method.toLowerCase().includes('bank') ? '#0284c7' : '#047857'}; padding: 7px 10px; vertical-align: middle;">${method}</td>
        </tr>
      `;
    }).join('') : `
      <tr>
        <td colspan="10" style="text-align: center; padding: 20px; border: 1px solid #cbd5e1; color: #64748b; font-weight: bold; background-color: #f8fafc;">
          No purchase records found for this period
        </td>
      </tr>
    `;

    const excelTemplate = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Purchases_${timeTitle}</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; }
          .header-banner { background-color: #0f172a; color: #ffffff; font-size: 16pt; font-weight: bold; text-align: center; height: 40px; border: 1px solid #0f172a; vertical-align: middle; }
          .sub-banner { background-color: #1e293b; color: #34d399; font-size: 10pt; text-align: center; font-weight: bold; height: 24px; border: 1px solid #1e293b; vertical-align: middle; }
          .info-label { font-weight: bold; color: #475569; background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 7px 12px; }
          .info-val { font-weight: bold; color: #0f172a; background-color: #ffffff; border: 1px solid #cbd5e1; padding: 7px 12px; }
          .col-header { background-color: #0f172a; color: #ffffff; font-weight: bold; font-size: 9.5pt; border: 1px solid #0f172a; padding: 9px 8px; vertical-align: middle; }
          .tot-lbl { background-color: #0f172a; color: #ffffff; font-weight: 900; font-size: 11pt; text-align: right; border: 1px solid #0f172a; padding: 10px 14px; vertical-align: middle; }
          .tot-val { background-color: #ecfdf5; color: #047857; font-weight: 900; font-size: 12pt; text-align: right; border: 2px solid #059669; padding: 10px 14px; vertical-align: middle; }
          .tot-due { background-color: #fef2f2; color: #dc2626; font-weight: 900; font-size: 12pt; text-align: right; border: 2px solid #ef4444; padding: 10px 14px; vertical-align: middle; }
          .footer-note { color: #64748b; font-size: 9pt; font-style: italic; text-align: center; height: 28px; vertical-align: middle; border: none; }
        </style>
      </head>
      <body>
        <table>
          <colgroup>
            <col width="50" />
            <col width="220" />
            <col width="180" />
            <col width="100" />
            <col width="100" />
            <col width="140" />
            <col width="160" />
            <col width="160" />
            <col width="140" />
            <col width="130" />
          </colgroup>
          <tr>
            <td colspan="10" class="header-banner">MAIDAN PERFUME SHOP</td>
          </tr>
          <tr>
            <td colspan="10" class="sub-banner">OFFICIAL STOCK PURCHASES &amp; RESTOCK AUDIT REPORT (${timeTitle.replace(/_/g, ' ').toUpperCase()})</td>
          </tr>
          <tr style="height: 10px;"><td colspan="10" style="border:none;"></td></tr>
          <tr>
            <td colspan="2" class="info-label">Report Period:</td>
            <td colspan="3" class="info-val" style="color: #0284c7; font-weight: 900;">${timeTitle.replace(/_/g, ' ')}</td>
            <td colspan="2" class="info-label">Generated Date &amp; Time:</td>
            <td colspan="3" class="info-val">${dateStr}</td>
          </tr>
          <tr>
            <td colspan="2" class="info-label">Total Stock Purchased:</td>
            <td colspan="3" class="info-val" style="color: #0f172a; font-weight: 900;">${stats.totalPetis} Boxes (${stats.totalTrays} Packs • ${stats.totalEggs} Products)</td>
            <td colspan="2" class="info-label">Total Purchases Investment:</td>
            <td colspan="3" class="info-val" style="color: #047857; font-weight: 900;">RS ${Number(stats.totalPurchasesCost || 0).toLocaleString()}</td>
          </tr>
          <tr>
            <td colspan="2" class="info-label">Total Amount Paid:</td>
            <td colspan="3" class="info-val" style="color: #047857; font-weight: 900;">RS ${Number((stats.cashPaid || 0) + (stats.bankPaid || 0)).toLocaleString()}</td>
            <td colspan="2" class="info-label">Total Supplier Credit / Due:</td>
            <td colspan="3" class="info-val" style="color: ${stats.totalDue > 0 ? '#dc2626' : '#047857'}; font-weight: 900;">RS ${Number(stats.totalDue || 0).toLocaleString()}</td>
          </tr>
          <tr style="height: 14px;"><td colspan="10" style="border:none;"></td></tr>
          <tr style="height: 34px;">
            <th class="col-header" style="text-align: center;">#</th>
            <th class="col-header">Product Name</th>
            <th class="col-header">Supplier / Distributor</th>
            <th class="col-header" style="text-align: center;">Box Qty</th>
            <th class="col-header" style="text-align: center;">Pack Qty</th>
            <th class="col-header" style="text-align: center;">Product Qty (Units)</th>
            <th class="col-header" style="text-align: right;">Total Purchase Cost</th>
            <th class="col-header" style="text-align: right;">Amount Paid</th>
            <th class="col-header" style="text-align: right;">Due Balance</th>
            <th class="col-header" style="text-align: center;">Payment Method</th>
          </tr>
          ${formattedRowsHtml}
          <tr style="height: 10px;"><td colspan="10" style="border:none;"></td></tr>
          <tr>
            <td colspan="3" class="tot-lbl">GRAND TOTALS:</td>
            <td style="text-align: center; background-color: #f1f5f9; font-weight: 900; border: 1px solid #0f172a; padding: 10px 8px;">${stats.totalPetis}</td>
            <td style="text-align: center; background-color: #f1f5f9; font-weight: 900; border: 1px solid #0f172a; padding: 10px 8px;">${stats.totalTrays}</td>
            <td style="text-align: center; background-color: #f1f5f9; font-weight: 900; border: 1px solid #0f172a; padding: 10px 8px;">${Number(stats.totalEggs || 0).toLocaleString()}</td>
            <td class="tot-val">RS ${Number(stats.totalPurchasesCost || 0).toLocaleString()}</td>
            <td class="tot-val">RS ${Number((stats.cashPaid || 0) + (stats.bankPaid || 0)).toLocaleString()}</td>
            <td class="tot-due">RS ${Number(stats.totalDue || 0).toLocaleString()}</td>
            <td style="text-align: center; background-color: #f1f5f9; font-weight: 900; border: 1px solid #0f172a; padding: 10px 8px;">${stats.totalDue > 0 ? 'DUE' : 'CLEARED'}</td>
          </tr>
          <tr style="height: 12px;"><td colspan="10" style="border:none;"></td></tr>
          <tr>
            <td colspan="10" class="footer-note">Official Stock Purchases Statement • Generated via Maidan Perfume Shop Financial Ledger</td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([excelTemplate], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Purchases_Report_${timeTitle}_${new Date().toISOString().split('T')[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 sm:p-7 rounded-[2rem] border border-slate-700/80 shadow-2xl text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-teal-500/20 border border-teal-500/40 rounded-2xl text-teal-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight uppercase italic">
                Purchases Page
              </h2>
              <p className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                Full Stock Purchase Records • Day, Month &amp; Year Cost History
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Actions: Print PDF, WhatsApp Share, Excel Export */}
          <button
            onClick={handlePrintPurchasesReport}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider border border-slate-600 transition-all cursor-pointer shadow-sm hover:border-teal-400"
            title="Print PDF Purchases Report"
          >
            <Printer className="w-3.5 h-3.5 text-teal-400" />
            <span>Print PDF</span>
          </button>

          <button
            onClick={handleWhatsAppPurchasesShare}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-black uppercase tracking-wider border border-emerald-500 transition-all cursor-pointer shadow-sm"
            title="Share via WhatsApp"
          >
            <Share2 className="w-3.5 h-3.5 text-white" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={handleExportPurchasesExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider border border-emerald-600 transition-all cursor-pointer shadow-sm"
            title="Export Styled Excel (.xls) Report"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
            <span>Excel</span>
          </button>

          {onAddProduct && (
            <button
              onClick={onAddProduct}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider transition-all shadow-md active:translate-y-0.5 cursor-pointer font-extrabold"
            >
              <Plus className="w-4 h-4 text-slate-950 stroke-[3]" />
              <span>+ Add Product</span>
            </button>
          )}

          {/* Day / Month / Year Timeframe Selector */}
          <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
            {[
              { id: 'ALL', label: 'All-Time' },
              { id: 'DAY', label: 'Today (Day)' },
              { id: 'MONTH', label: 'This Month' },
              { id: 'YEAR', label: 'This Year' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTimeframe(t.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  timeframe === t.id
                    ? 'bg-teal-500 text-slate-950 shadow-md font-extrabold'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 5 Dynamic Stat Cards (Cash & Bank Separated) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Card 1: Stock Purchased */}
        <div className="bg-white border-2 border-amber-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">
              {timeframe === 'DAY' ? 'Today Stock' : timeframe === 'MONTH' ? 'Month Stock' : timeframe === 'YEAR' ? 'Year Stock' : 'Stock Purchased'}
            </span>
            <div className="p-1.5 bg-amber-100 rounded-lg">
              <Box className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black tracking-tight text-gray-900">{stats.totalPetis} <span className="text-base text-amber-600">Boxes</span></h4>
          <div className="mt-2">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200/90 px-2.5 py-1 rounded-full whitespace-nowrap shadow-xs">
              <span className="flex items-center gap-1">🍱 {stats.totalTrays} Packs</span>
              <span className="text-slate-300 font-bold">•</span>
              <span className="flex items-center gap-1">🏷️ {fmt(stats.totalEggs)} Units</span>
            </div>
          </div>
        </div>

        {/* Card 2: Cash Paid (Separate) */}
        <div className="bg-white border-2 border-emerald-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cash Paid</span>
            <div className="p-1.5 bg-emerald-100 rounded-lg">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight">Rs. <CountUpNumber value={stats.cashPaid} /></h4>
          <span className="text-[10px] text-emerald-700 font-bold uppercase mt-1 block">💵 Total Cash Paid</span>
        </div>

        {/* Card 3: Bank Transfer Paid (Separate) */}
        <div className="bg-white border-2 border-blue-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Bank Paid</span>
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-blue-600 tracking-tight">Rs. <CountUpNumber value={stats.bankPaid} /></h4>
          <span className="text-[10px] text-blue-700 font-bold uppercase mt-1 block">🏦 Bank &amp; Online Paid</span>
        </div>

        {/* Card 4: Due Balance (Credit) */}
        <div className={`bg-white border-2 rounded-2xl p-4 shadow-sm flex flex-col justify-between ${stats.totalDue > 0 ? 'border-rose-300 bg-rose-50' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">⚠️ Credit (Due)</span>
            <div className="p-1.5 bg-rose-100 rounded-lg">
              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            </div>
          </div>
          <h4 className={`text-xl sm:text-2xl font-black tracking-tight ${stats.totalDue > 0 ? 'text-rose-600' : 'text-gray-400'}`}>Rs. <CountUpNumber value={stats.totalDue} /></h4>
          <span className={`text-[10px] font-bold uppercase mt-1 block ${stats.totalDue > 0 ? 'text-rose-500' : 'text-gray-400'}`}>
            {stats.totalDue > 0 ? '🔴 Pending Owed Debt' : '✅ No Pending Debt'}
          </span>
        </div>

        {/* Card 5: Grand Total Purchase Cost */}
        <div className="bg-white border-2 border-purple-200 rounded-2xl p-4 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-black text-purple-600 uppercase tracking-widest">
              {timeframe === 'DAY' ? 'Today Cost' : timeframe === 'MONTH' ? 'Month Cost' : timeframe === 'YEAR' ? 'Year Cost' : 'Total Investment'}
            </span>
            <div className="p-1.5 bg-purple-100 rounded-lg">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
            </div>
          </div>
          <h4 className="text-xl sm:text-2xl font-black text-purple-700 tracking-tight">Rs. <CountUpNumber value={stats.totalPurchasesCost} /></h4>
          <span className="text-[10px] text-gray-400 font-bold uppercase mt-1 block">Total Purchase Value</span>
        </div>
      </div>


      {/* ─── LOW STOCK ALERT SECTION ─── */}
      {(() => {
        const lowStockItems = products.filter(p => (Number(p.stock) || 0) <= 50 && p.name);
        if (lowStockItems.length === 0) return null;
        return (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-black text-rose-700 uppercase tracking-widest">Low Stock Alert — {lowStockItems.length} Product(s) Running Low</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map(p => (
                <div key={p._id} className="flex items-center gap-2 bg-white border border-rose-200 rounded-xl px-3 py-1.5 shadow-sm">
                  <span className="text-xs font-black text-gray-900 uppercase">{p.name}</span>
                  <span className="text-[10px] font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded-lg">
                    Stock: {p.stock}
                  </span>
                  {p.supplierName && <span className="text-[10px] text-gray-400 font-bold">{p.supplierName}</span>}
                </div>
              ))}
            </div>
          </div>
        );
      })()}


      {/* Search Control */}
      <div className="bg-white p-3.5 rounded-2xl border border-zinc-100 shadow-sm flex items-center gap-2">
        <div className="flex items-center gap-2 bg-zinc-100 px-3.5 py-2 rounded-xl w-full">
          <Search className="w-4 h-4 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search Supplier, Farm, or Product name..."
            className="bg-transparent text-xs font-bold outline-none w-full text-zinc-800 placeholder:text-zinc-400"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-[10px] font-black text-zinc-400 hover:text-zinc-600 uppercase"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Purchases Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {purchaseItems.map((item) => {
          const itemPetis = item.petiQuantity || (item.stock ? (item.stock / 360).toFixed(1) : 0);
          const itemTrays = item.trayQuantity || (item.stock ? Math.round(item.stock / 30) : 0);
          const itemEggs = item.stock || 0;
          const pMethod = String(item.paymentMethod || 'Cash').trim();
          
          const unitCost = Number(item.costPrice) > 0 ? Number(item.costPrice) : Number(item.price || 0);
          const unitDivisor = item.unitType === 'egg' ? 1 : item.unitType === 'tray' ? 30 : 360;
          const costVal = Number(item.totalPurchaseCost) > 0
            ? Number(item.totalPurchaseCost)
            : (itemPetis > 0 ? itemPetis * unitCost : (Number(item.stock || 0) * (unitCost / unitDivisor)));
          
          const isCreditMethod = pMethod.toLowerCase().includes('credit') || pMethod.toLowerCase().includes('due') || pMethod.toLowerCase().includes('partial');
          const hasExplicitDue = item.dueAmountToSupplier !== undefined && item.dueAmountToSupplier !== null && Number(item.dueAmountToSupplier) > 0;
          
          let dueBalanceAmount = 0;
          let paidAmount = 0;

          if (hasExplicitDue || isCreditMethod) {
            const rawDue = hasExplicitDue ? Number(item.dueAmountToSupplier) : costVal;
            dueBalanceAmount = Math.min(costVal, Math.max(0, rawDue));
            paidAmount = Math.max(0, costVal - dueBalanceAmount);
          } else {
            paidAmount = costVal;
            dueBalanceAmount = 0;
          }

          const hasDue = dueBalanceAmount > 0;

          return (
            <div
              key={item._id}
              className="bg-white border-2 border-gray-200 hover:border-teal-500 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2.5">
                {/* Header: Product Name & Category & Status Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-gray-100 pb-2.5">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-gray-900 text-sm tracking-tight uppercase truncate">{item.name}</h4>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">
                      Supplier: <span className="text-gray-800 font-black">{item.supplierName || 'Farm Supplier'}</span>
                      {item.supplierPhone && <span className="text-teal-700 font-bold ml-1">📞 {item.supplierPhone}</span>}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${
                    hasDue
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    {hasDue ? '⚠️ Credit' : '✓ Cash'}
                  </span>
                </div>

                {/* Stock Quantity Badge */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Available Stock:</span>
                  <span className="font-black text-amber-700">
                    📦 {itemPetis} Boxes <span className="text-gray-400 font-medium">({itemTrays} Packs • {Number(itemEggs).toLocaleString()} Units)</span>
                  </span>
                </div>

                {/* Price & Cost Breakdown */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-2">
                    <span className="text-[9px] font-black text-gray-400 uppercase block">Buy Cost:</span>
                    <span className="font-black text-gray-900 text-xs">Rs. {fmt(item.costPrice || 0)}</span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                    <span className="text-[9px] font-black text-emerald-600 uppercase block">Sell Retail:</span>
                    <span className="font-black text-emerald-700 text-xs">Rs. {fmt(item.price || 0)}</span>
                  </div>
                </div>

                {/* Payment Breakdown (Paid vs Credit) */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-2">
                    <span className="text-[9px] font-black text-emerald-700 uppercase block">
                      {(Number(item.bankPaidToSupplier) > 0 && Number(item.cashPaidToSupplier) > 0)
                        ? '💵 / 🏦 Paid:'
                        : (Number(item.bankPaidToSupplier) > 0 || (item.isOnlinePayment && (Number(item.cashPaidToSupplier) || 0) === 0))
                        ? '🏦 Bank Paid:'
                        : '💵 Cash Paid:'}
                    </span>
                    <span className="font-black text-emerald-700 text-xs">Rs. {fmt(paidAmount)}</span>
                  </div>
                  <div className={`rounded-xl p-2 border ${hasDue ? 'bg-rose-50 border-rose-200' : 'bg-gray-50 border-gray-200'}`}>
                    <span className={`text-[9px] font-black uppercase block ${hasDue ? 'text-rose-600' : 'text-gray-400'}`}>⚠️ Credit (Due):</span>
                    <span className={`font-black text-xs ${hasDue ? 'text-rose-600' : 'text-gray-400'}`}>Rs. {fmt(dueBalanceAmount)}</span>
                  </div>
                </div>

                {/* Prominent Pay Credit Button if credit remains */}
                {hasDue && (
                  <button
                    type="button"
                    onClick={() => handleOpenSettleModal(item, dueBalanceAmount)}
                    className="w-full py-2 px-3 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-98 cursor-pointer mt-1"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-white" />
                    <span>💳 Pay Credit (Rs. {fmt(dueBalanceAmount)})</span>
                  </button>
                )}
              </div>

              {/* Actions Footer: View, Edit, Delete */}
              <div className="pt-2.5 border-t border-gray-100 grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onViewProduct ? onViewProduct(item) : (onEditProduct && onEditProduct(item))}
                  className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="View Details"
                >
                  <Eye className="w-3 h-3 text-gray-600" />
                  <span>View</span>
                </button>

                <button
                  type="button"
                  onClick={() => onEditProduct && onEditProduct(item)}
                  className="py-1.5 px-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer shadow-sm"
                  title="Edit Product"
                >
                  <Edit2 className="w-3 h-3 text-white" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteClick(item)}
                  className="py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-[10px] font-black uppercase flex items-center justify-center gap-1 transition-all cursor-pointer"
                  title="Delete Product"
                >
                  <Trash2 className="w-3 h-3 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 🏢 VENDOR / COMPANY LEDGER DIRECTORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="mt-8 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        {/* Header Strip */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl text-white shadow-md shadow-teal-500/20">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  Vendors &amp; Companies Directory
                </h3>
                <span className="px-2.5 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                  {vendorList.length} Companies
                </span>
              </div>
              <p className="text-xs font-bold text-slate-500">
                Complete directory of registered vendors, supplied products, total purchases, payments &amp; pending balances.
              </p>
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-1.5">
              <span className="text-slate-500 font-bold uppercase text-[9.5px]">Total Bought:</span>
              <span className="font-black text-slate-900">Rs. {fmt(stats.totalPurchasesCost)}</span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-1.5">
              <span className="text-emerald-700 font-bold uppercase text-[9.5px]">Total Paid:</span>
              <span className="font-black text-emerald-800">Rs. {fmt(stats.cashPaid + stats.bankPaid)}</span>
            </div>
            {stats.totalDue > 0 && (
              <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-1.5 animate-pulse">
                <span className="text-rose-600 font-bold uppercase text-[9.5px]">Total Due:</span>
                <span className="font-black text-rose-700">Rs. {fmt(stats.totalDue)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Vendors List Content */}
        {vendorList.length === 0 ? (
          <div className="py-8 text-center text-slate-400 font-bold text-xs">
            No supplier or company records found for the selected timeframe.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10.5px] font-black uppercase text-slate-600 tracking-wider">
                  <th className="py-3 px-3.5 rounded-l-xl">Vendor / Company</th>
                  <th className="py-3 px-3">Supplied Products</th>
                  <th className="py-3 px-3 text-center">Total Volume</th>
                  <th className="py-3 px-3 text-right">Total Purchase</th>
                  <th className="py-3 px-3 text-right">Paid (Cash/Bank)</th>
                  <th className="py-3 px-3 text-right">Credit (Due)</th>
                  <th className="py-3 px-3.5 rounded-r-xl text-center">Action / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold">
                {vendorList.map((v, idx) => {
                  const hasDue = v.totalDue > 0;
                  const firstDueItem = v.products.find(p => (Number(p.dueAmountToSupplier) || 0) > 0);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors group">
                      {/* Vendor Info */}
                      <td className="py-3.5 px-3.5 align-middle">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                            hasDue ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-teal-100 text-teal-800 border border-teal-200'
                          }`}>
                            {v.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-black text-slate-900 text-xs tracking-tight uppercase flex items-center gap-1.5">
                              <span>{v.name}</span>
                              {v.hasReceipt && (
                                <span className="p-0.5 bg-blue-100 text-blue-700 rounded text-[9px]" title="Receipt attached">
                                  <ShieldCheck className="w-3 h-3" />
                                </span>
                              )}
                            </div>
                            {v.phone ? (
                              <div className="flex items-center gap-2 mt-0.5 text-[10.5px] text-slate-500 font-bold">
                                <a 
                                  href={`tel:${v.phone}`} 
                                  className="hover:text-teal-600 flex items-center gap-1"
                                >
                                  <Phone className="w-2.5 h-2.5" />
                                  {v.phone}
                                </a>
                                <a
                                  href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-600 hover:text-emerald-700 font-black text-[9.5px] flex items-center gap-0.5"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageSquare className="w-2.5 h-2.5" /> WA
                                </a>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">No phone registered</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Supplied Products */}
                      <td className="py-3.5 px-3 align-middle max-w-[260px]">
                        <div className="flex flex-wrap gap-1">
                          {v.products.map((p, pIdx) => (
                            <button 
                              key={pIdx}
                              type="button"
                              onClick={() => setSelectedVendorStockModal(v)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-teal-100 hover:text-teal-900 border border-slate-200 rounded-lg text-[10px] font-black text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
                              title={`Click to view stock: ${p.name}`}
                            >
                              <Box className="w-2.5 h-2.5 text-slate-400" />
                              {p.name}
                            </button>
                          ))}
                        </div>
                      </td>

                      {/* Total Volume */}
                      <td className="py-3.5 px-3 text-center align-middle">
                        <div className="inline-flex flex-col items-center">
                          <span className="font-black text-slate-800 text-[11px]">
                            {v.totalBoxes > 0 ? `${v.totalBoxes} Boxes` : `${v.totalUnits} Units`}
                          </span>
                          <span className="text-[9.5px] text-slate-400 font-bold">
                            {v.itemsCount} {v.itemsCount === 1 ? 'Product' : 'Products'}
                          </span>
                        </div>
                      </td>

                      {/* Total Purchase Amount */}
                      <td className="py-3.5 px-3 text-right align-middle">
                        <div className="font-black text-slate-900 text-xs">
                          Rs. {fmt(v.totalCost)}
                        </div>
                        <span className="text-[9.5px] text-slate-400 font-bold uppercase">Total Bill</span>
                      </td>

                      {/* Paid Amount (Cash / Bank) */}
                      <td className="py-3.5 px-3 text-right align-middle">
                        <div className="font-black text-emerald-700 text-xs">
                          Rs. {fmt(v.totalPaid)}
                        </div>
                        <div className="flex justify-end gap-1 text-[9px] font-bold text-slate-500">
                          {v.totalCashPaid > 0 && <span>💵 {fmt(v.totalCashPaid)}</span>}
                          {v.totalBankPaid > 0 && <span>🏦 {fmt(v.totalBankPaid)}</span>}
                        </div>
                      </td>

                      {/* Remaining Due / Credit */}
                      <td className="py-3.5 px-3 text-right align-middle">
                        {hasDue ? (
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-black text-xs">
                              Rs. {fmt(v.totalDue)}
                            </span>
                            <span className="block text-[9px] font-black text-rose-600 uppercase tracking-wider mt-0.5">
                              ⚠️ Pending Credit
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="inline-block px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-black text-[10px]">
                              Rs. 0
                            </span>
                            <span className="block text-[9px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                              ✅ 100% Paid
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Action / View Stock & Pay Credit */}
                      <td className="py-3.5 px-3.5 text-center align-middle">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedVendorStockModal(v)}
                            className="px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-[10.5px] font-black uppercase tracking-wider transition-all cursor-pointer inline-flex items-center gap-1 shadow-2xs"
                            title="View Company Stock & Products Details"
                          >
                            <Eye className="w-3.5 h-3.5 text-teal-600" />
                            <span>View Stock</span>
                          </button>

                          {hasDue && firstDueItem && (
                            <button
                              type="button"
                              onClick={() => handleOpenSettleModal(firstDueItem, v.totalDue)}
                              className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1"
                              title="Pay Supplier Credit"
                            >
                              <CreditCard className="w-3 h-3" />
                              <span>Pay Credit</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bottom Right Action Bar: Single Export & Print Dropdown Menu */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200 bg-white p-4 rounded-2xl shadow-sm">
        <div className="text-xs text-slate-500 font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
          <span>Filter Active: <strong className="text-slate-800 uppercase">{timeframe}</strong> ({purchaseItems.length} Products)</span>
        </div>

        <div className="relative ml-auto">
          <button
            onClick={() => setReportMenuOpen(!reportMenuOpen)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-xl active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-emerald-500"
            title="Print, WhatsApp & Export Purchases"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export &amp; Print</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${reportMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {reportMenuOpen && (
            <div
              className="absolute right-0 bottom-full mb-2 w-64 bg-slate-900 border border-slate-700 text-white rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setReportMenuOpen(false)}
            >
              <button
                onClick={() => { handlePrintPurchasesReport(); setReportMenuOpen(false); }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 hover:bg-white/10 text-emerald-300 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4 text-emerald-400" /> Print Purchases Report
              </button>

              <button
                onClick={() => { handleWhatsAppPurchasesShare(); setReportMenuOpen(false); }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 hover:bg-white/10 text-teal-300 transition-all cursor-pointer"
              >
                <Truck className="w-4 h-4 text-teal-400" /> WhatsApp PDF Report
              </button>

              <button
                onClick={() => { handleExportPurchasesExcel(); setReportMenuOpen(false); }}
                className="w-full px-3.5 py-2.5 rounded-xl text-xs font-black text-left flex items-center gap-2 hover:bg-white/10 text-green-300 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-green-400" /> Export Excel (.csv)
              </button>
            </div>
          )}
        </div>
      </div>
      {/* ───────────────────────────────────────────────────────────── */}
      {/* 📦 VENDOR STOCK & PRODUCTS DETAILS MODAL (POPUP) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedVendorStockModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="absolute inset-0" onClick={() => setSelectedVendorStockModal(null)} />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative max-w-2xl w-full bg-white rounded-3xl border border-slate-200 p-5 text-slate-900 shadow-2xl space-y-4 max-h-[90vh] flex flex-col z-10"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-2xl shadow-md shadow-teal-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black uppercase tracking-tight text-slate-900">
                        {selectedVendorStockModal.name}
                      </h3>
                      <span className="px-2 py-0.5 bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-black rounded-lg uppercase">
                        {selectedVendorStockModal.itemsCount} Products
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-bold mt-0.5 flex-wrap">
                      {selectedVendorStockModal.phone && (
                        <a href={`tel:${selectedVendorStockModal.phone}`} className="flex items-center gap-1 hover:text-teal-600">
                          <Phone className="w-3 h-3" /> {selectedVendorStockModal.phone}
                        </a>
                      )}
                      {selectedVendorStockModal.location && (
                        <span>📍 {selectedVendorStockModal.location}</span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedVendorStockModal(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Vendor Stats Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Stock Volume</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    {selectedVendorStockModal.totalBoxes} Boxes ({selectedVendorStockModal.totalPacks} Packs)
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Total Purchases</span>
                  <span className="text-xs font-black text-slate-900 block mt-0.5">
                    Rs. {fmt(selectedVendorStockModal.totalCost)}
                  </span>
                </div>
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <span className="text-[9px] font-bold text-emerald-700 uppercase block">Total Paid</span>
                  <span className="text-xs font-black text-emerald-800 block mt-0.5">
                    Rs. {fmt(selectedVendorStockModal.totalPaid)}
                  </span>
                </div>
                <div className={`p-2.5 rounded-2xl border text-center ${
                  selectedVendorStockModal.totalDue > 0 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}>
                  <span className={`text-[9px] font-bold uppercase block ${
                    selectedVendorStockModal.totalDue > 0 ? 'text-rose-600' : 'text-slate-500'
                  }`}>Pending Credit</span>
                  <span className={`text-xs font-black block mt-0.5 ${
                    selectedVendorStockModal.totalDue > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}>
                    Rs. {fmt(selectedVendorStockModal.totalDue)}
                  </span>
                </div>
              </div>

              {/* Products List Scrollable Container */}
              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                <span className="text-xs font-black uppercase tracking-wide text-slate-700 block">
                  Supplied Products &amp; Restock Inventory ({selectedVendorStockModal.products.length})
                </span>

                <div className="space-y-2">
                  {selectedVendorStockModal.products.map((p, pIdx) => {
                    const petiQty = Number(p.petiQuantity) || 0;
                    const trayQty = Number(p.trayQuantity) || 0;
                    const eggQty = Number(p.eggQuantity) || 0;
                    const unitCost = Number(p.costPrice) || 0;
                    const unitPrice = Number(p.price) || 0;
                    const dueAmt = Number(p.dueAmountToSupplier) || 0;
                    const paidAmt = Number(p.amountPaidToSupplier) || 0;
                    const totalCost = Number(p.totalPurchaseCost) || (petiQty * unitCost);

                    return (
                      <div
                        key={p._id || pIdx}
                        className="p-3 bg-slate-50/90 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-teal-300 transition-all"
                      >
                        {/* Left: Thumbnail & Info */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
                            {p.images && p.images.length > 0 ? (
                              <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-slate-400" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-900 text-xs uppercase truncate">
                                {p.name}
                              </h4>
                              {p.category && (
                                <span className="px-1.5 py-0.2 bg-slate-200/80 text-slate-700 rounded text-[9px] font-bold">
                                  {p.category}
                                </span>
                              )}
                            </div>

                            {/* Stock quantities */}
                            <div className="flex items-center gap-2 text-[10.5px] font-bold text-slate-600 mt-0.5 flex-wrap">
                              <span className="text-amber-800 font-black">📦 {petiQty} Boxes</span>
                              <span>&bull;</span>
                              <span className="text-teal-800 font-black">🍱 {trayQty} Packs</span>
                              <span>&bull;</span>
                              <span className="text-emerald-800 font-black">🏷️ {eggQty || p.stock || 0} Units</span>
                            </div>

                            {/* Buy & Sell Prices */}
                            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 mt-0.5">
                              <span>Buy Cost: <strong className="text-slate-800">Rs. {fmt(unitCost)}</strong></span>
                              <span>Sell Retail: <strong className="text-emerald-700">Rs. {fmt(unitPrice)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Financials & Quick Action */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 gap-1.5 shrink-0">
                          <div className="text-left sm:text-right">
                            <span className="text-xs font-black text-slate-900 block">
                              Bill: Rs. {fmt(totalCost)}
                            </span>
                            {dueAmt > 0 ? (
                              <span className="text-[10px] font-black text-rose-600 block">
                                ⚠️ Due: Rs. {fmt(dueAmt)}
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 block">
                                ✅ Paid: Rs. {fmt(paidAmt || totalCost)}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {onViewProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVendorStockModal(null);
                                  onViewProduct(p);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-black uppercase cursor-pointer"
                              >
                                View
                              </button>
                            )}
                            {onEditProduct && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVendorStockModal(null);
                                  onEditProduct(p);
                                }}
                                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {dueAmt > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedVendorStockModal(null);
                                  handleOpenSettleModal(p, dueAmt);
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase cursor-pointer"
                              >
                                Pay Credit
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 pt-3 gap-2 shrink-0 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm(selectedVendorStockModal.name);
                    setSelectedVendorStockModal(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer border border-slate-300"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Filter Main Purchases by this Vendor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVendorStockModal(null)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer shadow-md"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt Modal Modal */}
      <AnimatePresence>
        {selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <div className="relative max-w-lg w-full bg-zinc-900 border border-zinc-700 rounded-3xl p-4 text-white shadow-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-black uppercase text-teal-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Supplier Payment Screenshot / Receipt
                </span>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[70vh] overflow-hidden rounded-2xl border border-zinc-800 bg-black flex items-center justify-center">
                <img src={selectedReceipt} alt="Supplier Receipt" className="w-full h-full object-contain max-h-[65vh]" />
              </div>

              <div className="flex justify-between items-center pt-2">
                <a
                  href={selectedReceipt}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] font-black text-teal-400 underline hover:text-teal-300"
                >
                  Open Original Image in New Tab
                </a>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-black uppercase"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Supplier Credit Settlement Modal */}
      <AnimatePresence>
        {settleModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative max-w-md w-full bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white shadow-2xl space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase tracking-tight text-white">
                      Pay Supplier Credit
                    </h3>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">
                      {settleModal.item?.name} • <span className="text-teal-400">{settleModal.item?.supplierName || 'Supplier'}</span>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSettleModal(prev => ({ ...prev, isOpen: false, item: null }))}
                  className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Outstanding Due Banner */}
              <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-rose-300 block tracking-wider">
                    Total Pending Credit (Due)
                  </span>
                  <span className="text-xl font-black text-rose-400 tracking-tight">
                    Rs. {fmt(settleModal.item?.dueAmountToSupplier || 0)}
                  </span>
                </div>
                <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[10px] font-black rounded-lg uppercase tracking-wider">
                  ⚠️ Credit Due
                </span>
              </div>

              {/* Feedback messages */}
              {settleModal.error && (
                <div className="p-3 bg-rose-900/50 border border-rose-700 rounded-xl text-rose-200 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{settleModal.error}</span>
                </div>
              )}
              {settleModal.successMsg && (
                <div className="p-3 bg-emerald-900/50 border border-emerald-700 rounded-xl text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{settleModal.successMsg}</span>
                </div>
              )}

              <form onSubmit={handleConfirmSettle} className="space-y-4">
                {/* Payment Method Selector (Cash vs Bank Transfer) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
                    Select Payment Method
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSettleModal(prev => ({ ...prev, paymentMethod: 'Cash' }))}
                      className={`p-3 rounded-2xl border text-xs font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        settleModal.paymentMethod === 'Cash'
                          ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-900/30'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Banknote className="w-4 h-4" />
                      <span>💵 Cash</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettleModal(prev => ({ ...prev, paymentMethod: 'Bank Transfer' }))}
                      className={`p-3 rounded-2xl border text-xs font-black uppercase flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        settleModal.paymentMethod === 'Bank Transfer'
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/30'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>🏦 Bank Transfer</span>
                    </button>
                  </div>
                </div>

                {/* Amount to Pay */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                      Payment Amount (Rs.)
                    </label>
                    <button
                      type="button"
                      onClick={() => setSettleModal(prev => ({ ...prev, amountPaid: String(prev.item?.dueAmountToSupplier || 0) }))}
                      className="text-[10px] font-black uppercase text-teal-400 hover:text-teal-300 underline"
                    >
                      Pay Full (Rs. {fmt(settleModal.item?.dueAmountToSupplier || 0)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max={settleModal.item?.dueAmountToSupplier || undefined}
                    value={settleModal.amountPaid}
                    onChange={(e) => setSettleModal(prev => ({ ...prev, amountPaid: e.target.value, error: null }))}
                    placeholder="Enter amount to pay..."
                    required
                    className="w-full bg-slate-800 border border-slate-700 focus:border-teal-400 rounded-xl px-4 py-2.5 text-white font-black text-sm outline-none transition-all placeholder:text-slate-500"
                  />
                </div>

                {/* Bank Transfer Receipt Attachment (Optional) */}
                {settleModal.paymentMethod === 'Bank Transfer' && (
                  <div className="space-y-1.5 animate-in fade-in">
                    <label className="text-[11px] font-black uppercase tracking-wider text-slate-300 block">
                      Bank Transfer Receipt / Screenshot (Optional)
                    </label>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-blue-400 rounded-2xl p-3 cursor-pointer bg-slate-800/50 hover:bg-slate-800 transition-all">
                      {settleModal.receiptPreview ? (
                        <div className="flex items-center gap-2">
                          <img src={settleModal.receiptPreview} alt="Receipt preview" className="w-12 h-12 object-cover rounded-lg border border-slate-600" />
                          <span className="text-xs font-bold text-teal-400">Receipt Attached (Click to change)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                          <UploadCloud className="w-5 h-5 text-blue-400" />
                          <span>Upload Transfer Screenshot</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleReceiptFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSettleModal(prev => ({ ...prev, isOpen: false, item: null }))}
                    disabled={settleModal.isSubmitting}
                    className="py-3 px-4 rounded-xl border border-slate-700 text-xs font-black uppercase text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={settleModal.isSubmitting}
                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-1.5 transition-all shadow-lg active:scale-95 cursor-pointer ${
                      settleModal.paymentMethod === 'Cash'
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/40'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-950/40'
                    }`}
                  >
                    {settleModal.isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Pay (Rs. {fmt(settleModal.amountPaid || 0)})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Local Delete Confirmation Modal */}
      {localDeleteDialog.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-gray-100 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-gray-900 uppercase">Delete Product?</h3>
              <p className="text-xs text-gray-500 font-bold">
                Are you sure you want to delete <strong className="text-gray-900">{localDeleteDialog.item?.name}</strong> from stock?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setLocalDeleteDialog({ isOpen: false, item: null, isDeleting: false })}
                disabled={localDeleteDialog.isDeleting}
                className="py-2.5 px-4 rounded-xl border border-gray-200 text-xs font-black text-gray-700 hover:bg-gray-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLocalDelete}
                disabled={localDeleteDialog.isDeleting}
                className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {localDeleteDialog.isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
