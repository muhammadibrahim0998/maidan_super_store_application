import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Expense extends BaseMySQLModel {
  static tableName = 'expenses';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.title = data.title || '';
    this.category = data.category || 'Other';
    this.amount = Number(data.amount) || 0;
    this.paymentMethod = data.paymentMethod || 'CASH';
    this.paymentSource = data.paymentSource || 'CASH';
    this.expenseDate = data.expenseDate || new Date();
    this.notes = data.notes || '';
    this.createdBy = data.createdBy || 'Shop Admin';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
