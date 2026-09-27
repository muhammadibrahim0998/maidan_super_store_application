import os

def update_product_card():
    path = 'frontend/src/components/ProductCard.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Container
    c = c.replace("className={`group w-full bg-[#1E293B] border rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 flex flex-col cursor-pointer select-none ${\n        isOutOfStock \n          ? 'border-red-500/40 opacity-80' \n          : isLowStock \n          ? 'border-amber-500/60 shadow-amber-500/10' \n          : 'border-slate-700/60 hover:border-emerald-500/50'\n      }`}",
                  "className={`group w-full bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col cursor-pointer select-none text-slate-900 ${\n        isOutOfStock \n          ? 'border-red-500/40 opacity-80' \n          : isLowStock \n          ? 'border-amber-500/60 shadow-amber-500/10' \n          : 'hover:border-emerald-500/50'\n      }`}")

    # Fallback single line replace if needed
    c = c.replace("bg-[#1E293B]", "bg-white")
    c = c.replace("border-slate-700/60 hover:border-emerald-500/50", "border-slate-200 hover:border-emerald-500/50")
    c = c.replace("bg-slate-900 overflow-hidden", "bg-slate-100 overflow-hidden")
    c = c.replace("bg-[#111827]/90 px-3 py-1 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest border border-slate-700/80 backdrop-blur-md",
                  "bg-white px-3 py-1 rounded-full text-[9px] font-black text-emerald-700 uppercase tracking-widest border border-slate-200 shadow-xs")
    c = c.replace("font-black text-white text-sm leading-snug line-clamp-1 uppercase tracking-tight group-hover:text-emerald-300 transition-colors",
                  "font-black text-slate-900 text-sm leading-snug line-clamp-1 uppercase tracking-tight group-hover:text-emerald-700 transition-colors")
    c = c.replace("grid grid-cols-3 gap-1 p-2 bg-slate-900/90 rounded-xl border border-slate-700/80 text-[10px] font-black",
                  "grid grid-cols-3 gap-1 p-2 bg-slate-50 rounded-xl border border-slate-200 text-[10px] font-black")
    c = c.replace("border-r border-slate-700/60", "border-r border-slate-200")
    c = c.replace("text-white text-[11px]", "text-slate-900 text-[11px]")
    c = c.replace("bg-slate-800 hover:bg-slate-700 text-white font-black text-[9px]",
                  "bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-[9px]")
    c = c.replace("border border-slate-600/60", "border border-slate-200")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('ProductCard updated')

def update_purchases_management_modals():
    path = 'frontend/src/components/PurchasesManagement.jsx'
    if not os.path.exists(path):
        return
    with open(path, 'r', encoding='utf-8') as f:
        c = f.read()

    # Dropdown menu
    c = c.replace("bg-slate-900 border border-slate-700 text-white rounded-2xl p-2 shadow-2xl z-50",
                  "bg-white border border-slate-200 text-slate-900 rounded-2xl p-2 shadow-xl z-50")
    c = c.replace("hover:bg-white/10 text-emerald-300", "hover:bg-slate-50 text-emerald-700")
    c = c.replace("hover:bg-white/10 text-teal-300", "hover:bg-slate-50 text-teal-700")
    c = c.replace("hover:bg-white/10 text-green-300", "hover:bg-slate-50 text-green-700")

    # Receipt modal
    c = c.replace("bg-zinc-900 border border-zinc-700 rounded-3xl p-4 text-white shadow-2xl space-y-3",
                  "bg-white border border-slate-200 rounded-3xl p-4 text-slate-900 shadow-2xl space-y-3")
    c = c.replace("border-b border-zinc-800 pb-2", "border-b border-slate-200 pb-2")
    c = c.replace("border border-zinc-800 bg-black flex", "border border-slate-200 bg-slate-50 flex")
    c = c.replace("bg-zinc-800 hover:bg-zinc-700 text-white", "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200")

    # Settle modal
    c = c.replace("bg-slate-900 border border-slate-700 rounded-3xl p-6 text-white shadow-2xl space-y-4",
                  "bg-white border border-slate-200 rounded-3xl p-6 text-slate-900 shadow-2xl space-y-4")
    c = c.replace("border-b border-slate-800 pb-3", "border-b border-slate-200 pb-3")
    c = c.replace("text-base font-black uppercase tracking-tight text-white", "text-base font-black uppercase tracking-tight text-slate-900")
    c = c.replace("text-[11px] font-bold text-slate-400 uppercase", "text-[11px] font-bold text-slate-500 uppercase")
    c = c.replace("text-[11px] font-black uppercase tracking-wider text-slate-300 block", "text-[11px] font-black uppercase tracking-wider text-slate-700 block")
    c = c.replace("bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800", "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100")
    c = c.replace("text-[11px] font-black uppercase tracking-wider text-slate-300", "text-[11px] font-black uppercase tracking-wider text-slate-700")
    c = c.replace("bg-slate-800 border border-slate-700 focus:border-teal-400 rounded-xl px-4 py-2.5 text-white", "bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl px-4 py-2.5 text-slate-900")

    with open(path, 'w', encoding='utf-8') as f:
        f.write(c)
    print('PurchasesManagement modals updated')

if __name__ == '__main__':
    update_product_card()
    update_purchases_management_modals()
