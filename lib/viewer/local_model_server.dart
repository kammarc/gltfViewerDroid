import 'dart:convert';
import 'dart:io';
import 'dart:math';
import 'dart:typed_data';

import 'package:flutter/services.dart' show rootBundle;

/// A tiny loopback-only HTTP server that serves the bundled three.js viewer
/// page and the picked model's bytes to the Android/iOS WebView.
///
/// A local server (rather than a `file://` URL) is used because modern
/// WebViews restrict `file://` access, and it lets the viewer `fetch()` the
/// model the same way it would on the web.
class LocalModelServer {
  LocalModelServer._(this._server, this._assetFiles, this._modelBytes)
    : modelPath = '/model-${_randomToken()}.glb';

  final HttpServer _server;
  final Map<String, _AssetFile> _assetFiles;
  final Uint8List _modelBytes;

  /// The model's path on this server. It contains a random per-session
  /// token: the port is fixed and loopback is reachable by every other app
  /// on the device, so a well-known path would let them read the user's
  /// model while the viewer is open.
  final String modelPath;

  String get origin => 'http://127.0.0.1:${_server.port}';

  String get _expectedHost => '127.0.0.1:${_server.port}';

  static String _randomToken() {
    final random = Random.secure();
    return [
      for (var i = 0; i < 16; i++) random.nextInt(256).toRadixString(16).padLeft(2, '0'),
    ].join();
  }

  // three.js is vendored under assets/three_viewer/vendor/ (see index.html)
  // instead of loaded from a CDN, so every script the WebView runs has to be
  // served from here too, at the same relative paths.
  static const _vendorScripts = [
    'vendor/three/build/three.module.js',
    'vendor/three/examples/jsm/loaders/GLTFLoader.js',
    'vendor/three/examples/jsm/utils/BufferGeometryUtils.js',
    'vendor/three/examples/jsm/controls/OrbitControls.js',
    'vendor/three/examples/jsm/renderers/CSS2DRenderer.js',
    'vendor/three/examples/jsm/environments/RoomEnvironment.js',
  ];

  static Future<LocalModelServer> start({required Uint8List modelBytes}) async {
    final jsType = ContentType('application', 'javascript', charset: 'utf-8');
    final assetFiles = <String, _AssetFile>{
      '/index.html': await _loadTextAsset(
        'assets/three_viewer/index.html',
        ContentType.html,
      ),
      '/viewer.js': await _loadTextAsset('assets/three_viewer/viewer.js', jsType),
      for (final scriptPath in _vendorScripts)
        '/$scriptPath': await _loadTextAsset('assets/three_viewer/$scriptPath', jsType),
    };

    final server = await _bind();
    final instance = LocalModelServer._(server, assetFiles, modelBytes);
    instance._serve();
    return instance;
  }

  // A fixed port (rather than the ephemeral port 0 used previously) so the
  // WebView sees the same origin on every launch: the viewer's cut list
  // keeps its checked-off parts in that origin's localStorage, keyed by
  // model, and a new origin every time would silently reset it. Falls back
  // to an ephemeral port if something else on the device is already using
  // it - the viewer still works, it just won't remember cut-list progress
  // across app restarts for this session.
  static const _preferredPort = 47624;

  static Future<HttpServer> _bind() async {
    try {
      return await HttpServer.bind(InternetAddress.loopbackIPv4, _preferredPort);
    } on SocketException {
      return HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    }
  }

  static Future<_AssetFile> _loadTextAsset(
    String assetPath,
    ContentType contentType,
  ) async {
    final content = await rootBundle.loadString(assetPath);
    return _AssetFile(utf8.encode(content), contentType);
  }

  void _serve() {
    _server.listen((request) async {
      final response = request.response;
      // No Access-Control-Allow-Origin header: the viewer page is served
      // from this same origin, so it doesn't need CORS - and allowing any
      // origin would let any website open in a browser on the device read
      // the model too.
      response.headers.set('Cache-Control', 'no-store');
      response.headers.set('X-Content-Type-Options', 'nosniff');

      try {
        // Rejecting any other Host header blocks DNS-rebinding attacks,
        // where a website points its own domain at 127.0.0.1 to get around
        // the same-origin policy.
        if (request.headers.value(HttpHeaders.hostHeader) != _expectedHost) {
          response.statusCode = HttpStatus.forbidden;
          return;
        }
        if (request.method != 'GET' && request.method != 'HEAD') {
          response.statusCode = HttpStatus.methodNotAllowed;
          return;
        }

        final path = request.uri.path == '/' ? '/index.html' : request.uri.path;
        if (path == modelPath) {
          response.headers.contentType = ContentType.binary;
          response.add(_modelBytes);
        } else if (_assetFiles.containsKey(path)) {
          final asset = _assetFiles[path]!;
          response.headers.contentType = asset.contentType;
          response.add(asset.bytes);
        } else {
          response.statusCode = HttpStatus.notFound;
        }
      } finally {
        await response.close();
      }
    });
  }

  Future<void> close() => _server.close(force: true);
}

class _AssetFile {
  const _AssetFile(this.bytes, this.contentType);

  final List<int> bytes;
  final ContentType contentType;
}
