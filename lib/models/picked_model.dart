import 'dart:typed_data';

/// A glTF/glb file the user picked from the device, held in memory.
class PickedModel {
  const PickedModel({required this.name, required this.bytes, required this.id});

  final String name;
  final Uint8List bytes;

  /// A stable identifier for this file - the folder source's URI/path where
  /// available, otherwise the file name - passed to the viewer so it can key
  /// per-model state (the cut list's checked-off parts) in a way that
  /// survives reopening the same file later.
  final String id;
}
