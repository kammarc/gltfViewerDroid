import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:gltf_viewer/main.dart';

void main() {
  testWidgets('Home page prompts to choose a folder when none is set', (WidgetTester tester) async {
    SharedPreferences.setMockInitialValues({});

    await tester.pumpWidget(const GltfViewerApp());
    await tester.pumpAndSettle();

    expect(find.text('Choose folder'), findsOneWidget);
  });
}
