import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'pastel_colors.dart';

/// One of the app's four theme choices: a plain light/dark pair (the
/// original Material look, deepPurple-seeded) and a light/dark pastel pair
/// (see pastel_colors.dart). Each knows its own resolved [ThemeData] and the
/// value the viewer's `theme` URL param expects, so the 3D view's CSS
/// variables and THREE.Color accents (see assets/three_viewer/index.html
/// and viewer.js) switch along with it - including, for the two pastel
/// variants, recolouring the cut list's badges and the selection highlight
/// into a matching warm pastel family instead of their normal vivid colours.
enum AppTheme {
  light,
  dark,
  lightPastel,
  darkPastel;

  bool get isPastel => this == lightPastel || this == darkPastel;

  String get urlValue => switch (this) {
    AppTheme.light => 'light',
    AppTheme.dark => 'dark',
    AppTheme.lightPastel => 'light-pastel',
    AppTheme.darkPastel => 'dark-pastel',
  };

  ThemeData get themeData => switch (this) {
    AppTheme.light => ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.deepPurple,
        brightness: Brightness.light,
      ),
      useMaterial3: true,
    ),
    AppTheme.dark => ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: Colors.deepPurple,
        brightness: Brightness.dark,
      ),
      useMaterial3: true,
    ),
    AppTheme.lightPastel => ThemeData(colorScheme: lightPastelScheme, useMaterial3: true),
    AppTheme.darkPastel => ThemeData(colorScheme: darkPastelScheme, useMaterial3: true),
  };
}

const _prefsKey = 'app_theme';

/// The app's current theme, shared by every screen. A single
/// [ValueNotifier] is enough state management for a choice this simple -
/// [MaterialApp] rebuilds through a [ValueListenableBuilder] wherever it's
/// read.
final ValueNotifier<AppTheme> appThemeNotifier = ValueNotifier(AppTheme.dark);

/// Loads the saved preference, if any - call once before the app starts.
/// Left at the default (plain dark, matching the app's original look) when
/// nothing has been saved yet.
Future<void> loadAppTheme() async {
  final prefs = await SharedPreferences.getInstance();
  final savedName = prefs.getString(_prefsKey);
  if (savedName == null) return;
  for (final theme in AppTheme.values) {
    if (theme.name == savedName) {
      appThemeNotifier.value = theme;
      return;
    }
  }
}

Future<void> setAppTheme(AppTheme theme) async {
  appThemeNotifier.value = theme;
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_prefsKey, theme.name);
}
