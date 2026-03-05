// Install all IndexedDB globals (IDBRequest, IDBFactory, IDBDatabase, etc.)
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach } from 'vitest';

beforeEach(() => {
	// Fresh IndexedDB instance for every test — prevents bleed-through
	(globalThis as Record<string, unknown>).indexedDB = new IDBFactory();
	try {
		localStorage.clear();
	} catch {
		// localStorage may not be available in all environments
	}
});
