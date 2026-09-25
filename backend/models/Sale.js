import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Sale extends BaseMySQLModel {
  static tableName = 'sales';
  static jsonFields = ['items'];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.totalAmount = Number(data.totalAmount) || 0;
    this.totalProfit = Number(data.totalProfit) || 0;
    this.serialNumber = Number(data.serialNumber) || 0;
    this.invoiceNumber = data.invoiceNumber || '';
    this.saleDate = data.saleDate || new Date();
    this.status = data.status || 'completed';
    this.returnReason = data.returnReason || '';
    this.cashierId = data.cashierId || '';
    this.cashierName = data.cashierName || '';
    this.customerName = data.customerName || '';
    this.customerPhone = data.customerPhone || '';
    this.paymentMethod = data.paymentMethod || 'CASH';
    this.cashPaid = Number(data.cashPaid) || 0;
    this.bankPaid = Number(data.bankPaid) || 0;
    this.dueAmount = Number(data.dueAmount) || 0;
    this.paymentReceipt = data.paymentReceipt || '';
    this.paymentProof = data.paymentProof || '';
    this.transactionId = data.transactionId || '';
    this.isCredit = data.isCredit ? 1 : 0;
    this.orderId = data.orderId || '';
    this.customerId = data.customerId || '';
    this.customerEmail = data.customerEmail || '';
    this.isOnlineOrder = data.isOnlineOrder ? 1 : 0;
    this.orderSource = data.orderSource || 'WALK_IN_POS';
    this.approvalStatus = data.approvalStatus || 'APPROVED';
    this.items = Array.isArray(data.items) ? data.items : (typeof data.items === 'string' ? JSON.parse(data.items || '[]') : []);
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
