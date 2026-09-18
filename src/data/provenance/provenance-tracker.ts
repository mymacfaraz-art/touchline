// ─────────────────────────────────────────────────────────────────────────────
// TOUCHLINE — PHASE 5: PROVENANCE TRACKER
// Maintains full lineage mapping from external sources to Touchline entities.
// ─────────────────────────────────────────────────────────────────────────────

import { ProvenanceRecord, SourceEntityType } from '../types/data-foundation.types';

export class ProvenanceTracker {
  private mappings = new Map<string, ProvenanceRecord>(); // key: `${sourceCode}:${entityType}:${sourceEntityId}`
  private reverseMappings = new Map<string, ProvenanceRecord[]>(); // key: `${entityType}:${internalEntityId}`

  /**
   * Records or updates a provenance mapping.
   */
  public recordMapping(record: ProvenanceRecord): void {
    const key = this.buildKey(record.sourceCode, record.entityType, record.sourceEntityId);
    this.mappings.set(key, record);

    const reverseKey = `${record.entityType}:${record.internalEntityId}`;
    const list = this.reverseMappings.get(reverseKey) || [];
    // Avoid duplicates in reverse lookup
    const filtered = list.filter((r) => r.sourceCode !== record.sourceCode || r.sourceEntityId !== record.sourceEntityId);
    filtered.push(record);
    this.reverseMappings.set(reverseKey, filtered);
  }

  /**
   * Retrieves an internal Touchline entity ID given an external source identifier.
   */
  public getInternalId(
    sourceCode: string,
    entityType: SourceEntityType,
    sourceEntityId: string
  ): string | null {
    const key = this.buildKey(sourceCode, entityType, sourceEntityId);
    const record = this.mappings.get(key);
    return record ? record.internalEntityId : null;
  }

  /**
   * Returns all provenance records for a given Touchline internal entity.
   */
  public getEntityProvenance(
    entityType: SourceEntityType,
    internalEntityId: string
  ): ProvenanceRecord[] {
    const reverseKey = `${entityType}:${internalEntityId}`;
    return this.reverseMappings.get(reverseKey) || [];
  }

  /**
   * Returns total number of tracked provenance mappings.
   */
  public size(): number {
    return this.mappings.size;
  }

  /**
   * Returns all recorded provenance records.
   */
  public getAllMappings(): ProvenanceRecord[] {
    return Array.from(this.mappings.values());
  }

  private buildKey(
    sourceCode: string,
    entityType: SourceEntityType,
    sourceEntityId: string
  ): string {
    return `${sourceCode}:${entityType}:${sourceEntityId}`;
  }
}
