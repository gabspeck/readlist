import type { ReaderSettings } from '$lib/types';

const STORAGE_KEY = 'readerSettings';
export const READER_SETTINGS_UPDATED_AT_KEY = 'readerSettingsUpdatedAt';

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

class ReaderState {
	settings = $state<ReaderSettings>(defaults);

	init(): void {
		this.settings = load();
	}

	constructor() {
		if (typeof localStorage !== 'undefined') {
			$effect.root(() => {
				let initialized = false;
				$effect(() => {
					const json = JSON.stringify(this.settings);
					if (!initialized) { initialized = true; return; }
					localStorage.setItem(STORAGE_KEY, json);
					localStorage.setItem(READER_SETTINGS_UPDATED_AT_KEY, String(Date.now()));
				});
			});
		}
	}
}

export const reader = new ReaderState();
