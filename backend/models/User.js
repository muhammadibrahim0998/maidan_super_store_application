import bcrypt from 'bcryptjs';
import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class User extends BaseMySQLModel {
  static tableName = 'users';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.username = data.username;
    this.password = data.password;
    this.fullName = data.fullName || data.username || '';
    this.role = data.role || 'shop_admin';
    this.shopId = data.shopId || '';
    this.status = data.status || 'active';
    this.preferredShift = data.preferredShift || 'both';
    this.phoneNumber = data.phoneNumber || '';
    this.email = data.email || '';
    this.lastLogged = data.lastLogged || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async comparePassword(candidatePassword) {
    if (!candidatePassword || !this.password) return false;
    // Check if stored password is plain text or bcrypt hash
    if (!this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      return candidatePassword === this.password;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  }

  async save() {
    // Hash password if modified / plain text
    if (this.password && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      try {
        this.password = await bcrypt.hash(this.password, 10);
      } catch (err) {
        console.error('Password hash error:', err);
      }
    }
    return await super.save();
  }
}
