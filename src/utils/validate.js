'use strict';

const { badRequest } = require('./httpError');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Minimal declarative body validator. Each rule is
 *   { type: 'string'|'int'|'number'|'boolean'|'uuid'|'array'|'object'|'enum',
 *     required, min, max, pattern, values, trim }
 * Unknown keys are dropped. Returns the cleaned object or throws 400.
 */
function validate(input, schema, { partial = false } = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const out = {};
  const errors = {};

  for (const [key, rule] of Object.entries(schema)) {
    let value = source[key];
    if (value === undefined || value === null || value === '') {
      if (rule.required && !partial) errors[key] = 'is required';
      else if (value === null && rule.nullable) out[key] = null;
      continue;
    }

    const fail = (msg) => { errors[key] = msg; };
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') { fail('must be a string'); break; }
        if (rule.trim !== false) value = value.trim();
        if (rule.min !== undefined && value.length < rule.min) { fail(`must be at least ${rule.min} characters`); break; }
        if (rule.max !== undefined && value.length > rule.max) { fail(`must be at most ${rule.max} characters`); break; }
        if (rule.pattern && !rule.pattern.test(value)) { fail(rule.patternMessage || 'has an invalid format'); break; }
        out[key] = value;
        break;
      case 'int':
      case 'number': {
        const n = typeof value === 'string' ? Number(value) : value;
        if (typeof n !== 'number' || !Number.isFinite(n)) { fail('must be a number'); break; }
        if (rule.type === 'int' && !Number.isInteger(n)) { fail('must be an integer'); break; }
        if (rule.min !== undefined && n < rule.min) { fail(`must be >= ${rule.min}`); break; }
        if (rule.max !== undefined && n > rule.max) { fail(`must be <= ${rule.max}`); break; }
        out[key] = n;
        break;
      }
      case 'boolean':
        if (typeof value === 'boolean') out[key] = value;
        else if (value === 'true' || value === 'false') out[key] = value === 'true';
        else fail('must be a boolean');
        break;
      case 'uuid':
        if (typeof value !== 'string' || !UUID_RE.test(value)) fail('must be a UUID');
        else out[key] = value;
        break;
      case 'enum':
        if (!rule.values.includes(value)) fail(`must be one of: ${rule.values.join(', ')}`);
        else out[key] = value;
        break;
      case 'array':
        if (!Array.isArray(value)) fail('must be an array');
        else if (rule.max !== undefined && value.length > rule.max) fail(`must have at most ${rule.max} items`);
        else if (rule.items) {
          const itemErr = value.map(rule.items).find(Boolean);
          if (itemErr) fail(itemErr);
          else out[key] = value;
        } else out[key] = value;
        break;
      case 'date': {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) fail('must be an ISO-8601 date');
        else out[key] = d;
        break;
      }
      default:
        throw new Error(`Unknown validation type ${rule.type}`);
    }
  }

  if (Object.keys(errors).length) throw badRequest('Validation failed', errors);
  return out;
}

function assertUuid(value, name = 'id') {
  if (typeof value !== 'string' || !UUID_RE.test(value)) throw badRequest(`${name} must be a UUID`);
  return value;
}

function pagination(query, { defaultLimit = 20, maxLimit = 100 } = {}) {
  const { limit, offset } = validate(query, {
    limit: { type: 'int', min: 1, max: maxLimit },
    offset: { type: 'int', min: 0 },
  });
  return { limit: limit ?? defaultLimit, offset: offset ?? 0 };
}

module.exports = { validate, assertUuid, pagination, UUID_RE };
