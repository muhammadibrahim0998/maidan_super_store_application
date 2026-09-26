import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Purchase extends BaseMySQLModel {
  static tableName = 'purchases';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.productName = data.productName || '';
    this.productId = data.productId || null;
    this.category = data.category || '';
    this.supplierName = data.supplierName || '';
    this.supplierPhone = data.supplierPhone || '';
    this.supplierAddress = data.supplierAddress || '';
    this.quantity = Number(data.quantity) || 0;
    this.unitType = data.unitType || 'unit';
    this.petiQuantity = Number(data.petiQuantity) || 0;
    this.trayQuantity = Number(data.trayQuantity) || 0;
    this.eggQuantity = Number(data.eggQuantity) || 0;
    this.unitPrice = Number(data.unitPrice) || 0;
    this.totalCost = Number(data.totalCost) || 0;
    this.amountPaid = Number(data.amountPaid) || 0;
    this.cashPaid = Number(data.cashPaid) || 0;
    this.bankPaid = Number(data.bankPaid) || 0;
    this.dueAmount = Number(data.dueAmount) || 0;
    this.paymentMethod = data.paymentMethod || 'CASH';
    this.paymentStatus = data.paymentStatus || 'PAID';
    this.invoiceNumber = data.invoiceNumber || '';
    this.purchaseDate = data.purchaseDate || new Date();
    this.restockType = data.restockType || 'NEW_STOCK';
    this.notes = data.notes || '';
    this.createdBy = data.createdBy || 'Shop Admin';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
