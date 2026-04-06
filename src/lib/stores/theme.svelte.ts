export type AppTheme = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'appTheme';
export const APP_THEME_UPDATED_AT_KEY = 'appThemeUpdatedAt';

function load(): AppTheme {
	try {
		return (localStorage.getItem(STORAGE_KEY) as AppTheme) ?? 'system';
	} catch {
		return 'system';
	}
}

export function applyTheme(t: AppTheme): void {
	const el = document.documentElement;
	if (t === 'system') el.removeAttribute('data-theme');
	else el.setAttribute('data-theme', t);
}

export function cycleTheme(current: AppTheme): AppTheme {
	if (current === 'system') return 'dark';
	if (current === 'dark') return 'light';
	return 'system';
}

class ThemeState {
	current = $state<AppTheme>('system');

	init(): void {
		this.current = load();
		applyTheme(this.current);
	}

	constructor() {
		if (typeof localStorage !== 'undefined') {
			$effect.root(() => {
				let initialized = false;
				$effect(() => {
					const value = this.current;
					if (!initialized) { initialized = true; return; }
					localStorage.setItem(STORAGE_KEY, value);
					localStorage.setItem(APP_THEME_UPDATED_AT_KEY, String(Date.now()));
					applyTheme(value);
				});
			});
		}
	}
}

export const theme = new ThemeState();
