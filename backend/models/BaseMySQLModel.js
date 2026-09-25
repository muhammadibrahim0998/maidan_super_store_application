import { pool } from '../config/mysql.js';

/**
 * Cache table columns to prevent "Unknown column" errors when frontend sends extraneous fields
 */
const tableColumnsCache = new Map();

export async function getTableColumns(tableName) {
  if (tableColumnsCache.has(tableName)) {
    return tableColumnsCache.get(tableName);
  }
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM \`${tableName}\``);
    const columnSet = new Set(cols.map(c => c.Field));
    tableColumnsCache.set(tableName, columnSet);
    return columnSet;
  } catch (err) {
    console.error(`Error fetching columns for table ${tableName}:`, err);
    return new Set();
  }
}

/**
 * Build SQL WHERE clause from Mongo-like filter object
 */
export function parseMongoFilter(filter = {}, tableName = '') {
  if (!filter || typeof filter !== 'object' || Object.keys(filter).length === 0) {
    return { whereClause: '1=1', params: [] };
  }

  const conditions = [];
  const params = [];

  for (const [key, val] of Object.entries(filter)) {
    if (key === '$or' && Array.isArray(val)) {
      const orParts = [];
      for (const subFilter of val) {
        const parsed = parseMongoFilter(subFilter, tableName);
        if (parsed.whereClause && parsed.whereClause !== '1=1') {
          orParts.push(`(${parsed.whereClause})`);
          params.push(...parsed.params);
        }
      }
      if (orParts.length > 0) {
        conditions.push(`(${orParts.join(' OR ')})`);
      }
      continue;
    }

    if (key === '$and' && Array.isArray(val)) {
      const andParts = [];
      for (const subFilter of val) {
        const parsed = parseMongoFilter(subFilter, tableName);
        if (parsed.whereClause && parsed.whereClause !== '1=1') {
          andParts.push(`(${parsed.whereClause})`);
          params.push(...parsed.params);
        }
      }
      if (andParts.length > 0) {
        conditions.push(`(${andParts.join(' AND ')})`);
      }
      continue;
    }

    // Translate _id to id
    const col = key === '_id' ? 'id' : key;

    // Handle nested operators
    if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
      if ('$regex' in val) {
        let pattern = val.$regex;
        if (pattern instanceof RegExp) pattern = pattern.source;
        pattern = String(pattern).replace(/^\^/, '').replace(/\$$/, '');
        conditions.push(`LOWER(\`${col}\`) LIKE LOWER(?)`);
        params.push(`%${pattern}%`);
      } else if ('$in' in val && Array.isArray(val.$in)) {
        if (val.$in.length === 0) {
          conditions.push('1=0');
        } else {
          const placeholders = val.$in.map(() => '?').join(', ');
          conditions.push(`\`${col}\` IN (${placeholders})`);
          params.push(...val.$in.map(v => (v && v._id ? v._id : v)));
        }
      } else if ('$nin' in val && Array.isArray(val.$nin)) {
        if (val.$nin.length > 0) {
          const placeholders = val.$nin.map(() => '?').join(', ');
          conditions.push(`\`${col}\` NOT IN (${placeholders})`);
          params.push(...val.$nin.map(v => (v && v._id ? v._id : v)));
        }
      } else if ('$ne' in val) {
        if (val.$ne === null) {
          conditions.push(`\`${col}\` IS NOT NULL`);
        } else {
          conditions.push(`(\`${col}\` != ? OR \`${col}\` IS NULL)`);
          params.push(val.$ne);
        }
      } else if ('$gt' in val) {
        conditions.push(`\`${col}\` > ?`);
        params.push(val.$gt);
      } else if ('$gte' in val) {
        conditions.push(`\`${col}\` >= ?`);
        params.push(val.$gte);
      } else if ('$lt' in val) {
        conditions.push(`\`${col}\` < ?`);
        params.push(val.$lt);
      } else if ('$lte' in val) {
        conditions.push(`\`${col}\` <= ?`);
        params.push(val.$lte);
      } else if ('$exists' in val) {
        if (val.$exists) {
          conditions.push(`\`${col}\` IS NOT NULL`);
        } else {
          conditions.push(`\`${col}\` IS NULL`);
        }
      } else {
        conditions.push(`\`${col}\` = ?`);
        params.push(JSON.stringify(val));
      }
    } else if (val === null) {
      conditions.push(`\`${col}\` IS NULL`);
    } else if (val instanceof RegExp) {
      let pattern = val.source.replace(/^\^/, '').replace(/\$$/, '');
      conditions.push(`LOWER(\`${col}\`) LIKE LOWER(?)`);
      params.push(`%${pattern}%`);
    } else {
      conditions.push(`\`${col}\` = ?`);
      params.push(val && val._id ? val._id : val);
    }
  }

  return {
    whereClause: conditions.length > 0 ? conditions.join(' AND ') : '1=1',
    params
  };
}

/**
 * Query Builder supporting .sort(), .select(), .skip(), .limit(), .populate(), .lean(), and await
 */
export class MySQLQueryBuilder {
  constructor(model, filter = {}, single = false) {
    this.model = model;
    this.filter = filter;
    this.single = single;
    this._sort = '';
    this._fields = '*';
    this._skip = 0;
    this._limit = single ? 1 : null;
    this._isLean = false;
  }

  sort(sortOptions) {
    if (!sortOptions) return this;
    if (typeof sortOptions === 'string') {
      const parts = sortOptions.trim().split(/\s+/);
      const clauses = parts.map(p => {
        if (p.startsWith('-')) {
          const field = p.substring(1) === '_id' ? 'id' : p.substring(1);
          return `\`${field}\` DESC`;
        }
        const field = p === '_id' ? 'id' : p;
        return `\`${field}\` ASC`;
      });
      this._sort = clauses.join(', ');
    } else if (typeof sortOptions === 'object') {
      const clauses = Object.entries(sortOptions).map(([k, dir]) => {
        const field = k === '_id' ? 'id' : k;
        const d = (dir === -1 || dir === 'desc' || dir === 'DESC') ? 'DESC' : 'ASC';
        return `\`${field}\` ${d}`;
      });
      this._sort = clauses.join(', ');
    }
    return this;
  }

  select(fields) {
    if (!fields) return this;
    if (typeof fields === 'string') {
      const parts = fields.trim().split(/\s+/);
      const isExclude = parts.some(p => p.startsWith('-'));
      if (!isExclude) {
        const cols = parts.map(p => (p === '_id' ? 'id' : `\`${p}\``));
        if (!cols.includes('id') && !cols.includes('`id`')) {
          cols.unshift('id');
        }
        this._fields = cols.join(', ');
      }
    }
    return this;
  }

  skip(n) {
    this._skip = Math.max(0, parseInt(n, 10) || 0);
    return this;
  }

  limit(n) {
    this._limit = Math.max(1, parseInt(n, 10) || 1);
    return this;
  }

  populate() {
    return this;
  }

  lean() {
    this._isLean = true;
    return this;
  }

  async exec() {
    const { whereClause, params } = parseMongoFilter(this.filter, this.model.tableName);
    let sql = `SELECT ${this._fields} FROM \`${this.model.tableName}\` WHERE ${whereClause}`;
    
    if (this._sort) {
      sql += ` ORDER BY ${this._sort}`;
    }

    if (this._limit !== null) {
      sql += ` LIMIT ${this._limit}`;
      if (this._skip > 0) {
        sql += ` OFFSET ${this._skip}`;
      }
    } else if (this._skip > 0) {
      sql += ` LIMIT 18446744073709551615 OFFSET ${this._skip}`;
    }

    const [rows] = await pool.query(sql, params);

    if (this.single) {
      if (!rows || rows.length === 0) return null;
      const doc = this.model.hydrate(rows[0]);
      return this._isLean ? doc.toObject() : doc;
    }

    const docs = rows.map(r => {
      const doc = this.model.hydrate(r);
      return this._isLean ? doc.toObject() : doc;
    });

    return docs;
  }

  then(resolve, reject) {
    return this.exec().then(resolve, reject);
  }

  catch(reject) {
    return this.exec().catch(reject);
  }
}

/**
 * Base MySQL Model Class with Dynamic Column Filtering
 */
export class BaseMySQLModel {
  static tableName = '';
  static jsonFields = [];
  static primaryKey = 'id';

  constructor(data = {}) {
    Object.assign(this, data);
    if (data.id !== undefined && data.id !== null && data.id !== '') {
      this.id = Number(data.id) || data.id;
      this._id = String(this.id);
    } else if (data._id !== undefined && data._id !== null && data._id !== '') {
      this.id = Number(data._id) || data._id;
      this._id = String(this.id);
    }
  }

  toObject() {
    const obj = { ...this };
    if (this.id !== undefined) {
      obj.id = this.id;
      obj._id = String(this.id);
    }
    // ensure JSON fields are parsed objects/arrays
    for (const jf of this.constructor.jsonFields) {
      if (typeof obj[jf] === 'string') {
        try { obj[jf] = JSON.parse(obj[jf]); } catch {}
      }
    }
    return obj;
  }

  toJSON() {
    return this.toObject();
  }

  static hydrate(rawRow) {
    if (!rawRow) return null;
    const data = { ...rawRow };
    data._id = String(data.id);

    // Parse JSON columns
    for (const field of this.jsonFields) {
      if (typeof data[field] === 'string') {
        try {
          data[field] = JSON.parse(data[field]);
        } catch {
          data[field] = field === 'cart' || field === 'images' || field === 'items' || field === 'changes' ? [] : {};
        }
      }
    }

    return new this(data);
  }

  async save() {
    const data = { ...this };

    // Serialize JSON fields
    for (const jf of this.constructor.jsonFields) {
      if (data[jf] !== undefined && typeof data[jf] !== 'string') {
        data[jf] = JSON.stringify(data[jf]);
      }
    }

    delete data._id; // virtual property

    const hasExplicitId = data.id !== undefined && data.id !== null && data.id !== '';

    // Fetch valid columns for this table to prevent Unknown Column errors
    const validColumns = await getTableColumns(this.constructor.tableName);

    const keys = Object.keys(data).filter(k => {
      if (typeof data[k] === 'function') return false;
      if (!hasExplicitId && k === 'id') return false;
      // If column cache is available, only allow real table columns
      if (validColumns.size > 0 && !validColumns.has(k)) return false;
      return true;
    });

    const cols = keys.map(k => `\`${k}\``).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const updateClauses = keys.filter(k => k !== 'id' && k !== 'createdAt').map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');

    const values = keys.map(k => data[k]);

    const sql = `
      INSERT INTO \`${this.constructor.tableName}\` (${cols})
      VALUES (${placeholders})
      ON DUPLICATE KEY UPDATE ${updateClauses || '`id` = `id`'};
    `;

    const [result] = await pool.query(sql, values);

    if (!hasExplicitId && result.insertId) {
      this.id = result.insertId;
      this._id = String(result.insertId);
    } else if (hasExplicitId) {
      this._id = String(this.id);
    }

    return this;
  }

  static find(filter = {}) {
    return new MySQLQueryBuilder(this, filter, false);
  }

  static findOne(filter = {}) {
    return new MySQLQueryBuilder(this, filter, true);
  }

  static findById(id) {
    if (!id || id === 'undefined' || id === 'null') {
      return new MySQLQueryBuilder(this, { id: -1 }, true);
    }
    const numId = /^\d+$/.test(String(id)) ? parseInt(id, 10) : id;
    return new MySQLQueryBuilder(this, { id: numId }, true);
  }

  static async create(docOrDocs) {
    if (Array.isArray(docOrDocs)) {
      const created = [];
      for (const d of docOrDocs) {
        const item = new this(d);
        await item.save();
        created.push(item);
      }
      return created;
    }
    const item = new this(docOrDocs);
    await item.save();
    return item;
  }

  static async findByIdAndUpdate(id, update = {}, options = { new: true }) {
    if (!id) return null;
    const existing = await this.findById(id);
    if (!existing) return null;

    let updateData = update;
    if (update.$set) {
      updateData = { ...updateData, ...update.$set };
    }

    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        existing[k] = (Number(existing[k]) || 0) + Number(v);
      }
    }

    Object.assign(existing, updateData);
    delete existing.$set;
    delete existing.$inc;

    await existing.save();

    return options.new === false ? existing : (await this.findById(existing.id));
  }

  static async findOneAndUpdate(filter = {}, update = {}, options = { new: true }) {
    const existing = await this.findOne(filter);
    if (!existing) return null;

    let updateData = update;
    if (update.$set) {
      updateData = { ...updateData, ...update.$set };
    }

    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        existing[k] = (Number(existing[k]) || 0) + Number(v);
      }
    }

    Object.assign(existing, updateData);
    delete existing.$set;
    delete existing.$inc;

    await existing.save();

    return options.new === false ? existing : (await this.findById(existing.id));
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const existing = await this.findById(id);
    if (!existing) return null;

    await pool.query(`DELETE FROM \`${this.tableName}\` WHERE id = ?`, [existing.id]);
    return existing;
  }

  static async findOneAndDelete(filter = {}) {
    const existing = await this.findOne(filter);
    if (!existing) return null;

    await pool.query(`DELETE FROM \`${this.tableName}\` WHERE id = ?`, [existing.id]);
    return existing;
  }

  static async deleteOne(filter = {}) {
    const existing = await this.findOne(filter);
    if (!existing) return { deletedCount: 0, acknowledged: true };

    await pool.query(`DELETE FROM \`${this.tableName}\` WHERE id = ?`, [existing.id]);
    return { deletedCount: 1, acknowledged: true };
  }

  static async deleteMany(filter = {}) {
    const { whereClause, params } = parseMongoFilter(filter, this.tableName);
    const [result] = await pool.query(`DELETE FROM \`${this.tableName}\` WHERE ${whereClause}`, params);
    return { deletedCount: result.affectedRows || 0, acknowledged: true };
  }

  static async updateOne(filter = {}, update = {}) {
    const existing = await this.findOne(filter);
    if (!existing) return { matchedCount: 0, modifiedCount: 0, acknowledged: true };

    let updateData = update;
    if (update.$set) {
      updateData = { ...updateData, ...update.$set };
    }
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        existing[k] = (Number(existing[k]) || 0) + Number(v);
      }
    }

    Object.assign(existing, updateData);
    delete existing.$set;
    delete existing.$inc;

    await existing.save();

    return { matchedCount: 1, modifiedCount: 1, acknowledged: true };
  }

  static async updateMany(filter = {}, update = {}) {
    const list = await this.find(filter);
    let modifiedCount = 0;
    for (const item of list) {
      let updateData = update;
      if (update.$set) updateData = { ...updateData, ...update.$set };
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc)) {
          item[k] = (Number(item[k]) || 0) + Number(v);
        }
      }
      Object.assign(item, updateData);
      delete item.$set;
      delete item.$inc;
      await item.save();
      modifiedCount++;
    }
    return { matchedCount: list.length, modifiedCount, acknowledged: true };
  }

  static async countDocuments(filter = {}) {
    const { whereClause, params } = parseMongoFilter(filter, this.tableName);
    const [rows] = await pool.query(`SELECT COUNT(*) as count FROM \`${this.tableName}\` WHERE ${whereClause}`, params);
    return rows && rows[0] ? Number(rows[0].count) : 0;
  }
}
