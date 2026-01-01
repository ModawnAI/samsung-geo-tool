/**
 * History Module - Version Management for Generations
 * Phase 2.4: Generation Version History
 */

export {
  VersionManager,
  versionManager,
  saveVersion,
  listVersions,
  getVersion,
  getCurrentVersion,
  setCurrentVersion,
  restoreVersion,
  compareVersions,
  toggleStarred,
} from './version-manager'

export type {
  VersionContent,
  VersionMetadata,
  VersionConfig,
  SaveVersionParams,
  VersionComparison,
  VersionListOptions,
} from './version-manager'
