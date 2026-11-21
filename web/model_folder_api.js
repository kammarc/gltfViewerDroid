// File System Access API helper for the model-folder feature (web only).
// Exposes window.modelFolderApi, called from lib/folder_source/model_folder_source_web.dart
// via dart:js_interop. The chosen directory handle is persisted in IndexedDB
// so it survives page reloads; the browser still requires re-confirming read
// permission for it each session, which listFiles() does automatically.
(() => {
  const DB_NAME = 'gltf-viewer-folder';
  const STORE_NAME = 'handles';
  const HANDLE_KEY = 'modelFolder';
  const MODEL_EXTENSIONS = ['glb', 'gltf'];

  let currentHandle = null;

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function storeHandle(handle) {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }

  async function loadStoredHandle() {
    const db = await openDb();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return handle;
  }

  function isModelFile(name) {
    const dot = name.lastIndexOf('.');
    if (dot < 0) return false;
    return MODEL_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase());
  }

  async function ensureReadPermission(handle) {
    const opts = { mode: 'read' };
    if ((await handle.queryPermission(opts)) === 'granted') return true;
    return (await handle.requestPermission(opts)) === 'granted';
  }

  async function pickFolder() {
    if (!window.showDirectoryPicker) {
      throw new Error('This browser does not support folder access. Try Chrome or Edge.');
    }
    let handle;
    try {
      handle = await window.showDirectoryPicker({ mode: 'read' });
    } catch (err) {
      if (err && err.name === 'AbortError') return null; // user cancelled the dialog
      throw err;
    }
    currentHandle = handle;
    await storeHandle(handle);
    return handle.name;
  }

  async function currentFolderName() {
    if (currentHandle) return currentHandle.name;
    const stored = await loadStoredHandle();
    if (!stored) return null;
    currentHandle = stored;
    return stored.name;
  }

  async function listFiles() {
    if (!currentHandle) {
      const stored = await loadStoredHandle();
      if (!stored) return [];
      currentHandle = stored;
    }
    const granted = await ensureReadPermission(currentHandle);
    if (!granted) {
      throw new Error('Permission to read the model folder was not granted.');
    }
    const names = [];
    for await (const [name, entryHandle] of currentHandle.entries()) {
      if (entryHandle.kind === 'file' && isModelFile(name)) {
        names.push(name);
      }
    }
    names.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    return names;
  }

  async function openFile(name) {
    if (!currentHandle) throw new Error('No model folder is configured.');
    const fileHandle = await currentHandle.getFileHandle(name);
    const file = await fileHandle.getFile();
    return new Uint8Array(await file.arrayBuffer());
  }

  window.modelFolderApi = { pickFolder, currentFolderName, listFiles, openFile };
})();
