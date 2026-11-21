import 'dart:io';
import 'dart:typed_data';

import 'package:flutter_test/flutter_test.dart';
import 'package:gltf_viewer/viewer/local_model_server.dart';

void main() {
  late LocalModelServer server;
  late HttpClient client;
  final modelBytes = Uint8List.fromList([1, 2, 3, 4]);

  setUpAll(() {
    TestWidgetsFlutterBinding.ensureInitialized();
    // flutter_test stubs out real HTTP by default; this test needs it.
    HttpOverrides.global = null;
  });

  setUp(() async {
    server = await LocalModelServer.start(modelBytes: modelBytes);
    client = HttpClient();
  });

  tearDown(() async {
    client.close(force: true);
    await server.close();
  });

  Future<HttpClientResponse> get(String path, {String? host}) async {
    final request = await client.getUrl(Uri.parse('${server.origin}$path'));
    if (host != null) request.headers.host = host;
    return request.close();
  }

  test('serves the model only at its random per-session path', () async {
    expect(server.modelPath, matches(RegExp(r'^/model-[0-9a-f]{32}\.glb$')));

    final ok = await get(server.modelPath);
    expect(ok.statusCode, HttpStatus.ok);
    expect(await ok.expand((chunk) => chunk).toList(), modelBytes);

    final guessed = await get('/model.glb');
    expect(guessed.statusCode, HttpStatus.notFound);
    await guessed.drain<void>();
  });

  test('sends no CORS header', () async {
    final response = await get('/index.html');
    expect(response.statusCode, HttpStatus.ok);
    expect(response.headers.value('access-control-allow-origin'), isNull);
    await response.drain<void>();
  });

  test('rejects a foreign Host header (DNS rebinding)', () async {
    final response = await get(server.modelPath, host: 'attacker.example');
    expect(response.statusCode, HttpStatus.forbidden);
    await response.drain<void>();
  });
}
