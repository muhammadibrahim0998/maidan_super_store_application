import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Settings extends BaseMySQLModel {
  static tableName = 'settings';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.shopName = data.shopName || 'Maidan Perfume Shop';
    this.address = data.address || '';
    this.phone = data.phone || '';
    this.email = data.email || '';
    this.currency = data.currency || 'Rs.';
    this.logoUrl = data.logoUrl || '';
    this.ownerPassword = data.ownerPassword || '123456';
    this.taxRate = Number(data.taxRate) || 0;
    this.ownerFullName = data.ownerFullName || '';
    this.ownerEmail = data.ownerEmail || '';
    this.ownerPhone = data.ownerPhone || '';
    this.easypaisaNumber = data.easypaisaNumber || '';
    this.easypaisaEnabled = data.easypaisaEnabled ? 1 : 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
