import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../l10n/strings.dart';
import '../models/picked_model.dart';
import 'local_model_server.dart';

/// The WebView's own background colour, shown briefly before the page
/// paints - mirrors the viewer's CSS --bg variable for each of the four
/// `theme` URL param values (see assets/three_viewer/index.html).
Color _backgroundColorFor(String themeValue) => switch (themeValue) {
  'light' => const Color(0xFFF2F2F5),
  'dark-pastel' => const Color(0xFF241F2E),
  'light-pastel' => const Color(0xFFFAF6FB),
  _ => const Color(0xFF1B1B1F), // 'dark', and any unexpected value
};

/// Android/iOS implementation: runs a loopback HTTP server that serves the
/// bundled three.js viewer and the picked model, then points a WebView at it.
class ThreeViewer extends StatefulWidget {
  const ThreeViewer({
    super.key,
    required this.model,
    this.themeValue = 'dark',
    this.languageCode = 'en',
  });

  final PickedModel model;

  /// Mirrors the app's own theme into the viewer (background colour, panel
  /// colours, the cut list's badge/selection accents, ...) via a `theme`
  /// URL param, so switching themes in Settings doesn't leave the 3D view
  /// looking mismatched. One of "light", "dark", "light-pastel" or
  /// "dark-pastel" - see AppTheme.urlValue.
  final String themeValue;

  /// Mirrors the app's own display language into the viewer's own text
  /// (the cut list, status messages) via a `lang` URL param.
  final String languageCode;

  @override
  State<ThreeViewer> createState() => _ThreeViewerState();
}

class _ThreeViewerState extends State<ThreeViewer> {
  late final WebViewController _controller;
  LocalModelServer? _server;
  bool _ready = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(_backgroundColorFor(widget.themeValue));
    _start();
  }

  Future<void> _start() async {
    try {
      final server = await LocalModelServer.start(modelBytes: widget.model.bytes);
      _server = server;

      // Keep the WebView on the local viewer page: nothing in it should
      // ever navigate elsewhere, and a model file must not be able to.
      final origin = Uri.parse(server.origin);
      await _controller.setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final uri = Uri.tryParse(request.url);
            final isLocal = uri != null &&
                uri.scheme == origin.scheme &&
                uri.host == origin.host &&
                uri.port == origin.port;
            return isLocal ? NavigationDecision.navigate : NavigationDecision.prevent;
          },
        ),
      );

      final modelUrl = Uri.encodeComponent('${server.origin}${server.modelPath}');
      final modelId = Uri.encodeComponent(widget.model.id);
      final viewerUrl = Uri.parse(
        '${server.origin}/index.html?model=$modelUrl&modelId=$modelId'
        '&theme=${widget.themeValue}&lang=${widget.languageCode}',
      );

      await _controller.loadRequest(viewerUrl);
      if (mounted) setState(() => _ready = true);
    } catch (e) {
      if (mounted) setState(() => _error = t('failedToStartViewer', [e]));
    }
  }

  @override
  void dispose() {
    _server?.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_error != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _error!,
            style: const TextStyle(color: Colors.redAccent),
            textAlign: TextAlign.center,
          ),
        ),
      );
    }

    return Stack(
      children: [
        if (_ready) WebViewWidget(controller: _controller),
        if (!_ready) const Center(child: CircularProgressIndicator()),
      ],
    );
  }
}
