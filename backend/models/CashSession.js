import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class CashSession extends BaseMySQLModel {
  static tableName = 'cash_sessions';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.cashierId = data.cashierId || '';
    this.startTime = data.startTime || new Date();
    this.endTime = data.endTime || null;
    this.openingCash = Number(data.openingCash) || 0;
    this.closingCash = Number(data.closingCash) || 0;
    this.totalSales = Number(data.totalSales) || 0;
    this.totalReturns = Number(data.totalReturns) || 0;
    this.expectedCash = Number(data.expectedCash) || 0;
    this.actualCash = Number(data.actualCash) || 0;
    this.cashDifference = Number(data.cashDifference) || 0;
    this.status = data.status || 'active';
    this.notes = data.notes || '';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
