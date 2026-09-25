import bcrypt from 'bcryptjs';
import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Customer extends BaseMySQLModel {
  static tableName = 'customers';
  static jsonFields = ['cart'];

  constructor(data = {}) {
    super(data);
    this.fullName = data.fullName || '';
    this.email = data.email || '';
    this.password = data.password || '';
    this.phone = data.phone || '';
    this.address = data.address || '';
    this.shopId = data.shopId || '';
    this.cart = Array.isArray(data.cart) ? data.cart : (typeof data.cart === 'string' ? JSON.parse(data.cart || '[]') : []);
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async comparePassword(candidatePassword) {
    if (!candidatePassword || !this.password) return false;
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      return candidatePassword === this.password;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  }

  async save() {
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      try {
        this.password = await bcrypt.hash(this.password, 10);
      } catch (err) {
        console.error('Customer password hash error:', err);
      }
    }
    return await super.save();
  }
}
