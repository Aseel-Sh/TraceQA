/**
 * Core Module Exports
 * Exports all build system components
 */

// Build System
export {
  BuildSystem,
  createBuildSystem,
  BuildMode,
  type BuildOptions,
  type BuildResult,
} from './build-system.js';

// Project Detector
export {
  ProjectType,
  PackageManager,
  detectProject,
  detectProjectType,
  detectFramework,
  detectPackageManager,
  detectBuildCommands,
  detectProjectStructure,
  getDefaultPort,
  detectPortFromEnv,
  getBuildCommand,
  getInstallCommand,
  type FrameworkInfo,
  type BuildCommands,
  type ProjectStructure,
  type ProjectDetectionResult,
} from './project-detector.js';

// Process Manager
export {
  processManager,
  ProcessManager,
  type ProcessInfo,
  type ProcessOutput,
  type ServerReadinessOptions,
} from './process-manager.js';

// Made with Bob