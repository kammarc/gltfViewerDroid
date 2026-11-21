import 'package:flutter/material.dart';

import 'l10n/app_language.dart';
import 'l10n/strings.dart';
import 'screens/home_page.dart';
import 'theme/theme_controller.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await loadAppTheme();
  await loadAppLanguage();
  runApp(const GltfViewerApp());
}

class GltfViewerApp extends StatelessWidget {
  const GltfViewerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<AppTheme>(
      valueListenable: appThemeNotifier,
      builder: (context, appTheme, _) {
        // Nested inside the theme listener (rather than the reverse) purely
        // by convention - either order rebuilds the same MaterialApp subtree
        // on either notifier changing.
        return ValueListenableBuilder<AppLanguage>(
          valueListenable: appLanguageNotifier,
          builder: (context, language, _) {
            return MaterialApp(
              title: t('appTitle'),
              debugShowCheckedModeBanner: false,
              // A single resolved ThemeData rather than the usual
              // theme/darkTheme/themeMode trio - there are four choices
              // here, not two, so Flutter's own light/dark split doesn't
              // apply; leaving darkTheme unset means this is always used
              // regardless of the system's own brightness setting.
              theme: appTheme.themeData,
              home: const HomePage(),
            );
          },
        );
      },
    );
  }
}
