import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class DamagedProduct extends BaseMySQLModel {
  static tableName = 'damaged_products';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.shopId = data.shopId || '';
    this.productName = data.productName || '';
    this.productId = data.productId || '';
    this.quantity = Number(data.quantity) || 0;
    this.petiQuantity = Number(data.petiQuantity) || 0;
    this.trayQuantity = Number(data.trayQuantity) || 0;
    this.eggQuantity = Number(data.eggQuantity) || 0;
    this.unitType = data.unitType || 'single';
    this.deductedEggs = Number(data.deductedEggs) || 0;
    this.unitPrice = Number(data.unitPrice) || 0;
    this.totalLoss = Number(data.totalLoss) || 0;
    this.reason = data.reason || 'Defective Stock';
    this.damageDate = data.damageDate || new Date();
    this.notes = data.notes || '';
    this.reportedBy = data.reportedBy || 'Shop Admin';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
