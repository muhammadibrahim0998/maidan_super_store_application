import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Item extends BaseMySQLModel {
  static tableName = 'items';
  static jsonFields = ['images'];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.name = data.name || '';
    this.category = data.category || 'General Perfumes';
    this.stock = Number(data.stock) || 0;
    this.minStock = Number(data.minStock) || 0;
    this.price = Number(data.price) || 0;
    this.costPrice = Number(data.costPrice) || 0;
    this.pricePerPeti = Number(data.pricePerPeti) || 0;
    this.pricePerTray = Number(data.pricePerTray) || 0;
    this.pricePerEgg = Number(data.pricePerEgg) || 0;
    this.unitType = data.unitType || 'egg';
    this.petiQuantity = Number(data.petiQuantity) || 0;
    this.totalPurchaseCost = Number(data.totalPurchaseCost) || 0;
    this.amountPaidToSupplier = Number(data.amountPaidToSupplier) || 0;
    this.dueAmountToSupplier = Number(data.dueAmountToSupplier) || 0;
    this.supplierName = data.supplierName || '';
    this.supplierPhone = data.supplierPhone || '';
    this.supplierAddress = data.supplierAddress || data.supplierLocation || '';
    this.supplierPetiPrice = Number(data.supplierPetiPrice) || 0;
    this.supplierInvoiceNo = data.supplierInvoiceNo || '';
    this.supplierInvoiceDate = data.supplierInvoiceDate || null;
    this.paymentMethod = data.paymentMethod || 'CASH';
    this.paymentReceipt = data.paymentReceipt || '';
    this.isOnlinePayment = data.isOnlinePayment ? 1 : 0;
    this.isCompanyStock = data.isCompanyStock ? 1 : 0;
    this.images = Array.isArray(data.images) ? data.images : (typeof data.images === 'string' ? JSON.parse(data.images || '[]') : []);
    this.description = data.description || '';
    this.mfgDate = data.mfgDate || null;
    this.expiryDate = data.expiryDate || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
