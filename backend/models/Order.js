import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Order extends BaseMySQLModel {
  static tableName = 'orders';
  static jsonFields = ['items', 'shippingDetails'];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.customerId = data.customerId || '';
    this.items = Array.isArray(data.items) ? data.items : (typeof data.items === 'string' ? JSON.parse(data.items || '[]') : []);
    this.totalAmount = Number(data.totalAmount) || 0;
    this.shippingDetails = data.shippingDetails && typeof data.shippingDetails === 'object'
      ? data.shippingDetails
      : (typeof data.shippingDetails === 'string' ? JSON.parse(data.shippingDetails || '{}') : {});
    this.paymentMethod = data.paymentMethod || 'COD';
    this.paymentStatus = data.paymentStatus || 'PENDING';
    this.orderStatus = data.orderStatus || 'PROCESSING';
    this.transactionId = data.transactionId || '';
    this.paymentProof = data.paymentProof || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
