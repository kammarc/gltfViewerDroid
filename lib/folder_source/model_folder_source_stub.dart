import '../models/model_file.dart';
import '../models/picked_model.dart';

Future<String?> currentFolderDisplayName() async => null;

Future<String?> pickModelFolder() async => null;

Future<List<ModelFile>> listModelFiles() async => const [];

Future<PickedModel> openModelFile(ModelFile file) {
  throw UnsupportedError('Folder-based model browsing is not supported on this platform.');
}
