import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class EasypaisaOrder extends BaseMySQLModel {
  static tableName = 'easypaisa_orders';
  static jsonFields = ['items', 'shippingDetails'];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.customerId = data.customerId || null;
    this.customerName = data.customerName || '';
    this.customerPhone = data.customerPhone || '';
    this.customerEmail = data.customerEmail || '';
    this.items = Array.isArray(data.items)
      ? data.items
      : (typeof data.items === 'string' ? JSON.parse(data.items || '[]') : []);
    this.totalAmount = Number(data.totalAmount) || 0;
    this.shippingDetails = data.shippingDetails && typeof data.shippingDetails === 'object'
      ? data.shippingDetails
      : (typeof data.shippingDetails === 'string' ? JSON.parse(data.shippingDetails || '{}') : {});
    this.paymentMethod = data.paymentMethod || 'EASYPAISA';
    this.paymentStatus = data.paymentStatus || 'PENDING';
    this.orderStatus = data.orderStatus || 'PROCESSING';
    this.transactionId = data.transactionId || '';
    this.senderNumber = data.senderNumber || '';
    this.paymentProof = data.paymentProof || '';
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
