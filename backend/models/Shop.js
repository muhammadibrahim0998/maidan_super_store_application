import { BaseMySQLModel } from './BaseMySQLModel.js';

export default class Shop extends BaseMySQLModel {
  static tableName = 'shops';
  static jsonFields = [];

  constructor(data = {}) {
    super(data);
    this.name = data.name || 'Perfume Shop Center Hayaseri';
    this.address = data.address || '';
    this.status = data.status || 'active';
    this.contactNumber = data.contactNumber || '';
    this.logoUrl = data.logoUrl || '';
    this.ownerFullName = data.ownerFullName || (data.ownerDetails?.fullName || '');
    this.ownerEmail = data.ownerEmail || (data.ownerDetails?.email || '');
    this.ownerPhone = data.ownerPhone || (data.ownerDetails?.phone || '');
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  // Backwards-compatibility for ownerDetails getter/setter
  get ownerDetails() {
    return {
      fullName: this.ownerFullName,
      email: this.ownerEmail,
      phone: this.ownerPhone
    };
  }

  set ownerDetails(val) {
    if (val && typeof val === 'object') {
      this.ownerFullName = val.fullName || this.ownerFullName;
      this.ownerEmail = val.email || this.ownerEmail;
      this.ownerPhone = val.phone || this.ownerPhone;
    }
  }
}
