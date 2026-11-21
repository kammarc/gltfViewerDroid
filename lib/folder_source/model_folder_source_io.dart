import 'package:flutter/services.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/model_file.dart';
import '../models/picked_model.dart';

const _prefsKey = 'model_folder_uri';
const _channel = MethodChannel('gltf_viewer/model_folder');

Future<String?> _storedUri() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getString(_prefsKey);
}

Future<String?> currentFolderDisplayName() async {
  final uri = await _storedUri();
  if (uri == null) return null;
  final name = await _channel.invokeMethod<String>('folderDisplayName', {'uri': uri});
  return name ?? uri;
}

Future<String?> pickModelFolder() async {
  final uri = await _channel.invokeMethod<String>('pickFolder');
  if (uri == null) return null; // user cancelled

  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_prefsKey, uri);
  return await _channel.invokeMethod<String>('folderDisplayName', {'uri': uri}) ?? uri;
}

Future<List<ModelFile>> listModelFiles() async {
  final uri = await _storedUri();
  if (uri == null) return const [];

  final rawEntries = await _channel.invokeMethod<List<Object?>>('listFiles', {'uri': uri});
  if (rawEntries == null) return const [];

  final files = [
    for (final entry in rawEntries.cast<Map<Object?, Object?>>())
      ModelFile(name: entry['name'] as String, id: entry['uri'] as String),
  ];
  files.sort((a, b) => a.name.toLowerCase().compareTo(b.name.toLowerCase()));
  return files;
}

Future<PickedModel> openModelFile(ModelFile file) async {
  final bytes = await _channel.invokeMethod<Uint8List>('readFile', {'uri': file.id});
  if (bytes == null) throw Exception("Couldn't read ${file.name}.");
  return PickedModel(name: file.name, bytes: bytes, id: file.id);
}
