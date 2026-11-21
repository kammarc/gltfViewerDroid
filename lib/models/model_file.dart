/// A model file discovered in the configured folder.
class ModelFile {
  const ModelFile({required this.name, required this.id});

  /// Display name, e.g. "engine_block.glb".
  final String name;

  /// Platform-specific identifier used to open this file later: the
  /// absolute path on Android, the file name (looked up in the current
  /// directory handle) on web.
  final String id;
}
