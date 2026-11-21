import 'dart:js_interop';

import '../models/model_file.dart';
import '../models/picked_model.dart';

@JS('modelFolderApi.pickFolder')
external JSPromise<JSString?> _pickFolder();

@JS('modelFolderApi.currentFolderName')
external JSPromise<JSString?> _currentFolderName();

@JS('modelFolderApi.listFiles')
external JSPromise<JSArray<JSString>> _listFiles();

@JS('modelFolderApi.openFile')
external JSPromise<JSUint8Array> _openFile(JSString name);

Future<String?> currentFolderDisplayName() async {
  final result = await _currentFolderName().toDart;
  return result?.toDart;
}

Future<String?> pickModelFolder() async {
  final result = await _pickFolder().toDart;
  return result?.toDart;
}

Future<List<ModelFile>> listModelFiles() async {
  final names = await _listFiles().toDart;
  return [
    for (final name in names.toDart) ModelFile(name: name.toDart, id: name.toDart),
  ];
}

Future<PickedModel> openModelFile(ModelFile file) async {
  final bytes = await _openFile(file.id.toJS).toDart;
  return PickedModel(name: file.name, bytes: bytes.toDart, id: file.id);
}
