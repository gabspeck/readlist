const CORS_PROXY_KEY = 'corsProxy';
const DEFAULT_PROXY = '/api/proxy?url=';

function loadCorsProxy(): string {
	if (typeof localStorage === 'undefined') return DEFAULT_PROXY;
	return localStorage.getItem(CORS_PROXY_KEY) ?? DEFAULT_PROXY;
}

class SettingsState {
	corsProxy = $state(DEFAULT_PROXY);

	init(): void {
		this.corsProxy = loadCorsProxy();
	}

	constructor() {
		if (typeof localStorage !== 'undefined') {
			$effect.root(() => {
				let initialized = false;
				$effect(() => {
					const value = this.corsProxy;
					if (!initialized) { initialized = true; return; }
					localStorage.setItem(CORS_PROXY_KEY, value);
				});
			});
		}
	}
}

export const settings = new SettingsState();
