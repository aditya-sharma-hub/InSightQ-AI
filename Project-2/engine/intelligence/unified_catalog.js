/**
 * InsightIQ AI — Phase D: Unified Data Catalog & Relationship Registry
 * Catalogs tabular datasets and document collections with provenance, versioning,
 * schema definitions, and explicit validated relationships.
 * Strictly enforces tenant boundaries and prevents unverified automatic joins.
 */

class AccessDeniedError extends Error {
  constructor(message = 'Access Denied: You do not have permission to access this resource.') {
    super(message);
    this.name = 'AccessDeniedError';
    this.status = 403;
  }
}

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

class UnifiedCatalog {
  constructor() {
    // In-memory catalog stores keyed by sourceId and relationshipId
    this.sources = new Map();
    this.relationships = new Map();
  }

  /**
   * Register or update a data source (tabular dataset or document collection)
   */
  registerSource(source) {
    if (!source || !source.id) {
      throw new ValidationError('Source must have a valid id.');
    }
    if (!source.name || typeof source.name !== 'string') {
      throw new ValidationError('Source must have a valid name.');
    }
    if (!source.type || !['tabular', 'document'].includes(source.type)) {
      throw new ValidationError('Source type must be either "tabular" or "document".');
    }
    if (!source.ownerId) {
      throw new ValidationError('Source must specify an ownerId for tenant isolation.');
    }

    const sourceRecord = {
      id: String(source.id),
      name: source.name.trim(),
      type: source.type,
      ownerId: String(source.ownerId),
      version: source.version || 'v1.0',
      status: source.status || 'ready',
      provenance: {
        filename: source.provenance?.filename || source.name,
        format: source.provenance?.format || (source.type === 'tabular' ? 'csv' : 'pdf'),
        checksum: source.provenance?.checksum || null,
        importedAt: source.provenance?.importedAt || new Date().toISOString(),
        rowCount: source.provenance?.rowCount ?? (source.rows ? source.rows.length : null),
        pageCount: source.provenance?.pageCount ?? null,
        byteSize: source.provenance?.byteSize ?? null
      },
      schema: {
        columns: Array.isArray(source.schema?.columns) ? source.schema.columns : [],
        identifiedKeys: Array.isArray(source.schema?.identifiedKeys) ? source.schema.identifiedKeys : [],
        entities: Array.isArray(source.schema?.entities) ? source.schema.entities : []
      },
      // In-memory raw data references when provided
      rows: Array.isArray(source.rows) ? source.rows : null,
      documentData: source.documentData || null,
      metadata: source.metadata || {},
      registeredAt: new Date().toISOString()
    };

    this.sources.set(sourceRecord.id, sourceRecord);
    return sourceRecord;
  }

  /**
   * Retrieve a data source verifying user authorization
   */
  getSource(sourceId, userId = null) {
    const sId = String(sourceId);
    const source = this.sources.get(sId);
    if (!source) {
      return null;
    }

    // Verify tenant authorization
    if (userId && String(source.ownerId) !== String(userId)) {
      throw new AccessDeniedError(`User "${userId}" is not authorized to access source "${sourceId}".`);
    }

    return source;
  }

  /**
   * List all data sources belonging to an authorized user
   */
  listSources(userId) {
    if (!userId) {
      throw new ValidationError('userId is required to list catalog sources.');
    }
    const uId = String(userId);
    return Array.from(this.sources.values())
      .filter(s => String(s.ownerId) === uId)
      .map(s => ({
        id: s.id,
        name: s.name,
        type: s.type,
        version: s.version,
        status: s.status,
        provenance: s.provenance,
        columnCount: s.schema.columns.length,
        columns: s.schema.columns.map(c => typeof c === 'string' ? c : c.column_name || c.name),
        registeredAt: s.registeredAt
      }));
  }

  /**
   * Register an explicit, validated relationship between two sources
   * RULE: Never join unrelated data merely because column names look similar.
   */
  registerRelationship(rel, userId) {
    if (!rel || !rel.sourceAId || !rel.sourceBId || !rel.keyA || !rel.keyB) {
      throw new ValidationError('Relationship requires sourceAId, sourceBId, keyA, and keyB.');
    }
    if (String(rel.sourceAId) === String(rel.sourceBId)) {
      throw new ValidationError('Cannot register relationship between a source and itself.');
    }

    // Verify both sources exist and are owned by the requesting user
    const sourceA = this.getSource(rel.sourceAId, userId);
    const sourceB = this.getSource(rel.sourceBId, userId);

    if (!sourceA) {
      throw new ValidationError(`Source A "${rel.sourceAId}" not found in user catalog.`);
    }
    if (!sourceB) {
      throw new ValidationError(`Source B "${rel.sourceBId}" not found in user catalog.`);
    }

    // Verify keyA exists in Source A
    const colsA = sourceA.schema.columns.map(c => (typeof c === 'string' ? c : c.column_name || c.name || '').toLowerCase());
    if (sourceA.type === 'tabular' && !colsA.includes(String(rel.keyA).toLowerCase())) {
      throw new ValidationError(`Key "${rel.keyA}" does not exist in Source A ("${sourceA.name}").`);
    }

    // Verify keyB exists in Source B (column in tabular, or entity/field in document)
    if (sourceB.type === 'tabular') {
      const colsB = sourceB.schema.columns.map(c => (typeof c === 'string' ? c : c.column_name || c.name || '').toLowerCase());
      if (!colsB.includes(String(rel.keyB).toLowerCase())) {
        throw new ValidationError(`Key "${rel.keyB}" does not exist in Source B ("${sourceB.name}").`);
      }
    } else if (sourceB.type === 'document') {
      // Document must have entity or field schema
      const docEntities = (sourceB.schema.entities || []).map(e => (typeof e === 'string' ? e : e.name || e.type || '').toLowerCase());
      const lowerKeyB = String(rel.keyB).toLowerCase();
      const hasMatch = docEntities.includes(lowerKeyB) ||
        ['customer_id', 'vendor_id', 'contract_id', 'id', 'organization', 'entity', 'section'].includes(lowerKeyB) ||
        (sourceB.schema.columns || []).some(c => (c.name || c).toLowerCase() === lowerKeyB);

      if (!hasMatch && docEntities.length > 0) {
        throw new ValidationError(`Entity key "${rel.keyB}" not recognized in document schema of "${sourceB.name}".`);
      }
    }

    const relId = rel.id || `rel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const relationshipRecord = {
      id: relId,
      ownerId: String(userId),
      sourceAId: String(rel.sourceAId),
      sourceBId: String(rel.sourceBId),
      sourceAName: sourceA.name,
      sourceBName: sourceB.name,
      keyA: String(rel.keyA),
      keyB: String(rel.keyB),
      relationshipType: rel.relationshipType || 'one-to-many',
      validatedBy: rel.validatedBy || 'user_explicit',
      isValidated: true,
      confidence: typeof rel.confidence === 'number' ? rel.confidence : 1.0,
      description: rel.description || `${sourceA.name}.${rel.keyA} ↔ ${sourceB.name}.${rel.keyB}`,
      createdAt: new Date().toISOString()
    };

    this.relationships.set(relId, relationshipRecord);
    return relationshipRecord;
  }

  /**
   * Check if a validated relationship exists between source A and source B
   */
  hasValidatedRelationship(sourceAId, sourceBId, userId = null) {
    const sA = String(sourceAId);
    const sB = String(sourceBId);

    for (const rel of this.relationships.values()) {
      if (userId && String(rel.ownerId) !== String(userId)) continue;

      if ((rel.sourceAId === sA && rel.sourceBId === sB) ||
          (rel.sourceAId === sB && rel.sourceBId === sA)) {
        if (rel.isValidated) {
          return rel;
        }
      }
    }
    return null;
  }

  /**
   * Get all registered relationships for a source
   */
  getRelationshipsForSource(sourceId, userId = null) {
    const sId = String(sourceId);
    return Array.from(this.relationships.values()).filter(rel => {
      if (userId && String(rel.ownerId) !== String(userId)) return false;
      return rel.sourceAId === sId || rel.sourceBId === sId;
    });
  }

  /**
   * Clear catalog (used for testing and teardown)
   */
  clear() {
    this.sources.clear();
    this.relationships.clear();
  }
}

// Singleton global instance
const defaultCatalog = new UnifiedCatalog();

module.exports = {
  UnifiedCatalog,
  defaultCatalog,
  AccessDeniedError,
  ValidationError
};
