import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../folder_source/model_folder_source.dart';
import '../l10n/strings.dart';
import '../models/model_file.dart';
import '../models/picked_model.dart';
import 'settings_page.dart';
import 'viewer_page.dart';

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isLoading = true;
  bool _isChoosingFolder = false;
  String? _folderName;
  List<ModelFile> _files = const [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _refresh();
  }

  Future<void> _refresh() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final folderName = await currentFolderDisplayName();
      final files = folderName == null ? const <ModelFile>[] : await listModelFiles();
      if (!mounted) return;
      setState(() {
        _folderName = folderName;
        _files = files;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = t('failedToReadFolder', [e]));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _chooseFolder() async {
    setState(() => _isChoosingFolder = true);
    try {
      await pickModelFolder();
      await _refresh();
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = t('failedToOpenFolder', [e]));
    } finally {
      if (mounted) setState(() => _isChoosingFolder = false);
    }
  }

  Future<void> _openSettings() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const SettingsPage()),
    );
    _refresh();
  }

  Future<void> _pickSingleFile() async {
    try {
      final file = await FilePicker.pickFile(
        type: FileType.custom,
        allowedExtensions: const ['glb', 'gltf'],
      );
      if (file == null) return; // user cancelled

      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('couldNotReadFile'))),
        );
        return;
      }

      if (!mounted) return;
      // FilePicker only gives a real path outside the web; falling back to
      // the name keeps the cut list working, just keyed less precisely (two
      // same-named files picked this way would share cut-list progress).
      final id = file.path ?? file.name;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => ViewerPage(model: PickedModel(name: file.name, bytes: bytes, id: id)),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('failedToPickFile', [e]))),
      );
    }
  }

  Future<void> _openModel(ModelFile file) async {
    try {
      final model = await openModelFile(file);
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => ViewerPage(model: model)),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(t('failedToOpenFile', [file.name, e]))),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(t('appTitle')),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: t('openSingleFile'),
            onPressed: _pickSingleFile,
          ),
          IconButton(
            icon: const Icon(Icons.settings),
            tooltip: t('settings'),
            onPressed: _openSettings,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_folderName == null) {
      return _buildMessage(
        icon: Icons.folder_open,
        message: t('chooseFolderPrompt'),
        actionLabel: t('chooseFolder'),
        onAction: _isChoosingFolder ? null : _chooseFolder,
        isBusy: _isChoosingFolder,
      );
    }

    if (_error != null) {
      return _buildMessage(
        icon: Icons.error_outline,
        message: _error!,
        actionLabel: t('retry'),
        onAction: _refresh,
      );
    }

    if (_files.isEmpty) {
      return _buildMessage(
        icon: Icons.folder_off,
        message: t('noFilesFound', [_folderName]),
        actionLabel: t('refresh'),
        onAction: _refresh,
      );
    }

    return Column(
      children: [
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refresh,
            child: ListView.separated(
              itemCount: _files.length,
              separatorBuilder: (_, _) => const Divider(height: 1),
              itemBuilder: (context, index) {
                final file = _files[index];
                return ListTile(
                  leading: const Icon(Icons.view_in_ar),
                  title: Text(file.name),
                  onTap: () => _openModel(file),
                );
              },
            ),
          ),
        ),
        _buildInteractionHint(context),
      ],
    );
  }

  // How to interact with a model once it's open - shown here rather than as
  // an overlay in the viewer itself, so it's read once before diving in
  // instead of competing with the 3D view for attention. A distinct
  // background sets it apart from the list above as its own section.
  Widget _buildInteractionHint(BuildContext context) {
    return Container(
      width: double.infinity,
      color: Theme.of(context).colorScheme.surfaceContainer,
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 20),
      child: Text(
        t('interactionHint'),
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
          color: Theme.of(context).colorScheme.onSurfaceVariant,
        ),
      ),
    );
  }

  Widget _buildMessage({
    required IconData icon,
    required String message,
    required String actionLabel,
    required Future<void> Function()? onAction,
    bool isBusy = false,
  }) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 72),
            const SizedBox(height: 24),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: onAction,
              child: isBusy
                  ? const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(actionLabel),
            ),
          ],
        ),
      ),
    );
  }
}
