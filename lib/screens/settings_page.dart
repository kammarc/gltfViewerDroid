import 'package:flutter/material.dart';

import '../folder_source/model_folder_source.dart';
import '../l10n/app_language.dart';
import '../l10n/strings.dart';
import '../theme/theme_controller.dart';

class SettingsPage extends StatefulWidget {
  const SettingsPage({super.key});

  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  bool _isLoading = true;
  bool _isChoosing = false;
  String? _folderName;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    final folderName = await currentFolderDisplayName();
    if (!mounted) return;
    setState(() {
      _folderName = folderName;
      _isLoading = false;
    });
  }

  Future<void> _chooseFolder() async {
    setState(() {
      _isChoosing = true;
      _error = null;
    });
    try {
      final folderName = await pickModelFolder();
      if (!mounted) return;
      if (folderName != null) {
        setState(() => _folderName = folderName);
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = t('couldNotAccessFolder', [e]));
    } finally {
      if (mounted) setState(() => _isChoosing = false);
    }
  }

  String _themeLabel(AppTheme theme) => switch (theme) {
    AppTheme.light => t('themeLight'),
    AppTheme.dark => t('themeDark'),
    AppTheme.lightPastel => t('themeLightPastel'),
    AppTheme.darkPastel => t('themeDarkPastel'),
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(t('settings'))),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  t('modelFolderSection'),
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Card(
                  child: ListTile(
                    leading: const Icon(Icons.folder),
                    title: Text(_folderName ?? t('notSet')),
                    subtitle: Text(t('folderSubtitle')),
                  ),
                ),
                const SizedBox(height: 16),
                FilledButton.icon(
                  onPressed: _isChoosing ? null : _chooseFolder,
                  icon: _isChoosing
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.folder_open),
                  label: Text(_folderName == null ? t('chooseFolder') : t('changeFolder')),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 16),
                  Text(
                    _error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                ],
                const SizedBox(height: 24),
                Text(
                  t('appearanceSection'),
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 4),
                Text(
                  t('appearanceSubtitle'),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: 8),
                Card(
                  child: ValueListenableBuilder<AppTheme>(
                    valueListenable: appThemeNotifier,
                    builder: (context, selected, _) {
                      return RadioGroup<AppTheme>(
                        groupValue: selected,
                        onChanged: (value) {
                          if (value != null) setAppTheme(value);
                        },
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            for (final theme in AppTheme.values)
                              RadioListTile<AppTheme>(
                                value: theme,
                                title: Text(_themeLabel(theme)),
                                secondary: CircleAvatar(
                                  backgroundColor: theme.themeData.colorScheme.primary,
                                  radius: 12,
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 24),
                Text(
                  t('languageSection'),
                  style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Card(
                  child: ValueListenableBuilder<AppLanguage>(
                    valueListenable: appLanguageNotifier,
                    builder: (context, language, _) {
                      return ListTile(
                        leading: const Icon(Icons.language),
                        title: Text(language.label),
                        trailing: DropdownButton<AppLanguage>(
                          value: language,
                          underline: const SizedBox.shrink(),
                          onChanged: (value) {
                            if (value != null) setAppLanguage(value);
                          },
                          items: [
                            for (final option in AppLanguage.values)
                              DropdownMenuItem(
                                value: option,
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text(option.flag, style: const TextStyle(fontSize: 20)),
                                    const SizedBox(width: 8),
                                    Text(option.label),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
    );
  }
}
