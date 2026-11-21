import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../l10n/app_language.dart';
import '../models/picked_model.dart';
import '../theme/theme_controller.dart';
import '../viewer/three_viewer.dart';

/// Fullscreen page hosting the three.js viewer for a picked model.
class ViewerPage extends StatefulWidget {
  const ViewerPage({super.key, required this.model});

  final PickedModel model;

  @override
  State<ViewerPage> createState() => _ViewerPageState();
}

class _ViewerPageState extends State<ViewerPage> {
  @override
  void initState() {
    super.initState();
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
  }

  @override
  void dispose() {
    SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Note: the viewer is a platform view (WebView/iframe), which always
    // composites above regular Flutter widgets. An AppBar overlapping it via
    // extendBodyBehindAppBar would look fine but silently swallow all its
    // taps, so the bar gets its own non-overlapping strip above the viewer -
    // left to the ambient theme (rather than hardcoded black/white as
    // before) so it still matches a light-themed viewer.
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.model.name, overflow: TextOverflow.ellipsis),
      ),
      body: ThreeViewer(
        model: widget.model,
        themeValue: appThemeNotifier.value.urlValue,
        languageCode: appLanguageNotifier.value.code,
      ),
    );
  }
}
