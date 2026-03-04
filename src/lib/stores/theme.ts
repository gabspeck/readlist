import { writable } from 'svelte/store';

export type AppTheme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'appTheme';

function load(): AppTheme {
	try {
		return (localStorage.getItem(STORAGE_KEY) as AppTheme) ?? 'system';
	} catch {
		return 'system';
	}
}

function applyTheme(theme: AppTheme): void {
	const el = document.documentElement;
	if (theme === 'system') {
		el.removeAttribute('data-theme');
	} else {
		el.setAttribute('data-theme', theme);
	}
}

export const appTheme = writable<AppTheme>('system');

export function initAppTheme(): void {
	const theme = load();
	appTheme.set(theme);
	applyTheme(theme);
}

appTheme.subscribe((theme) => {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, theme);
	applyTheme(theme);
});

export function cycleTheme(current: AppTheme): AppTheme {
	if (current === 'system') return 'dark';
	if (current === 'dark') return 'light';
	return 'system';
}
