// ============================================
// DYNAMIC SQL QUERY BUILDER UTILITY
// ============================================
// Builds parameterized WHERE clauses from a
// plain JavaScript filters object.
//
// Handles:
//   - ILIKE string search (case-insensitive)
//   - Date range (startDate / endDate)
//   - Array values (IN clause)
//   - Boolean values
//   - Exact match
//   - NULL checks
//
// All output is parameterized ($1, $2, …) to
// prevent SQL injection — no raw interpolation.
//
// Usage:
//   const { whereClause, values, paramCount } = buildWhereClause(filters, fieldMap);

/**
 * Build a parameterized WHERE clause from a filters object.
 *
 * @param {Object} filters   - Key-value pairs of filter fields
 * @param {Object} fieldMap  - Maps filter keys → { column, type }
 *   type can be: 'ilike', 'exact', 'gte', 'lte', 'boolean', 'array', 'date_gte', 'date_lte'
 * @param {number} [startParam=1] - Starting parameter index ($n)
 * @returns {{ whereClause: string, values: Array, paramCount: number }}
 *
 * @example
 *   const fieldMap = {
 *     keyword:   { column: 'u.full_name', type: 'ilike' },
 *     status:    { column: 'sr.status',   type: 'array' },   // accepts single or array
 *     is_active: { column: 'u.is_active', type: 'boolean' },
 *     startDate: { column: 'u.created_at', type: 'date_gte' },
 *     endDate:   { column: 'u.created_at', type: 'date_lte' },
 *     min_rating:{ column: 'mp.rating',    type: 'gte' },
 *   };
 *
 *   const { whereClause, values, paramCount } = buildWhereClause(
 *     { keyword: 'ram', status: ['pending','accepted'], is_active: true },
 *     fieldMap
 *   );
 *   // whereClause: "WHERE u.full_name ILIKE $1 AND sr.status IN ($2, $3) AND u.is_active = $4"
 *   // values: ['%ram%', 'pending', 'accepted', true]
 *   // paramCount: 4
 */
const buildWhereClause = (filters, fieldMap, startParam = 1) => {
  const conditions = [];
  const values = [];
  let paramIndex = startParam;

  for (const [key, mapping] of Object.entries(fieldMap)) {
    const filterValue = filters[key];

    // Skip undefined, null, and empty strings
    if (filterValue === undefined || filterValue === null || filterValue === '') {
      continue;
    }

    const { column, type } = mapping;

    switch (type) {
      // ── Case-insensitive LIKE search ──
      case 'ilike': {
        conditions.push(`${column} ILIKE $${paramIndex++}`);
        values.push(`%${filterValue}%`);
        break;
      }

      // ── Multi-column ILIKE (OR across multiple columns) ──
      case 'ilike_multi': {
        // column is an array of column names
        const cols = Array.isArray(column) ? column : [column];
        const orParts = cols.map((col) => `${col} ILIKE $${paramIndex}`);
        conditions.push(`(${orParts.join(' OR ')})`);
        values.push(`%${filterValue}%`);
        paramIndex++;
        break;
      }

      // ── Exact match ──
      case 'exact': {
        conditions.push(`${column} = $${paramIndex++}`);
        values.push(filterValue);
        break;
      }

      // ── Greater than or equal (numeric) ──
      case 'gte': {
        const num = parseFloat(filterValue);
        if (!isNaN(num)) {
          conditions.push(`${column} >= $${paramIndex++}`);
          values.push(num);
        }
        break;
      }

      // ── Less than or equal (numeric) ──
      case 'lte': {
        const num = parseFloat(filterValue);
        if (!isNaN(num)) {
          conditions.push(`${column} <= $${paramIndex++}`);
          values.push(num);
        }
        break;
      }

      // ── Boolean ──
      case 'boolean': {
        // Accept string "true"/"false" or actual booleans
        const boolVal =
          filterValue === 'true' || filterValue === true
            ? true
            : filterValue === 'false' || filterValue === false
              ? false
              : null;

        if (boolVal !== null) {
          conditions.push(`${column} = $${paramIndex++}`);
          values.push(boolVal);
        }
        break;
      }

      // ── Array / IN clause ──
      // Accepts a single value or an array of values
      case 'array': {
        const arr = Array.isArray(filterValue) ? filterValue : [filterValue];
        if (arr.length > 0) {
          const placeholders = arr.map(() => `$${paramIndex++}`);
          conditions.push(`${column} IN (${placeholders.join(', ')})`);
          values.push(...arr);
        }
        break;
      }

      // ── Date range: greater than or equal ──
      case 'date_gte': {
        conditions.push(`${column} >= $${paramIndex++}`);
        values.push(filterValue);
        break;
      }

      // ── Date range: less than or equal ──
      case 'date_lte': {
        conditions.push(`${column} <= $${paramIndex++}`);
        values.push(filterValue);
        break;
      }

      // ── NULL check ──
      case 'is_null': {
        const isNull =
          filterValue === 'true' || filterValue === true;
        conditions.push(
          isNull ? `${column} IS NULL` : `${column} IS NOT NULL`
        );
        // No parameter needed
        break;
      }

      // ── Array contains (PostgreSQL ANY) ──
      case 'array_contains': {
        conditions.push(`$${paramIndex++} = ANY(${column})`);
        values.push(filterValue);
        break;
      }

      default:
        // Unknown type — skip silently
        break;
    }
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  return {
    whereClause,
    values,
    paramCount: paramIndex - 1,
  };
};

module.exports = { buildWhereClause };
