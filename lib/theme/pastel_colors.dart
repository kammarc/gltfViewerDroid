import 'package:flutter/material.dart';

/// The app's two main colour schemes - a light and a dark pastel palette,
/// both built from the same soft lavender/mint/coral accent family so they
/// read as one brand rather than two unrelated looks (the 3D viewer mirrors
/// these same tones via its own `theme` URL param and CSS variables - see
/// assets/three_viewer/index.html).
///
/// [ColorScheme.fromSeed] alone doesn't reliably land on "pastel": at light
/// brightness its primary tone is pulled fairly saturated/dark for contrast
/// against white, and the reverse at dark brightness - neither is
/// necessarily soft. Seeding still fills in every other Material 3 role
/// sensibly, but the visible ones are overridden by hand below.
final lightPastelScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFFC7AEEF),
  brightness: Brightness.light,
).copyWith(
  primary: const Color(0xFF9C7FC9),
  onPrimary: Colors.white,
  secondary: const Color(0xFF7FB8A4),
  onSecondary: const Color(0xFF0D2A20),
  surface: const Color(0xFFFAF6FB),
  onSurface: const Color(0xFF3A3342),
  onSurfaceVariant: const Color(0xFF6B6275),
  surfaceContainer: const Color(0xFFF1E9F7),
  outline: const Color(0xFFC9BEDA),
  error: const Color(0xFFE08585),
  onError: const Color(0xFF3A0A0A),
);

final darkPastelScheme = ColorScheme.fromSeed(
  seedColor: const Color(0xFFC7AEEF),
  brightness: Brightness.dark,
).copyWith(
  primary: const Color(0xFFC7AEEF),
  onPrimary: const Color(0xFF2A1A45),
  secondary: const Color(0xFFA8DFCB),
  onSecondary: const Color(0xFF0D2A20),
  surface: const Color(0xFF241F2E),
  onSurface: const Color(0xFFEDE7F5),
  onSurfaceVariant: const Color(0xFFB8AFC9),
  surfaceContainer: const Color(0xFF362F45),
  outline: const Color(0xFF5A4F6E),
  error: const Color(0xFFF0A8A8),
  onError: const Color(0xFF3A0A0A),
);
