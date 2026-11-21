import 'dart:js_interop';
import 'dart:typed_data';
import 'dart:ui_web' as ui_web;

import 'package:flutter/material.dart';
import 'package:web/web.dart' as web;

import '../models/picked_model.dart';

/// Web implementation: puts the picked model's bytes in a Blob, and points
/// an <iframe> running the bundled three.js viewer at its object URL.
class ThreeViewer extends StatefulWidget {
  const ThreeViewer({
    super.key,
    required this.model,
    this.themeValue = 'dark',
    this.languageCode = 'en',
  });

  final PickedModel model;

  /// Mirrors the app's own theme into the viewer via a `theme` URL param -
  /// see the io implementation's doc comment.
  final String themeValue;

  /// Mirrors the app's own display language via a `lang` URL param.
  final String languageCode;

  @override
  State<ThreeViewer> createState() => _ThreeViewerState();
}

class _ThreeViewerState extends State<ThreeViewer> {
  late final String _viewType;
  late final String _blobUrl;

  @override
  void initState() {
    super.initState();

    _blobUrl = _createBlobUrl(widget.model.bytes);
    _viewType = 'three-viewer-${identityHashCode(this)}';

    // Note: the iframe's blob: URL is unique per page load regardless of
    // modelId, so the cut list's localStorage-backed progress can't survive
    // a reload here the way it does on Android/iOS - it still works within
    // one open session.
    final viewerUrl =
        'assets/assets/three_viewer/index.html'
        '?model=${Uri.encodeComponent(_blobUrl)}'
        '&modelId=${Uri.encodeComponent(widget.model.id)}'
        '&theme=${widget.themeValue}&lang=${widget.languageCode}';

    ui_web.platformViewRegistry.registerViewFactory(_viewType, (int viewId) {
      return web.HTMLIFrameElement()
        ..style.border = 'none'
        ..style.width = '100%'
        ..style.height = '100%'
        ..allow = 'fullscreen'
        ..src = viewerUrl;
    });
  }

  String _createBlobUrl(Uint8List bytes) {
    final parts = <JSAny>[bytes.toJS].toJS;
    final blob = web.Blob(parts, web.BlobPropertyBag(type: 'model/gltf-binary'));
    return web.URL.createObjectURL(blob);
  }

  @override
  void dispose() {
    web.URL.revokeObjectURL(_blobUrl);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return HtmlElementView(viewType: _viewType);
  }
}
