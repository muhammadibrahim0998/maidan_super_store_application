import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class SystemUpdate extends BaseMySQLModel {
  static tableName = 'system_updates';
  static jsonFields = ['changes'];

  constructor(data = {}) {
    super(data);
    this.version = data.version || '1.0.0';
    this.title = data.title || '';
    this.description = data.description || '';
    this.releaseDate = data.releaseDate || new Date();
    this.isCritical = data.isCritical ? 1 : 0;
    this.changes = Array.isArray(data.changes) ? data.changes : (typeof data.changes === 'string' ? JSON.parse(data.changes || '[]') : []);
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }
}
