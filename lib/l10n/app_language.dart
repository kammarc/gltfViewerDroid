import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// A language the app can display its own UI in - not tied to
/// flutter_localizations, since the app's string set is small enough that a
/// hand-rolled lookup (see strings.dart) covers it without generated code.
enum AppLanguage {
  english('en', 'English', '🇬🇧'),
  german('de', 'Deutsch', '🇩🇪');

  const AppLanguage(this.code, this.label, this.flag);

  final String code;
  final String label;
  final String flag;

  static AppLanguage? byCode(String code) {
    for (final language in values) {
      if (language.code == code) return language;
    }
    return null;
  }
}

const _prefsKey = 'app_language';

/// The app's current display language, shared by every screen (and, via
/// the viewer's `lang` URL param, the 3D view's own cut list text).
final ValueNotifier<AppLanguage> appLanguageNotifier = ValueNotifier(
  AppLanguage.english,
);

/// Loads the saved preference; if there isn't one yet (first run), falls
/// back to the device's own language when it's one this app supports.
Future<void> loadAppLanguage() async {
  final prefs = await SharedPreferences.getInstance();
  final savedCode = prefs.getString(_prefsKey);
  if (savedCode != null) {
    final saved = AppLanguage.byCode(savedCode);
    if (saved != null) appLanguageNotifier.value = saved;
    return;
  }

  final deviceLanguage = AppLanguage.byCode(
    PlatformDispatcher.instance.locale.languageCode,
  );
  if (deviceLanguage != null) appLanguageNotifier.value = deviceLanguage;
}

Future<void> setAppLanguage(AppLanguage language) async {
  appLanguageNotifier.value = language;
  final prefs = await SharedPreferences.getInstance();
  await prefs.setString(_prefsKey, language.code);
}
