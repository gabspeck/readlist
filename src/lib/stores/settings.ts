import { writable } from 'svelte/store';

const CORS_PROXY_KEY = 'corsProxy';
const DEFAULT_PROXY = '/api/proxy?url=';

function loadCorsProxy(): string {
	if (typeof localStorage === 'undefined') return DEFAULT_PROXY;
	return localStorage.getItem(CORS_PROXY_KEY) ?? DEFAULT_PROXY;
}

export const corsProxy = writable<string>(DEFAULT_PROXY);

export function initSettings(): void {
	corsProxy.set(loadCorsProxy());
}

corsProxy.subscribe((value) => {
	if (typeof localStorage !== 'undefined') {
		localStorage.setItem(CORS_PROXY_KEY, value);
	}
});
