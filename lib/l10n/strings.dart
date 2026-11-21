import 'app_language.dart';

/// Every user-facing string in the app, in every supported language. Small
/// enough as a set that a hand-rolled lookup is simpler than generating an
/// AppLocalizations class from ARB files for it.
///
/// `{0}`, `{1}`, ... in a template are replaced by [t]'s positional [args],
/// in order.
const Map<String, Map<String, String>> _strings = {
  'appTitle': {'en': 'GLTF Viewer', 'de': 'GLTF-Betrachter'},
  'openSingleFile': {'en': 'Open a single file', 'de': 'Einzelne Datei öffnen'},
  'settings': {'en': 'Settings', 'de': 'Einstellungen'},
  'couldNotReadFile': {
    'en': 'Could not read the selected file.',
    'de': 'Die ausgewählte Datei konnte nicht gelesen werden.',
  },
  'failedToPickFile': {
    'en': 'Failed to pick file: {0}',
    'de': 'Datei konnte nicht ausgewählt werden: {0}',
  },
  'failedToOpenFile': {
    'en': "Couldn't open {0}: {1}",
    'de': '{0} konnte nicht geöffnet werden: {1}',
  },
  'chooseFolderPrompt': {
    'en': 'Choose a folder to list its .glb and .gltf files here.',
    'de': 'Wähle einen Ordner aus, um dessen .glb- und .gltf-Dateien hier aufzulisten.',
  },
  'chooseFolder': {'en': 'Choose folder', 'de': 'Ordner wählen'},
  'retry': {'en': 'Retry', 'de': 'Erneut versuchen'},
  'noFilesFound': {
    'en': 'No .glb or .gltf files found in "{0}".',
    'de': 'Keine .glb- oder .gltf-Dateien in "{0}" gefunden.',
  },
  'refresh': {'en': 'Refresh', 'de': 'Aktualisieren'},
  'failedToReadFolder': {
    'en': 'Failed to read the model folder: {0}',
    'de': 'Modellordner konnte nicht gelesen werden: {0}',
  },
  'failedToOpenFolder': {
    'en': 'Failed to open that folder: {0}',
    'de': 'Ordner konnte nicht geöffnet werden: {0}',
  },
  'interactionHint': {
    'en': 'Drag to orbit · pinch/scroll to zoom · tap a part to select it · '
        'long-press to list what is underneath',
    'de': 'Ziehen zum Drehen · Zwei-Finger-Zoom bzw. Scrollen · Tippen, um ein '
        'Teil auszuwählen · Lange drücken, um darunterliegende Teile aufzulisten',
  },
  'modelFolderSection': {'en': 'MODEL FOLDER', 'de': 'MODELLORDNER'},
  'notSet': {'en': 'Not set', 'de': 'Nicht festgelegt'},
  'folderSubtitle': {
    'en': '.glb and .gltf files here are listed on the home screen',
    'de': '.glb- und .gltf-Dateien darin werden auf der Startseite angezeigt',
  },
  'changeFolder': {'en': 'Change folder', 'de': 'Ordner ändern'},
  'couldNotAccessFolder': {
    'en': "Couldn't access that folder: {0}",
    'de': 'Auf diesen Ordner konnte nicht zugegriffen werden: {0}',
  },
  'appearanceSection': {'en': 'APPEARANCE', 'de': 'DARSTELLUNG'},
  'appearanceSubtitle': {
    'en': 'Also changes the 3D viewer',
    'de': 'Ändert auch die 3D-Ansicht',
  },
  'themeLight': {'en': 'Light', 'de': 'Hell'},
  'themeDark': {'en': 'Dark', 'de': 'Dunkel'},
  'themeLightPastel': {'en': 'Light pastel', 'de': 'Hell pastell'},
  'themeDarkPastel': {'en': 'Dark pastel', 'de': 'Dunkel pastell'},
  'languageSection': {'en': 'LANGUAGE', 'de': 'SPRACHE'},
  'failedToStartViewer': {
    'en': 'Failed to start viewer: {0}',
    'de': 'Betrachter konnte nicht gestartet werden: {0}',
  },
  'platformNotSupported': {
    'en': 'This platform is not supported by the glTF viewer.\n'
        'Run this app on Android or in a web browser.',
    'de': 'Diese Plattform wird vom glTF-Betrachter nicht unterstützt.\n'
        'Führe diese App auf Android oder in einem Webbrowser aus.',
  },
};

/// Looks up [key] in the app's current language (see [appLanguageNotifier]),
/// falling back to English, and finally the key itself if that's missing
/// too. Substitutes `{0}`, `{1}`, ... in order with [args].
String t(String key, [List<Object?> args = const []]) {
  final table = _strings[key];
  final template = table?[appLanguageNotifier.value.code] ?? table?['en'] ?? key;
  var result = template;
  for (var i = 0; i < args.length; i++) {
    result = result.replaceAll('{$i}', args[i].toString());
  }
  return result;
}
