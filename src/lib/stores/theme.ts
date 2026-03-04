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

export function applyTheme(theme: AppTheme): void {
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

export const APP_THEME_UPDATED_AT_KEY = 'appThemeUpdatedAt';

appTheme.subscribe((theme) => {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(STORAGE_KEY, theme);
	localStorage.setItem(APP_THEME_UPDATED_AT_KEY, String(Date.now()));
	applyTheme(theme);
});

export function cycleTheme(current: AppTheme): AppTheme {
	if (current === 'system') return 'dark';
	if (current === 'dark') return 'light';
	return 'system';
}
