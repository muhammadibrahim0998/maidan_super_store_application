import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import CreatableSelect from 'react-select/creatable';
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "../schemas/productSchema";
import { X, Upload, Loader2, Star, Box, Package, Sparkles, UserCheck, ImageIcon, Link as LinkIcon, ShieldCheck, Camera, Plus, Banknote, CreditCard, AlertCircle } from "lucide-react";
import { uploadImages } from "../services/api";
import { toast } from "sonner";

export function ProductModal({ isOpen, onClose, onSave, product, mode, categories = [] }) {
  const { register, handleSubmit, reset, setValue, getValues, watch, control, formState: { errors } } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "", category: "", stock: 0, minStock: 0, price: 0, costPrice: 0,
      unitType: "box", traysPerPeti: 12, eggsPerTray: 30,
      petiQuantity: 0, trayQuantity: 0, eggQuantity: 0,
      supplierName: "", totalPurchaseCost: 0, amountPaidToSupplier: 0, dueAmountToSupplier: 0, paymentMethod: "Cash",
      paymentReceipt: "", images: [], description: "", mfgDate: "", expiryDate: ""
    }
  });

  const [uploading, setUploading] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const fileInputRef = useRef(null);

  const images = watch("images") || [];
  const currentCategory = watch("category");
  const unitType = watch("unitType") || "peti";

  const watchedPetiQty = watch("petiQuantity") || 0;
  const watchedTrayQty = watch("trayQuantity") || 0;
  const watchedEggQty = watch("eggQuantity") || 0;
  const watchedTraysPerPeti = watch("traysPerPeti") || 12;
  const watchedEggsPerTray = watch("eggsPerTray") || 30;
  const watchedCostPrice = watch("costPrice") || 0;
  const watchedAmountPaid = watch("amountPaidToSupplier") || 0;
  const watchedPaymentMethod = watch("paymentMethod") || "Cash";
  const isBankMode = String(watchedPaymentMethod).toLowerCase().includes('bank') || String(watchedPaymentMethod).toLowerCase().includes('online');

  // Live Unit & Stock Conversions
  const tPerPetiVal = Number(watchedTraysPerPeti) || 12;
  const ePerTrayVal = Number(watchedEggsPerTray) || 30;
  const eggsPerPeti = tPerPetiVal * ePerTrayVal;

  const totalEggsCalculated = Number(watchedEggQty) > 0 
    ? Number(watchedEggQty) 
    : (Number(watchedPetiQty) > 0 
        ? Math.round(Number(watchedPetiQty) * eggsPerPeti) 
        : (Number(watchedTrayQty) > 0 ? Math.round(Number(watchedTrayQty) * ePerTrayVal) : 0));

  const totalTraysCalculated = totalEggsCalculated > 0 
    ? Number((totalEggsCalculated / ePerTrayVal).toFixed(1)) 
    : 0;

  const totalPetisCalculated = totalEggsCalculated > 0 
    ? Number((totalEggsCalculated / (eggsPerPeti || 360)).toFixed(2)) 
    : 0;

  const watchedPrice = watch("price") || 0;

  // Live Supplier Bill & Due Calculations (uses costPrice or sale price as fallback)
  const unitRate = Number(watchedCostPrice) > 0 ? Number(watchedCostPrice) : Number(watchedPrice);
  const calculatedTotalBill = Number(watchedPetiQty) > 0 
    ? (Number(watchedPetiQty) * unitRate) 
    : (totalEggsCalculated > 0 ? (totalEggsCalculated * (unitRate / (eggsPerPeti || 360))) : 0);

  const [hasUserEditedPayment, setHasUserEditedPayment] = useState(false);

  // Auto-sync amountPaidToSupplier with calculatedTotalBill when bill updates ONLY if user hasn't typed a custom amount
  useEffect(() => {
    if (isOpen && mode !== "view" && !hasUserEditedPayment) {
      if (calculatedTotalBill > 0) {
        setValue("amountPaidToSupplier", calculatedTotalBill);
      }
    }
  }, [calculatedTotalBill, isOpen, mode, setValue, hasUserEditedPayment]);

  const watchedPaidNum = watchedAmountPaid !== undefined && watchedAmountPaid !== '' && !isNaN(Number(watchedAmountPaid)) 
    ? Number(watchedAmountPaid) 
    : 0;
  const calculatedDue = Math.max(0, calculatedTotalBill - watchedPaidNum);

  const handleAddImageUrl = () => {
    if (!imageUrlInput.trim() || images.length >= 5) return;
    const url = imageUrlInput.trim();
    if (!url.startsWith('http')) return;
    setValue("images", [...images, url]);
    setImageUrlInput("");
    if (images.length === 0) setSelectedImageIndex(0);
  };

  // Sync form with product prop
  useEffect(() => {
    if (isOpen) {
      setHasUserEditedPayment(mode === "edit" || mode === "view");
      if (product && mode !== "add") {
        const tPerP = product.traysPerPeti || 12;
        const ePerT = product.eggsPerTray || 30;
        const ePerP = tPerP * ePerT;

        const totalStockEggs = product.stock || (product.petiQuantity ? Math.round(product.petiQuantity * ePerP) : (product.eggQuantity || 0)) || 0;
        const initialPeti = product.petiQuantity !== undefined && product.petiQuantity !== null && product.petiQuantity > 0
          ? product.petiQuantity
          : (totalStockEggs > 0 ? Number((totalStockEggs / ePerP).toFixed(2)) : 0);
        const initialTray = product.trayQuantity !== undefined && product.trayQuantity !== null && product.trayQuantity > 0
          ? product.trayQuantity
          : (initialPeti > 0 ? Number((initialPeti * tPerP).toFixed(1)) : (totalStockEggs > 0 ? Number((totalStockEggs / ePerT).toFixed(1)) : 0));
        const initialEgg = product.eggQuantity !== undefined && product.eggQuantity !== null && product.eggQuantity > 0
          ? product.eggQuantity
          : (totalStockEggs > 0 ? totalStockEggs : (initialPeti > 0 ? Math.round(initialPeti * ePerP) : 0));

        reset({
          name: product.name || "",
          category: (product.category && !product.category.toLowerCase().includes('egg')) ? product.category : "",
          unitType: product.unitType || "box",
          traysPerPeti: tPerP,
          eggsPerTray: ePerT,
          petiQuantity: initialPeti,
          trayQuantity: initialTray,
          eggQuantity: initialEgg,
          stock: totalStockEggs || initialEgg,
          minStock: product.minStock || 0,
          price: product.price || 0,
          costPrice: product.costPrice || 0,
          supplierName: product.supplierName || "",
          supplierPhone: product.supplierPhone || product.supplierContact || "",
          supplierLocation: product.supplierLocation || product.farmLocation || "",
          totalPurchaseCost: product.totalPurchaseCost || 0,
          amountPaidToSupplier: product.amountPaidToSupplier !== undefined ? product.amountPaidToSupplier : (product.totalPurchaseCost || 0),
          cashPaidToSupplier: product.cashPaidToSupplier || 0,
          bankPaidToSupplier: product.bankPaidToSupplier || 0,
          dueAmountToSupplier: product.dueAmountToSupplier || 0,
          paymentMethod: product.paymentMethod || "Cash",
          isOnlinePayment: Boolean(product.isOnlinePayment),
          paymentReceipt: product.paymentReceipt || "",
          images: product.images || [],
          description: product.description || "",
          mfgDate: product.mfgDate ? new Date(product.mfgDate).toISOString().split('T')[0] : "",
          expiryDate: product.expiryDate ? new Date(product.expiryDate).toISOString().split('T')[0] : "",
        });
      } else {
        reset({
          name: "",
          category: "",
          unitType: "box",
          traysPerPeti: 12,
          eggsPerTray: 30,
          petiQuantity: 0,
          trayQuantity: 0,
          eggQuantity: 0,
          stock: 0,
          minStock: 0,
          price: 0,
          costPrice: 0,
          supplierName: "",
          supplierPhone: "",
          supplierLocation: "",
          totalPurchaseCost: 0,
          amountPaidToSupplier: 0,
          dueAmountToSupplier: 0,
          paymentMethod: "Cash",
          paymentReceipt: "",
          images: [],
          description: "",
          mfgDate: "",
          expiryDate: ""
        });
      }
      setSelectedImageIndex(0);
    }
  }, [product, mode, isOpen, reset]);

  const onSubmit = (data) => {
    const tPerPeti = parseFloat(data.traysPerPeti) || 12;
    const ePerTray = parseFloat(data.eggsPerTray) || 30;
    const ePerPeti = tPerPeti * ePerTray;

    const pQty = parseFloat(data.petiQuantity) || 0;
    const tQty = parseFloat(data.trayQuantity) || (pQty > 0 ? Number((pQty * tPerPeti).toFixed(1)) : 0);
    const eQty = parseFloat(data.eggQuantity) || (pQty > 0 ? Math.round(pQty * ePerPeti) : (tQty > 0 ? Math.round(tQty * ePerTray) : 0));

    const finalStock = eQty > 0 ? eQty : (pQty > 0 ? Math.round(pQty * ePerPeti) : (parseFloat(data.stock) || 0));

    const costPriceVal = parseFloat(data.costPrice) || 0;
    const salePriceVal = parseFloat(data.price) || 0;
    const effectiveUnitPrice = costPriceVal > 0 ? costPriceVal : salePriceVal;

    let computedBill = calculatedTotalBill;
    if (computedBill <= 0) {
      if (pQty > 0) {
        computedBill = pQty * effectiveUnitPrice;
      } else if (finalStock > 0) {
        computedBill = finalStock * (effectiveUnitPrice / ePerPeti);
      }
    }

    const totalBill = computedBill > 0 ? computedBill : (parseFloat(data.totalPurchaseCost) || 0);
    
    // Explicit paid & due parsing
    let paidAmt = 0;
    if (data.amountPaidToSupplier !== undefined && data.amountPaidToSupplier !== "" && !isNaN(parseFloat(data.amountPaidToSupplier))) {
      paidAmt = Math.max(0, parseFloat(data.amountPaidToSupplier));
    } else {
      paidAmt = hasUserEditedPayment ? 0 : totalBill;
    }

    const dueAmt = Math.max(0, totalBill - paidAmt);
    const rawMethod = String(data.paymentMethod || "Cash").trim();
    const isOnlineOrBank = rawMethod.toLowerCase().includes('bank') || rawMethod.toLowerCase().includes('online') || data.isOnlinePayment === true;

    let cashPaid = 0;
    let bankPaid = 0;
    if (isOnlineOrBank) {
      bankPaid = paidAmt;
      cashPaid = 0;
    } else {
      cashPaid = paidAmt;
      bankPaid = 0;
    }

    let determinedMethod = "Cash";
    if (isOnlineOrBank) {
      determinedMethod = dueAmt > 0 && paidAmt === 0 
        ? "Credit" 
        : (dueAmt > 0 ? "Partial Bank Transfer" : "Bank Transfer");
    } else {
      determinedMethod = dueAmt > 0 && paidAmt === 0 
        ? "Credit" 
        : (dueAmt > 0 ? "Partial Cash" : "Cash");
    }

    const payload = {
      ...data,
      name: data.name?.trim() || product?.name || "",
      category: data.category || currentCategory || product?.category || "Eggs",
      unitType: data.unitType || "peti",
      traysPerPeti: tPerPeti,
      eggsPerTray: ePerTray,
      petiQuantity: pQty,
      trayQuantity: tQty,
      eggQuantity: eQty,
      stock: finalStock,
      minStock: parseFloat(data.minStock) ?? product?.minStock ?? 0,
      price: parseFloat(data.price) ?? product?.price ?? 0,
      costPrice: parseFloat(data.costPrice) ?? product?.costPrice ?? 0,
      supplierName: data.supplierName?.trim() || "",
      supplierPhone: data.supplierPhone?.trim() || "",
      supplierLocation: data.supplierLocation?.trim() || "",
      totalPurchaseCost: totalBill,
      amountPaidToSupplier: paidAmt,
      cashPaidToSupplier: cashPaid,
      bankPaidToSupplier: bankPaid,
      dueAmountToSupplier: dueAmt,
      paymentMethod: determinedMethod,
      paymentReceipt: data.paymentReceipt || "",
      isOnlinePayment: isOnlineOrBank,
      images: images && images.length > 0 ? images : (product?.images || []),
      description: data.description ?? "",
      lastUpdated: new Date().toISOString().split("T")[0],
    };

    if (!data.mfgDate) delete payload.mfgDate;
    if (!data.expiryDate) delete payload.expiryDate;

    onSave(payload);
    onClose();
  };


  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const newImageUrls = await uploadImages(files);
      setValue("images", [...images, ...newImageUrls].slice(0, 5));
      toast.success("Product picture uploaded!");
    } catch (error) {
      toast.error("Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sleek Ultra-Clean Modal (No Scrolling, Perfectly Proportioned) */}
      <div className="relative w-full max-w-[480px] bg-slate-50 border border-slate-300 rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden z-10 mx-auto flex flex-col text-slate-900">

        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-white shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 shadow-xs">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 uppercase">
                {mode === "add" ? "Add Product & Stock" : mode === "edit" ? "Edit Product" : "View Product"}
              </h2>
              <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider">Inventory &bull; Stock Entry</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-slate-100 rounded-lg transition-all text-slate-400 hover:text-slate-700 border border-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-3 space-y-2 text-xs">

          {/* 1. PRODUCT PICTURE STRIP */}
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Thumbnail Box */}
              <div 
                onClick={() => mode !== "view" && fileInputRef.current?.click()}
                className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-300 shrink-0 overflow-hidden flex items-center justify-center cursor-pointer relative group hover:border-emerald-500 transition-all"
              >
                {images.length > 0 && images[selectedImageIndex] ? (
                  <img src={images[selectedImageIndex]} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                )}
                {uploading && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Picture Label / Mini Thumbnails */}
              <div className="min-w-0">
                <span className="text-[11px] font-black uppercase text-slate-800 block">
                  Product Picture ({images.length}/5)
                </span>
                {images.length > 1 ? (
                  <div className="flex gap-1 mt-0.5">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-4 h-4 rounded overflow-hidden border cursor-pointer ${selectedImageIndex === idx ? 'border-emerald-600 ring-1 ring-emerald-500' : 'border-slate-300 opacity-60'}`}
                      >
                        <img src={img} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="text-[9px] font-bold text-slate-500 block">PNG, JPG, WebP</span>
                )}
              </div>
            </div>

            {/* Upload Button & Mini URL Box */}
            {mode !== "view" && (
              <div className="flex items-center gap-1.5 shrink-0">
                {images.length < 5 && (
                  <>
                    <input
                      type="text"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="Image URL..."
                      className="w-24 bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-900 outline-none focus:border-emerald-600 placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase rounded-lg tracking-wider flex items-center gap-1 shadow-xs transition-all cursor-pointer"
                    >
                      <Upload className="w-3 h-3" /> Upload
                    </button>
                  </>
                )}
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" multiple className="hidden" />
          </div>

          {/* 2. PRODUCT NAME & CATEGORY (2 COLUMNS) */}
          <div className="grid grid-cols-12 gap-2">
            <div className="col-span-7 space-y-1">
              <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-wide">Product Name *</label>
              <input
                {...register("name")}
                disabled={mode === "view"}
                className={`w-full bg-white border-2 ${errors.name ? 'border-rose-500' : 'border-slate-300'} rounded-lg py-1.5 px-2.5 text-xs font-black text-slate-900 outline-none focus:border-emerald-600 placeholder:text-slate-400 shadow-xs`}
                placeholder="e.g. Product / Item Name"
              />
            </div>
            <div className="col-span-5 space-y-1">
              <label className="text-[10.5px] font-black text-slate-800 uppercase tracking-wide">Category</label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => {
                  const existingCats = Array.from(new Set((categories || []).filter(c => c && c !== "All" && !c.toLowerCase().includes("egg"))));
                  return (
                    <CreatableSelect
                      {...field}
                      isClearable
                      isDisabled={mode === 'view'}
                      options={existingCats.map(c => ({ value: c, label: c }))}
                      onChange={(val) => field.onChange(val ? val.value : "")}
                      onCreateOption={(inputValue) => field.onChange(inputValue)}
                      value={field.value ? { label: field.value, value: field.value } : null}
                      placeholder="Category..."
                      styles={{
                        control: (base, state) => ({
                          ...base,
                          backgroundColor: '#ffffff',
                          borderRadius: "0.5rem",
                          minHeight: "34px",
                          height: "34px",
                          fontSize: "11px",
                          borderColor: state.isFocused ? '#059669' : '#cbd5e1',
                          borderWidth: "2px",
                          fontWeight: '800',
                          color: '#0f172a',
                          boxShadow: 'none'
                        }),
                        menu: (base) => ({
                          ...base,
                          backgroundColor: '#ffffff',
                          borderRadius: "0.5rem",
                          fontSize: "11px",
                          border: '1px solid #cbd5e1',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                        }),
                        option: (base, state) => ({
                          ...base,
                          backgroundColor: state.isFocused ? '#f1f5f9' : '#ffffff',
                          color: '#0f172a',
                          fontSize: "11px",
                          fontWeight: '800'
                        }),
                        singleValue: (base) => ({ ...base, color: '#0f172a', fontWeight: '800' }),
                        input: (base) => ({ ...base, color: '#0f172a', margin: 0, padding: 0 }),
                        valueContainer: (base) => ({ ...base, padding: '0 6px' }),
                        indicatorsContainer: (base) => ({ ...base, height: '34px' })
                      }}
                    />
                  );
                }}
              />
            </div>
          </div>

          {/* 3. PRIMARY UNIT SELECTOR & PRICING */}
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
            {/* Primary Unit Selector Pills */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase text-slate-800">Primary Unit</span>
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 flex-1 max-w-[280px]">
                {['piece', 'bottle', 'box', 'pack'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setValue('unitType', type)}
                    className={`flex-1 py-1 rounded text-[9.5px] font-black uppercase transition-all cursor-pointer ${
                      unitType === type ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Pricing (Sale Price & Cost Price in 2 clear columns) */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wide block">
                  Sale Price / {unitType} (Rs) *
                </label>
                <input
                  type="number"
                  step="any"
                  {...register("price")}
                  disabled={mode === "view"}
                  className={`w-full bg-slate-50 border-2 ${errors.price ? 'border-rose-500' : 'border-slate-300'} rounded-lg py-1 px-2.5 text-xs font-black text-emerald-800 outline-none focus:border-emerald-600`}
                  placeholder="0"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-amber-800 uppercase tracking-wide block">
                  Cost Price / {unitType} (Rs)
                </label>
                <input
                  type="number"
                  step="any"
                  {...register("costPrice")}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg py-1 px-2.5 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* 4. STOCK QUANTITIES (3 EQUAL COLUMNS) */}
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-900 flex items-center gap-1">
                <Box className="w-3.5 h-3.5 text-emerald-600" /> Stock Quantities
              </span>
              <span className="text-[8.5px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">1 Box = 12 Packs</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Boxes */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-amber-800 uppercase block">Boxes</label>
                <input
                  type="number"
                  step="any"
                  {...register("petiQuantity", {
                    onChange: (e) => {
                      const val = e.target.value;
                      if (val === '' || isNaN(Number(val))) {
                        setValue("trayQuantity", '');
                        setValue("eggQuantity", '');
                      } else {
                        const num = parseFloat(val);
                        const tPerP = parseFloat(watch("traysPerPeti")) || 12;
                        const ePerT = parseFloat(watch("eggsPerTray")) || 30;
                        setValue("trayQuantity", Number((num * tPerP).toFixed(1)));
                        setValue("eggQuantity", Math.round(num * tPerP * ePerT));
                      }
                    }
                  })}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-black text-slate-900 outline-none focus:border-amber-500"
                  placeholder="0"
                />
              </div>

              {/* Packs */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-teal-800 uppercase block">Packs</label>
                <input
                  type="number"
                  step="any"
                  {...register("trayQuantity", {
                    onChange: (e) => {
                      const val = e.target.value;
                      if (val === '' || isNaN(Number(val))) {
                        setValue("petiQuantity", '');
                        setValue("eggQuantity", '');
                      } else {
                        const num = parseFloat(val);
                        const tPerP = parseFloat(watch("traysPerPeti")) || 12;
                        const ePerT = parseFloat(watch("eggsPerTray")) || 30;
                        setValue("petiQuantity", Number((num / tPerP).toFixed(2)));
                        setValue("eggQuantity", Math.round(num * ePerT));
                      }
                    }
                  })}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-black text-slate-900 outline-none focus:border-teal-500"
                  placeholder="0"
                />
              </div>

              {/* Units */}
              <div className="space-y-1">
                <label className="text-[9.5px] font-black text-emerald-800 uppercase block">Units</label>
                <input
                  type="number"
                  step="any"
                  {...register("eggQuantity", {
                    onChange: (e) => {
                      const val = e.target.value;
                      if (val === '' || isNaN(Number(val))) {
                        setValue("petiQuantity", '');
                        setValue("trayQuantity", '');
                      } else {
                        const num = parseFloat(val);
                        const tPerP = parseFloat(watch("traysPerPeti")) || 12;
                        const ePerT = parseFloat(watch("eggsPerTray")) || 30;
                        const ePerP = tPerP * ePerT;
                        setValue("petiQuantity", Number((num / ePerP).toFixed(2)));
                        setValue("trayQuantity", Number((num / ePerT).toFixed(1)));
                      }
                    }
                  })}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border-2 border-slate-300 rounded-lg py-1 px-2 text-center text-xs font-black text-slate-900 outline-none focus:border-emerald-500"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Live Calculated Stock Strip */}
            <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-between text-[9px] font-black text-slate-700">
              <span className="font-bold text-slate-600">Total:</span>
              <div className="flex gap-2">
                <span className="text-amber-800">{totalPetisCalculated} Boxes</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-teal-800">{totalTraysCalculated} Packs</span>
                <span className="text-slate-400">&bull;</span>
                <span className="text-emerald-800">{totalEggsCalculated.toLocaleString()} Units</span>
              </div>
            </div>
          </div>

          {/* 5. SUPPLIER & PAYMENT BLOCK */}
          <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1 flex-wrap gap-1">
              <span className="text-[10px] font-black uppercase text-slate-900 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" /> Supplier &amp; Payment
              </span>
              
              {/* Payment Switcher */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setValue("paymentMethod", "Cash");
                    setValue("isOnlinePayment", false);
                  }}
                  disabled={mode === "view"}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                    !isBankMode
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Banknote className="w-3 h-3 inline mr-0.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setValue("paymentMethod", "Bank Transfer");
                    setValue("isOnlinePayment", true);
                  }}
                  disabled={mode === "view"}
                  className={`px-2 py-0.5 rounded text-[9px] font-black uppercase transition-all cursor-pointer ${
                    isBankMode
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CreditCard className="w-3 h-3 inline mr-0.5" /> Bank
                </button>
              </div>
            </div>

            {/* Inputs Grid: Supplier Name, Phone, Paid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">Supplier</label>
                <input
                  type="text"
                  {...register("supplierName")}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500 placeholder:text-slate-400"
                  placeholder="Supplier Name"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-700 uppercase">Phone</label>
                <input
                  type="text"
                  {...register("supplierPhone")}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-xs font-bold text-slate-900 outline-none focus:border-teal-500 placeholder:text-slate-400"
                  placeholder="0300..."
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className={`text-[9px] font-black uppercase ${isBankMode ? 'text-indigo-700' : 'text-emerald-700'}`}>
                    Paid (Rs)
                  </label>
                  {calculatedTotalBill > 0 && mode !== "view" && (
                    <button
                      type="button"
                      onClick={() => {
                        setValue("amountPaidToSupplier", calculatedTotalBill);
                        setHasUserEditedPayment(true);
                      }}
                      className="text-[8px] font-black text-emerald-800 underline cursor-pointer"
                    >
                      100%
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  {...register("amountPaidToSupplier", {
                    onChange: () => setHasUserEditedPayment(true)
                  })}
                  disabled={mode === "view"}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg py-1 px-2 text-xs font-black text-slate-900 outline-none focus:border-emerald-600"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Bill Mini Strip */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-[9px] font-black">
              <div>Total: <span className="text-slate-900 font-black">Rs. {calculatedTotalBill.toLocaleString()}</span></div>
              <div>Paid: <span className="text-emerald-700 font-black">Rs. {watchedPaidNum.toLocaleString()}</span></div>
              <div>Due: <span className="text-rose-700 font-black">Rs. {calculatedDue.toLocaleString()}</span></div>
            </div>
          </div>

        </form>

        {/* Modal Footer Actions */}
        <div className="px-4 py-2 border-t border-slate-200 bg-white flex gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-black text-[11px] uppercase tracking-wider transition-all border border-slate-300 cursor-pointer"
          >
            {mode === "view" ? "Close" : "Cancel"}
          </button>
          {mode !== "view" && (
            <button
              type="button"
              onClick={handleSubmit(onSubmit, (errs) => console.error('[Form Validation Error]', errs))}
              className="flex-[1.5] py-1.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-black text-[11px] uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
            >
              {mode === "add" ? "Create Product" : "Save Changes"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}