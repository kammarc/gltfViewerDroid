package io.kammarc.gltfviewer

import android.app.Activity
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import androidx.documentfile.provider.DocumentFile
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/**
 * Backs the model-folder feature with Android's Storage Access Framework
 * directly (via DocumentFile), rather than a translated filesystem path.
 * `file_picker`'s directory picker returns a path that scoped storage may
 * not actually let `dart:io` read on every device, which silently produced
 * an empty file list. Keeping the SAF tree URI end-to-end avoids that.
 */
class MainActivity : FlutterActivity() {
    private val channelName = "gltf_viewer/model_folder"
    private val pickFolderRequestCode = 4201
    private var pendingResult: MethodChannel.Result? = null

    // Listing a folder and reading a (possibly large) model go through the
    // content resolver, which can block - kept off the UI thread to avoid
    // jank and ANRs.
    private val ioExecutor: ExecutorService = Executors.newSingleThreadExecutor()
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "pickFolder" -> {
                        // Only one picker can be open at a time; settle any
                        // earlier call so its Future doesn't hang forever.
                        pendingResult?.success(null)
                        pendingResult = result
                        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT_TREE)
                        startActivityForResult(intent, pickFolderRequestCode)
                    }
                    "folderDisplayName" -> {
                        val uri = call.argument<String>("uri")
                        result.success(folderDisplayName(uri))
                    }
                    "listFiles" -> {
                        val uri = call.argument<String>("uri")
                        runInBackground(result) { listFiles(uri) }
                    }
                    "readFile" -> {
                        val uri = call.argument<String>("uri")
                        if (uri == null) {
                            result.error("bad_args", "Missing 'uri' argument.", null)
                        } else {
                            runInBackground(result) { readFile(uri) }
                        }
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun runInBackground(result: MethodChannel.Result, task: () -> Any?) {
        ioExecutor.execute {
            try {
                val value = task()
                mainHandler.post { result.success(value) }
            } catch (e: Exception) {
                mainHandler.post { result.error("io_error", e.message ?: e.toString(), null) }
            }
        }
    }

    override fun onDestroy() {
        ioExecutor.shutdown()
        super.onDestroy()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode != pickFolderRequestCode) return

        val result = pendingResult
        pendingResult = null

        val uri = data?.data
        if (resultCode != Activity.RESULT_OK || uri == null) {
            result?.success(null)
            return
        }

        contentResolver.takePersistableUriPermission(
            uri,
            Intent.FLAG_GRANT_READ_URI_PERMISSION,
        )
        result?.success(uri.toString())
    }

    private fun folderDisplayName(uriString: String?): String? {
        if (uriString == null) return null
        val tree = DocumentFile.fromTreeUri(this, Uri.parse(uriString)) ?: return null
        return tree.name
    }

    private fun isModelFile(name: String): Boolean {
        val extension = name.substringAfterLast('.', "").lowercase()
        return extension == "glb" || extension == "gltf"
    }

    private fun listFiles(uriString: String?): List<Map<String, String>> {
        if (uriString == null) return emptyList()
        val tree = DocumentFile.fromTreeUri(this, Uri.parse(uriString)) ?: return emptyList()
        val files = mutableListOf<Map<String, String>>()
        for (child in tree.listFiles()) {
            if (!child.isFile) continue
            val name = child.name ?: continue
            if (!isModelFile(name)) continue
            files.add(mapOf("name" to name, "uri" to child.uri.toString()))
        }
        return files
    }

    private fun readFile(uriString: String): ByteArray {
        val uri = Uri.parse(uriString)
        val stream = contentResolver.openInputStream(uri)
            ?: throw java.io.IOException("Couldn't open $uriString")
        return stream.use { it.readBytes() }
    }
}
