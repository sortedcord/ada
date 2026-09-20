import type { Principal } from '@ada/domain';

export type VisibilityScope =
  | 'world_truth'
  | 'public_scenario'
  | 'scene_observable'
  | 'entity_private'
  | 'player_out_of_world_detail'
  | 'architect_private'
  | 'admin_only';
export interface RetrievalRequest {
  readonly principal: Principal;
  readonly query: string;
  readonly runId?: string;
  readonly branchId?: string;
  readonly maxCandidates: number;
  readonly maxSelected: number;
}
export interface RetrievalChunk {
  readonly id: string;
  readonly text: string;
  readonly scope: VisibilityScope;
  readonly ownerEntityId?: string;
  readonly score: number;
}
export interface RetrievalService {
  retrieve(request: RetrievalRequest): Promise<readonly RetrievalChunk[]>;
}
export * from './service.js';
export * from './projectors.js';
export * from './sql-service.js';
export * from './indexer.js';
export * from './embedding-lifecycle.js';
export * from './memory-curator.js';
