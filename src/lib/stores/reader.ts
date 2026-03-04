import { writable } from 'svelte/store';
import type { ReaderSettings } from '$lib/types';

const STORAGE_KEY = 'readerSettings';

const defaults: ReaderSettings = {
	fontSize: 18,
	fontFamily: 'serif',
	lineHeight: 1.7,
	theme: 'system'
};

function load(): ReaderSettings {
	if (typeof localStorage === 'undefined') return defaults;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return defaults;
		return { ...defaults, ...JSON.parse(raw) };
	} catch {
		return defaults;
	}
}

export const readerSettings = writable<ReaderSettings>(defaults);

export function initReaderSettings(): void {
	readerSettings.set(load());
}

readerSettings.subscribe((value) => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
	}
});
