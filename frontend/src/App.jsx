import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { Footer } from "./components/Footer";
import { ShopAdminDashboard } from "./pages/ShopAdminDashboard";
import { Storefront } from "./pages/Storefront";
import { TeamView } from "./pages/TeamView";
import { SuperAdminDashboard } from "./pages/SuperAdminDashboard";
import { ProductDetail } from "./pages/ProductDetail";

import { CartModal } from "./components/CartModal";
import { ProductModal } from "./components/ProductModal";
import { PurchasesManagement } from "./components/PurchasesManagement";
import { ReceiptModal } from "./components/ReceiptModal";
import { EditSaleModal } from "./components/EditSaleModal";
import { ExportModal } from "./components/ExportModal";
import { ShiftModal } from "./components/ShiftModal";
import { AuthGuardModal } from "./components/auth/AuthGuardModal";
import { useUser } from "./contexts/UserContext";
import { useModals } from "./contexts/ModalContext";
import { useShift } from "./contexts/ShiftContext";
import { DeleteConfirmationModal } from "./components/DeleteConfirmationModal";
import { LoginView } from "./components/auth/LoginView";
import { SettingsView } from "./pages/SettingsView";
import { HelpView } from "./pages/HelpView";

import { useProducts } from "./contexts/ProductContext";

import {
  createItem,
  updateItem,
  deleteItem as apiDeleteItem,
  createSale,
  deleteSale,
  updateSale,
  returnSale
} from "./services/api";

import { toast, Toaster } from "sonner";


export default function App() {
  const { user, isSuperAdmin, isShopAdmin, loading: userLoading } = useUser();
  const { cart, clearCart, fetchData, sales, products, categories } = useProducts();
  const { modals, activeData, openModal, closeModal } = useModals();
  const { refreshSession } = useShift();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, type: '', id: null, name: '', data: null });
  const [isDeleting, setIsDeleting] = useState(false);

  // Stats for Navbar & Dashboard — must be before any early return (Rules of Hooks)
  const [checkoutOrders, setCheckoutOrders] = useState([]);
  useEffect(() => {
    import('./services/api').then(({ default: api }) => {
      api.get('/checkout/orders')
        .then(res => {
          if (res.data?.orders) setCheckoutOrders(res.data.orders);
        })
        .catch(() => {});
    });
  }, [sales]); // refresh when sales refresh

  if (userLoading) return null;
  if (!user) return <LoginView />;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const thisYear = new Date(today.getFullYear(), 0, 1);

  const filterSales = (minDate) => (sales || []).filter(s => s && s.saleDate && new Date(s.saleDate) >= minDate);
  const sumSales = (filtered) => (filtered || []).filter(s => s && s.status !== 'returned').reduce((sum, sale) => sum + (sale?.totalAmount || 0), 0);
  const sumProfit = (filtered) => (filtered || []).filter(s => s && s.status !== 'returned').reduce((sum, sale) => sum + (sale?.totalProfit || 0), 0);

  // EasyPaisa / Customer checkout order revenue (PAID only → approved by admin)
  const validCheckout = (checkoutOrders || []).filter(o => o && o.paymentStatus === 'PAID');
  const filterCheckout = (minDate) => validCheckout.filter(o => o && o.createdAt && new Date(o.createdAt) >= minDate);
  const sumCheckout = (filtered) => (filtered || []).reduce((sum, o) => sum + (o?.totalAmount || 0), 0);

  const dailySalesList = filterSales(today);
  const monthlySalesList = filterSales(thisMonth);
  const yearlySalesList = filterSales(thisYear);

  // Combined daily/monthly/yearly (POS + PAID EasyPaisa only)
  const dailySalesTotal = sumSales(dailySalesList) + sumCheckout(filterCheckout(today));
  const monthlySalesTotal = sumSales(monthlySalesList) + sumCheckout(filterCheckout(thisMonth));
  const yearlySalesTotal = sumSales(yearlySalesList) + sumCheckout(filterCheckout(thisYear));
  const totalRevenue = sumSales(sales || []) + sumCheckout(validCheckout);

  // Handlers for Modals
  const handleAddProduct = async (productData) => {
    try {
      await createItem(productData);
      toast.success("Product added successfully!");
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to add product");
    }
  };

  const handleEditProductSubmit = async (productData) => {
    requireAuth(async (pw) => {
      try {
        const prodId = activeData?.product?._id || activeData?.product?.id || productData?._id || productData?.id;
        if (!prodId || prodId === 'undefined') {
          toast.error("Product ID is missing. Cannot update.");
          return;
        }
        await updateItem(prodId, productData, pw, user?.role);
        toast.success("Product updated successfully!");
        closeModal("editProduct");
        fetchData();
      } catch (err) {
        toast.error(err.message || "Failed to update product");
      }
    }, "Authorize Update", "Owner permission required to edit stock/price.");
  };

  const handleDeleteProduct = (product) => {
    if (!product) return;
    const id = typeof product === 'string' ? product : (product?._id || product?.id);
    const name = typeof product === 'string' ? 'Selected Product' : (product?.name || 'Selected Product');
    if (!id || id === 'undefined') {
      toast.error("Invalid product selected for deletion");
      return;
    }
    setDeleteDialog({
      isOpen: true,
      type: 'product',
      id,
      name,
      data: product
    });
  };

  const confirmDeleteProduct = async () => {
    const { id } = deleteDialog;
    if (!id || id === 'undefined') {
      toast.error("Product ID is missing");
      return;
    }
    requireAuth(async (pw) => {
      setIsDeleting(true);
      try {
        await apiDeleteItem(id, pw, user?.role);
        toast.success("Product deleted successfully!");
        setDeleteDialog({ ...deleteDialog, isOpen: false });
        fetchData();
      } catch (err) {
        toast.error(err.message || "Failed to delete product");
      } finally {
        setIsDeleting(false);
      }
    }, "Authorize Deletion", "Owner permission required to delete inventory items.");
  };

  const checkoutCart = async (customerName) => {
    try {
      const totalAmount = cart.reduce((sum, item) => sum + item.subtotal, 0);
      const totalProfit = cart.reduce((sum, item) => sum + ((item.price - (item.costPrice || 0)) * item.quantity), 0);

      const saleData = {
        items: cart.map(({ productId, name, price, costPrice, quantity, subtotal }) => ({
          productId,
          name,
          price,
          costPrice,
          quantity,
          subtotal,
          profit: (price - (costPrice || 0)) * quantity
        })),
        totalAmount,
        totalProfit,
        cashierId: user.id,
        cashierName: user.fullName,
        customerName: customerName?.trim() || "Walk-in Customer"
      };

      const newSale = await createSale(saleData);
      openModal("receipt", newSale);
      toast.success("Sale completed successfully!");
      clearCart();
      closeModal("cart");
      fetchData();
      refreshSession();
    } catch (err) {
      console.error(err);
      toast.error("Checkout failed. Please check stock levels.");
    }
  };


  const handleDeleteSale = (sale) => {
    setDeleteDialog({
      isOpen: true,
      type: 'sale',
      id: sale._id,
      name: `Sale #${sale._id.slice(-6).toUpperCase()}`,
      data: sale
    });
  };

  const confirmDeleteSale = async () => {
    const { id } = deleteDialog;
    requireAuth(async (pw) => {
      setIsDeleting(true);
      try {
        await deleteSale(id, pw, user?.role);
        toast.success("Sale record deleted!");
        setDeleteDialog({ ...deleteDialog, isOpen: false });
        fetchData();
        refreshSession();
      } catch (err) {
        toast.error(err.message || "Unauthorized delete");
      } finally {
        setIsDeleting(false);
      }
    }, "Confirm Destruction", "Deleting a sale reverses stock. Owner password required.");
  };

  const handleReturnSale = async (saleId, reason) => {
    requireAuth(async (pw) => {
      try {
        await returnSale(saleId, { reason }, pw, user?.role);
        toast.success("Sale returned & stock restored!");
        fetchData();
        refreshSession();
      } catch (err) {
        toast.error(err.message || "Unauthorized return");
      }
    }, "Authorize Return", "Marking a sale as returned will restore stock and adjust cash.");
  };

  const handleEditSaleSubmit = async (saleId, updatedItems) => {

    requireAuth(async (pw) => {
      try {
        const totalAmount = updatedItems.reduce((sum, item) => sum + item.subtotal, 0);
        const totalProfit = updatedItems.reduce((sum, item) => sum + ((item.price - (item.costPrice || 0)) * item.quantity), 0);
        await updateSale(saleId, { items: updatedItems, totalAmount, totalProfit }, pw, user?.role);
        toast.success("Sale updated successfully!");
        closeModal("editSale");
        fetchData();
        refreshSession();
      } catch (err) {
        toast.error("Update failed. Check stock or authorization.");
      }
    }, "Authorize Edit", "Modifying completed sales requires owner verification.");
  };

  // Modernized requireAuth helper
  const requireAuth = (callback, title, message) => {
    if (isShopAdmin() || isSuperAdmin()) {
      return callback('');
    }
    openModal("auth", { callback, title, message });
  };


  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background text-text-primary w-full tracking-tight">
      <Toaster position="top-center" richColors duration={1500} />

      <Navbar
        isCollapsed={isCollapsed}
        onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
        cartCount={(cart || []).reduce((s, i) => s + (i?.quantity || 0), 0)}
        onCartClick={() => openModal("cart")}
        onAddProduct={() => openModal("addProduct")}
        onNewSale={() => openModal("cart")}
        onExport={() => openModal("export")}
        onShiftClick={() => openModal("shift")}
        dailySales={dailySalesTotal}
        monthlySales={monthlySalesTotal}
        yearlySales={yearlySalesTotal}
        dailyProfit={sumProfit(dailySalesList)}
        monthlyProfit={sumProfit(monthlySalesList)}
        yearlyProfit={sumProfit(yearlySalesList)}
        onMenuClick={() => openModal("mobileMenu")}
        onSearchToggle={(expanded) => expanded && closeModal("mobileMenu")}
      />

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Navigation */}
        <Sidebar
          isMobileOpen={modals.mobileMenu}
          onCloseMobile={() => closeModal("mobileMenu")}
          isCollapsed={isCollapsed}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)}
        />

        {/* Main Content Pane */}
        <div className="flex-1 w-full flex flex-col overflow-hidden relative">
          <main className="flex-1 w-full overflow-y-auto p-4 sm:p-6 lg:p-8 !pb-0 bg-background scrollbar-hide">
            <div className="max-w-7xl mx-auto space-y-6">
              <Routes>
                <Route path="/" element={
                  isSuperAdmin() ? (
                    <SuperAdminDashboard />
                  ) : isShopAdmin() ? (
                    <Navigate to={`/shop/${user?.shopId || '6a741138253a8863f58ae4a4'}`} replace />
                  ) : (
                    <Navigate to="/shop" replace />
                  )
                } />

                <Route path="/dashboard" element={
                  isSuperAdmin() ? (
                    <SuperAdminDashboard />
                  ) : isShopAdmin() ? (
                    <Navigate to={`/shop/${user?.shopId || '6a741138253a8863f58ae4a4'}`} replace />
                  ) : (
                    <Navigate to="/shop" replace />
                  )
                } />

                <Route path="/store" element={
                  <Storefront
                    onAdd={() => openModal("addProduct")}
                    onEdit={(p) => openModal("editProduct", p)}
                    onDelete={handleDeleteProduct}
                    onView={(p) => openModal("viewProduct", p)}
                  />
                } />
                <Route path="/store/category/:category" element={
                  <Storefront
                    onAdd={(cat) => openModal("addProduct", { category: cat })}
                    onEdit={(p) => openModal("editProduct", p)}
                    onDelete={handleDeleteProduct}
                    onView={(p) => openModal("viewProduct", p)}
                  />
                } />
                <Route path="/store/status/:status" element={
                  <Storefront
                    onAdd={() => openModal("addProduct")}
                    onEdit={(p) => openModal("editProduct", p)}
                    onDelete={handleDeleteProduct}
                    onView={(p) => openModal("viewProduct", p)}
                  />
                } />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="/help" element={<HelpView />} />
                <Route path="/team" element={(isShopAdmin() || isSuperAdmin()) ? <TeamView /> : <Navigate to="/" />} />
                <Route path="/purchases" element={isShopAdmin() ? <PurchasesManagement onAddProduct={() => openModal("addProduct")} onEditProduct={(p) => openModal("editProduct", p)} /> : <Navigate to="/" />} />
                <Route path="/shops" element={isSuperAdmin() ? <Navigate to="/" replace /> : <Navigate to="/" replace />} />
              </Routes>
            </div>
            <Footer />
          </main>
        </div>
      </div>

      {/* Modals */}
      <CartModal
        isOpen={modals.cart}
        onClose={() => closeModal("cart")}
        onCheckout={checkoutCart}
      />

      <ProductModal
        isOpen={modals.addProduct}
        onClose={() => closeModal("addProduct")}
        onSave={handleAddProduct}
        product={activeData.prefilledProduct}
        categories={categories}
        title="Add New Product"
        mode="add"
      />

      <ProductModal
        isOpen={modals.editProduct}
        onClose={() => closeModal("editProduct")}
        onSave={handleEditProductSubmit}
        product={activeData.product}
        categories={categories}
        title="Edit Product"
        mode="edit"
      />

      <ProductModal
        isOpen={modals.viewProduct}
        onClose={() => closeModal("viewProduct")}
        product={activeData.product}
        categories={categories}
        title="Product Details"
        mode="view"
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={modals.receipt}
        onClose={() => closeModal("receipt")}
        sale={activeData.sale}
      />

      <EditSaleModal
        isOpen={modals.editSale}
        onClose={() => closeModal("editSale")}
        sale={activeData.sale}
        onSave={handleEditSaleSubmit}
      />

      <ExportModal
        isOpen={modals.export}
        onClose={() => closeModal("export")}
        products={products}
        sales={sales}
        categories={categories}
      />

      <ShiftModal
        isOpen={modals.shift}
        onClose={() => closeModal("shift")}
      />

      <AuthGuardModal
        isOpen={modals.auth}
        onClose={() => closeModal("auth")}
        title={activeData.authAction?.title || "Authentication"}
        message={activeData.authAction?.message || "Permission required."}
        onConfirm={activeData.authAction?.callback}
      />

      <DeleteConfirmationModal
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ ...deleteDialog, isOpen: false })}
        onConfirm={deleteDialog.type === 'product' ? confirmDeleteProduct : confirmDeleteSale}
        title={deleteDialog.type === 'product' ? "Confirm Product Deletion" : "Confirm Sale Deletion"}
        message={deleteDialog.type === 'product' ? "Are you sure you want to remove this product from inventory?" : "Deleting this sale will reverse stock changes. Proceed?"}
        itemName={deleteDialog.name}
        isDeleting={isDeleting}
      />

    </div>
  );
}
