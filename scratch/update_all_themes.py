import os

def update_walkin_bill():
    path = 'frontend/src/components/WalkInBillModal.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Container
    c = c.replace('bg-[#1E293B] border border-slate-700/80 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white',
                  'bg-white border border-slate-200 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-slate-900')

    # Header
    c = c.replace('bg-gradient-to-r from-[#2D5A27] via-[#24491F] to-[#1B3817] flex items-center justify-between border-b border-white/10',
                  'bg-white flex items-center justify-between border-b border-slate-200')

    c = c.replace('text-base font-black uppercase tracking-wider text-white',
                  'text-base font-black uppercase tracking-wider text-slate-900')

    c = c.replace('text-[10px] font-bold text-emerald-300 uppercase tracking-widest',
                  'text-[10px] font-bold text-emerald-700 uppercase tracking-widest')

    c = c.replace('className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"',
                  'className="p-2 text-slate-400 hover:text-slate-700 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"')

    # Shop details box
    c = c.replace('bg-slate-900/80 border border-slate-700/60 rounded-2xl p-3.5 space-y-2.5',
                  'bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5')

    c = c.replace('border-b border-slate-700/50 pb-2.5',
                  'border-b border-slate-200 pb-2.5')

    c = c.replace('font-black text-sm text-white uppercase italic',
                  'font-black text-sm text-slate-900 uppercase italic')

    c = c.replace('bg-slate-900 border border-slate-700/80 rounded-xl p-2 text-xs flex justify-between items-center text-amber-300 font-mono',
                  'bg-white border border-slate-200 rounded-xl p-2 text-xs flex justify-between items-center text-slate-800 font-mono')

    c = c.replace('<span className="font-bold bg-black/50 px-2 py-0.5 rounded border border-amber-500/30">{branchBank.accountNo}</span>',
                  '<span className="font-bold bg-slate-100 px-2 py-0.5 rounded border border-slate-300 text-slate-900">{branchBank.accountNo}</span>')

    c = c.replace('<span className="font-bold text-white uppercase">{customerName}</span>',
                  '<span className="font-bold text-slate-900 uppercase">{customerName}</span>')

    c = c.replace('<span className="font-bold text-emerald-300">{customerPhone}</span>',
                  '<span className="font-bold text-emerald-700">{customerPhone}</span>')

    # Items table
    c = c.replace('border border-slate-700/60 rounded-2xl overflow-hidden bg-slate-900/40',
                  'border border-slate-200 rounded-2xl overflow-hidden bg-white')

    c = c.replace('bg-slate-800/80 text-[10px] font-black text-slate-300 uppercase tracking-wider border-b border-slate-700',
                  'bg-slate-50 text-[10px] font-black text-slate-600 uppercase tracking-wider border-b border-slate-200')

    c = c.replace('divide-y divide-slate-800/60 font-medium',
                  'divide-y divide-slate-100 font-medium')

    c = c.replace('hover:bg-slate-800/40 transition-colors',
                  'hover:bg-slate-50 transition-colors')

    c = c.replace('font-black text-white text-xs tracking-wide uppercase',
                  'font-black text-slate-900 text-xs tracking-wide uppercase')

    c = c.replace('text-slate-300 font-mono text-xs',
                  'text-slate-600 font-mono text-xs')

    c = c.replace('font-mono font-black text-white text-sm',
                  'font-mono font-black text-slate-900 text-sm')

    # Grand total
    c = c.replace('p-3.5 bg-slate-800/60 border-t border-slate-700 space-y-2',
                  'p-3.5 bg-slate-50 border-t border-slate-200 space-y-2')

    c = c.replace('text-xs font-black text-slate-300 uppercase tracking-widest',
                  'text-xs font-black text-slate-700 uppercase tracking-widest')

    c = c.replace('text-xl font-black text-emerald-400',
                  'text-xl font-black text-emerald-700')

    c = c.replace('border-t border-slate-700/60 bg-slate-900/60 p-2 rounded-xl',
                  'border-t border-slate-200 bg-white p-2 rounded-xl')

    c = c.replace('text-slate-300 font-bold uppercase text-[10px]',
                  'text-slate-600 font-bold uppercase text-[10px]')

    c = c.replace('text-emerald-400 font-black',
                  'text-emerald-700 font-black')

    # Footer
    c = c.replace('p-3 sm:p-4 bg-slate-900 border-t border-slate-700/80 grid grid-cols-3 gap-2',
                  'p-3 sm:p-4 bg-slate-50 border-t border-slate-200 grid grid-cols-3 gap-2')

    c = c.replace('bg-slate-800 hover:bg-slate-700 text-white font-bold text-[10.5px] uppercase tracking-wider rounded-xl border border-slate-600 transition-all shadow cursor-pointer active:scale-95',
                  'bg-white hover:bg-slate-100 text-slate-800 font-bold text-[10.5px] uppercase tracking-wider rounded-xl border border-slate-300 transition-all shadow cursor-pointer active:scale-95')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('WalkInBillModal updated')

def update_checkout_modal():
    path = 'frontend/src/components/CheckoutModal.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Modal container
    c = c.replace('bg-[#1E293B] border border-slate-700 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative text-white animate-in zoom-in-95 duration-300 max-h-[92vh] overflow-y-auto',
                  'bg-white border border-slate-200 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl relative text-slate-900 animate-in zoom-in-95 duration-300 max-h-[92vh] overflow-y-auto')

    # Sticky header
    c = c.replace('bg-[#15202B] sticky top-0 z-10',
                  'bg-white sticky top-0 z-10')

    c = c.replace('border-b border-slate-700/60',
                  'border-b border-slate-200')

    c = c.replace('<X className="w-5 h-5 text-white" />',
                  '<X className="w-5 h-5 text-slate-500" />')

    c = c.replace('hover:bg-white/10 rounded-full transition-all',
                  'hover:bg-slate-100 rounded-full transition-all text-slate-500')

    # Step 1 inputs
    c = c.replace('bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm font-bold text-white outline-none focus:border-emerald-500',
                  'bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500')

    # Step 2 buttons
    c = c.replace("border-slate-700 bg-slate-900 hover:border-slate-500",
                  "border-slate-200 bg-slate-50 hover:border-slate-300 text-slate-900")

    c = c.replace("text-slate-400 uppercase tracking-wider",
                  "text-slate-500 uppercase tracking-wider")

    c = c.replace('border-t border-slate-700/60',
                  'border-t border-slate-200')

    c = c.replace('bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black',
                  'bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-black')

    # Step 4 EasyPaisa section
    c = c.replace('from-emerald-950 via-slate-900 to-emerald-950 border border-emerald-500/40',
                  'from-slate-50 via-emerald-50/50 to-slate-50 border border-emerald-200')

    c = c.replace('text-[11px] text-slate-300',
                  'text-[11px] text-slate-600')

    c = c.replace('bg-slate-900 p-1.5 rounded-2xl border border-slate-700/80',
                  'bg-slate-100 p-1.5 rounded-2xl border border-slate-200')

    c = c.replace("payMode === 'qr' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'",
                  "payMode === 'qr' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'")

    c = c.replace("payMode === 'number' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'",
                  "payMode === 'number' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'")

    c = c.replace('bg-slate-900 border border-slate-700/80 rounded-2xl p-5 flex flex-col items-center text-center space-y-3',
                  'bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col items-center text-center space-y-3')

    c = c.replace('bg-slate-900 border border-slate-700/80 rounded-2xl p-4 space-y-3',
                  'bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3')

    c = c.replace('border-b border-slate-800',
                  'border-b border-slate-200')

    c = c.replace('bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5',
                  'bg-white border border-slate-200 rounded-xl px-3 py-2.5')

    c = c.replace('text-lg font-black tracking-widest text-white',
                  'text-lg font-black tracking-widest text-slate-900')

    c = c.replace('text-slate-300 flex items-center justify-between',
                  'text-slate-700 flex items-center justify-between')

    c = c.replace('border-2 border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-900/60 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-900',
                  'border-2 border-dashed border-slate-300 hover:border-emerald-500/60 bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-slate-100')

    c = c.replace('bg-slate-900 border border-emerald-500/50 rounded-2xl p-2.5 flex items-center gap-3',
                  'bg-slate-50 border border-emerald-500/50 rounded-2xl p-2.5 flex items-center gap-3')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('CheckoutModal updated')

def update_user_order_modal():
    path = 'frontend/src/components/UserOrderModal.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Modal container
    c = c.replace('rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-700 overflow-hidden',
                  'rounded-3xl bg-white text-slate-900 shadow-2xl border border-slate-200 overflow-hidden')

    # Sticky header
    c = c.replace('border-b border-slate-800 px-6 py-4 bg-slate-900/90 sticky top-0 z-10',
                  'border-b border-slate-200 px-6 py-4 bg-white sticky top-0 z-10')

    c = c.replace('text-xl font-black uppercase tracking-tight text-white',
                  'text-xl font-black uppercase tracking-tight text-slate-900')

    c = c.replace('text-xs font-bold text-slate-400',
                  'text-xs font-bold text-slate-500')

    c = c.replace('text-slate-400 hover:bg-slate-800 hover:text-white',
                  'text-slate-400 hover:bg-slate-100 hover:text-slate-900')

    # Order cards
    c = c.replace('bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-2xl p-5 shadow-lg transition-all cursor-pointer hover:border-emerald-500/40',
                  'bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl p-5 shadow-sm transition-all cursor-pointer hover:border-emerald-500/40')

    c = c.replace('bg-slate-950 text-emerald-400 rounded-lg border border-slate-800',
                  'bg-white text-emerald-700 rounded-lg border border-slate-200')

    c = c.replace('bg-slate-700 text-slate-200 border border-slate-600',
                  'bg-slate-200 text-slate-700 border border-slate-300')

    c = c.replace('text-xs font-bold text-slate-300 truncate',
                  'text-xs font-bold text-slate-600 truncate')

    c = c.replace('<span className="text-white">{getProductSummary(order.items)}</span>',
                  '<span className="text-slate-900 font-bold">{getProductSummary(order.items)}</span>')

    c = c.replace('text-[11px] font-medium text-slate-400',
                  'text-[11px] font-medium text-slate-500')

    c = c.replace('border-slate-700/60',
                  'border-slate-200')

    c = c.replace('text-lg font-black text-emerald-400',
                  'text-lg font-black text-emerald-700')

    c = c.replace('text-emerald-400 uppercase tracking-wider underline',
                  'text-emerald-700 uppercase tracking-wider underline')

    # Footer
    c = c.replace('border-t border-slate-800 px-6 py-3 bg-slate-900/90 flex justify-between items-center text-xs text-slate-400',
                  'border-t border-slate-200 px-6 py-3 bg-slate-50 flex justify-between items-center text-xs text-slate-500')

    c = c.replace('bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl',
                  'bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-xl')

    # Detail sub-modal
    c = c.replace('bg-slate-900 border border-slate-700 rounded-3xl p-6 shadow-2xl space-y-4 text-white',
                  'bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 text-slate-900')

    c = c.replace('border-b border-slate-800 pb-3',
                  'border-b border-slate-200 pb-3')

    c = c.replace('bg-slate-800 text-white rounded-xl',
                  'bg-slate-100 text-slate-800 rounded-xl')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('UserOrderModal updated')

def update_purchased_products_ledger():
    path = 'frontend/src/components/PurchasedProductsLedgerCard.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Dark KPI card
    c = c.replace('p-4 bg-zinc-900 text-white rounded-2xl border border-zinc-800 flex flex-col justify-between',
                  'p-4 bg-slate-50 text-slate-900 rounded-2xl border border-slate-200 flex flex-col justify-between')

    c = c.replace('text-[9px] font-black text-amber-400 uppercase tracking-widest block mb-1',
                  'text-[9px] font-black text-amber-700 uppercase tracking-widest block mb-1')

    c = c.replace('text-[9px] text-zinc-400 font-bold uppercase mt-1 block',
                  'text-[9px] text-slate-500 font-bold uppercase mt-1 block')

    # Table header
    c = c.replace('bg-zinc-900 text-white uppercase text-[10px] tracking-wider font-black',
                  'bg-slate-50 text-slate-700 border-b border-slate-200 uppercase text-[10px] tracking-wider font-black')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('PurchasedProductsLedgerCard updated')

def update_supplier_purchase_summary():
    path = 'frontend/src/components/SupplierPurchaseSummaryCard.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Dark KPI card
    c = c.replace('p-5 bg-zinc-900 text-white rounded-2xl border border-zinc-800 shadow-md flex flex-col justify-between',
                  'p-5 bg-slate-50 text-slate-900 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between')

    c = c.replace('text-[9px] font-black text-amber-400 uppercase tracking-widest block mb-1',
                  'text-[9px] font-black text-amber-700 uppercase tracking-widest block mb-1')

    c = c.replace('h4 className="text-2xl font-black text-white tracking-tight"',
                  'h4 className="text-2xl font-black text-slate-900 tracking-tight"')

    c = c.replace('text-[9px] text-zinc-400 font-bold uppercase mt-1 block',
                  'text-[9px] text-slate-500 font-bold uppercase mt-1 block')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('SupplierPurchaseSummaryCard updated')

def update_edit_sale_modal():
    path = 'frontend/src/components/EditSaleModal.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    c = c.replace('bg-[#1a1c1e] rounded-xl border border-[var(--color-border-subtle)] shadow-2xl',
                  'bg-white rounded-xl border border-slate-200 shadow-2xl text-slate-900')

    c = c.replace('bg-[#202327]/40 backdrop-blur-md border-b border-[var(--color-border-subtle)]',
                  'bg-slate-50 border-b border-slate-200')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('EditSaleModal updated')

def update_delete_modal():
    path = 'frontend/src/components/DeleteConfirmationModal.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    c = c.replace('bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl border border-zinc-200 dark:border-zinc-800',
                  'bg-white rounded-[2.5rem] shadow-2xl border border-slate-200')

    c = c.replace('text-zinc-900 dark:text-white',
                  'text-slate-900')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('DeleteConfirmationModal updated')

def update_customer_storefront_sections():
    path = 'frontend/src/pages/CustomerStorefront.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # 1. Customer login / registration card
    c = c.replace("className=\"min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4 relative overflow-x-hidden overflow-y-auto selection:bg-emerald-500/30\"",
                  "className=\"min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-center items-center p-4 relative overflow-x-hidden overflow-y-auto selection:bg-emerald-500/30\"")

    c = c.replace("className=\"mb-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors uppercase tracking-widest bg-slate-950/80 px-4 py-2 rounded-full border border-emerald-500/30 backdrop-blur-md shadow-lg\"",
                  "className=\"mb-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 transition-colors uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm\"")

    c = c.replace("bg-slate-950/85 backdrop-blur-2xl border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative overflow-hidden text-white",
                  "bg-white backdrop-blur-2xl border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden text-slate-900")

    c = c.replace("<h1 className=\"text-xl font-black tracking-tight text-white uppercase italic\">{shopInfo?.name || 'Customer Portal'}</h1>",
                  "<h1 className=\"text-xl font-black tracking-tight text-slate-900 uppercase italic\">{shopInfo?.name || 'Customer Portal'}</h1>")

    c = c.replace("<div className=\"flex bg-slate-900 rounded-2xl p-1 mb-5 border border-slate-700\">",
                  "<div className=\"flex bg-slate-100 rounded-2xl p-1 mb-5 border border-slate-200\">")

    c = c.replace("mode === 'register' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'",
                  "mode === 'register' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'")

    c = c.replace("mode === 'login' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400 hover:text-white'",
                  "mode === 'login' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'")

    c = c.replace("text-slate-300 uppercase tracking-widest pl-1",
                  "text-slate-600 uppercase tracking-widest pl-1")

    c = c.replace("w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-white text-xs font-bold placeholder:text-slate-500 outline-none transition-all",
                  "w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-4 text-slate-900 text-xs font-bold placeholder:text-slate-400 outline-none transition-all")

    c = c.replace("w-full bg-slate-900 border border-slate-700 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-11 text-white text-xs font-bold placeholder:text-slate-500 outline-none transition-all",
                  "w-full bg-slate-50 border border-slate-300 focus:border-emerald-500 rounded-xl py-2.5 pl-10 pr-11 text-slate-900 text-xs font-bold placeholder:text-slate-400 outline-none transition-all")

    # 2. Cart drawer
    c = c.replace("bg-gradient-to-b from-[#182232] via-[#0f172a] to-[#0b1120] border-l-2 border-slate-700",
                  "bg-white border-l-2 border-slate-200 text-slate-900")

    c = c.replace("border-b border-slate-800/80 bg-slate-900/90 backdrop-blur-md",
                  "border-b border-slate-200 bg-white")

    c = c.replace("p-6 bg-slate-900/90 rounded-3xl border border-slate-800 mb-4 shadow-inner",
                  "p-6 bg-slate-50 rounded-3xl border border-slate-200 mb-4")

    c = c.replace("border-t border-slate-800/90 bg-slate-900/95 space-y-3 backdrop-blur-md",
                  "border-t border-slate-200 bg-slate-50 space-y-3")

    c = c.replace("bg-slate-950/80 rounded-2xl border border-slate-800",
                  "bg-white rounded-2xl border border-slate-200")

    # 3. Main storefront background
    c = c.replace("${isAdminUser ? 'bg-slate-100 text-zinc-900' : 'bg-[#0f172a] text-white'}",
                  "bg-slate-100 text-zinc-900")

    # 4. Product cards in CustomerStorefront
    c = c.replace("group bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 border-2 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] flex flex-col",
                  "group bg-white border border-slate-200 rounded-2xl sm:rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:scale-[1.02] flex flex-col shadow-sm")

    c = c.replace("bg-slate-900/60",
                  "bg-white")

    c = c.replace("font-black text-white text-sm leading-snug line-clamp-2 uppercase tracking-tight group-hover:text-cyan-300 transition-colors duration-300",
                  "font-black text-slate-900 text-sm leading-snug line-clamp-2 uppercase tracking-tight group-hover:text-emerald-700 transition-colors duration-300")

    c = c.replace("bg-gradient-to-t from-slate-950 via-transparent to-black/20 opacity-80 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none",
                  "hidden")

    # 5. Selected item product detail modal in CustomerStorefront
    c = c.replace("bg-gradient-to-b from-slate-900 via-slate-850 to-slate-950 border-2 border-blue-500/50 rounded-3xl w-full max-w-[370px] sm:max-w-[390px] overflow-hidden shadow-[0_20px_60px_-10px_rgba(37,99,235,0.55),0_0_35px_rgba(59,130,246,0.3)] animate-in zoom-in-95 duration-300 text-white",
                  "bg-white border-2 border-slate-200 rounded-3xl w-full max-w-[370px] sm:max-w-[390px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 text-slate-900")

    c = c.replace("text-base sm:text-lg font-black text-white tracking-tight uppercase truncate",
                  "text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase truncate")

    c = c.replace("text-slate-300 text-[11px] leading-relaxed font-medium mt-0.5 line-clamp-2",
                  "text-slate-600 text-[11px] leading-relaxed font-medium mt-0.5 line-clamp-2")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('CustomerStorefront sections updated')

def update_customer_dashboard_charts():
    path = 'frontend/src/components/CustomerDashboardCharts.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Hero featured 3D showcase carousel card
    c = c.replace('className="relative bg-gradient-to-br from-[#070e14] via-[#0c1822] to-[#04090e] border-2 border-emerald-500/30 hover:border-emerald-400/60 rounded-[2.25rem] sm:rounded-[2.75rem] p-4 sm:p-7 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_40px_rgba(16,185,129,0.18),inset_0_1px_2px_rgba(255,255,255,0.15)] text-white overflow-hidden transition-all duration-500 mb-2"',
                  'className="relative bg-white border-2 border-slate-200 hover:border-emerald-400/60 rounded-[2.25rem] sm:rounded-[2.75rem] p-4 sm:p-7 shadow-lg text-slate-900 overflow-hidden transition-all duration-500 mb-2"')

    c = c.replace('border-b border-slate-800/80',
                  'border-b border-slate-200')

    c = c.replace('text-xs font-semibold text-slate-300 mt-0.5',
                  'text-xs font-semibold text-slate-500 mt-0.5')

    c = c.replace('bg-slate-900/90 text-amber-300 border border-amber-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)]',
                  'bg-slate-100 text-amber-700 border border-slate-300 shadow-sm')

    c = c.replace('bg-gradient-to-b from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 text-slate-200 hover:text-white border border-slate-700/80',
                  'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-300')

    c = c.replace('text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight line-clamp-1 drop-shadow-md',
                  'text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 uppercase tracking-tight line-clamp-1')

    c = c.replace('text-xs sm:text-sm text-slate-300/90 font-medium leading-relaxed line-clamp-2',
                  'text-xs sm:text-sm text-slate-600 font-medium leading-relaxed line-clamp-2')

    c = c.replace('bg-gradient-to-r from-slate-950/90 via-[#0a141d]/90 to-slate-950/90 border border-emerald-500/30 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-[0_15px_35px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.15)]',
                  'bg-slate-50 border border-slate-200 rounded-2xl sm:rounded-3xl p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-sm')

    c = c.replace('p-2 bg-slate-950/80 rounded-2xl border border-slate-800/90 shadow-inner flex items-center gap-1.5 overflow-x-auto scrollbar-hide',
                  'p-2 bg-slate-100 rounded-2xl border border-slate-200 flex items-center gap-1.5 overflow-x-auto scrollbar-hide')

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('CustomerDashboardCharts updated')

if __name__ == '__main__':
    update_walkin_bill()
    update_checkout_modal()
    update_user_order_modal()
    update_purchased_products_ledger()
    update_supplier_purchase_summary()
    update_edit_sale_modal()
    update_delete_modal()
    update_customer_storefront_sections()
    update_customer_dashboard_charts()
    print('ALL THEMES UPDATED TO GRAY & WHITE')
