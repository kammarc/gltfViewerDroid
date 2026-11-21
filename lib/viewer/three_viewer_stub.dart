import 'package:flutter/material.dart';

import '../l10n/strings.dart';
import '../models/picked_model.dart';

/// Fallback shown on platforms without a web or Android/iOS viewer
/// implementation (e.g. desktop targets without a webview plugin installed).
class ThreeViewer extends StatelessWidget {
  const ThreeViewer({
    super.key,
    required this.model,
    this.themeValue = 'dark',
    this.languageCode = 'en',
  });

  final PickedModel model;
  final String themeValue;
  final String languageCode;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Text(
          t('platformNotSupported'),
          textAlign: TextAlign.center,
          style: const TextStyle(color: Colors.white),
        ),
      ),
    );
  }
}
