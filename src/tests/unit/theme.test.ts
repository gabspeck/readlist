import { describe, it, expect, beforeEach } from 'vitest';
import { cycleTheme, applyTheme } from '$lib/stores/theme';

describe('cycleTheme', () => {
	it('cycles system → dark', () => {
		expect(cycleTheme('system')).toBe('dark');
	});

	it('cycles dark → light', () => {
		expect(cycleTheme('dark')).toBe('light');
	});

	it('cycles light → system', () => {
		expect(cycleTheme('light')).toBe('system');
	});
});

describe('applyTheme', () => {
	beforeEach(() => {
		// Reset the attribute before each test
		document.documentElement.removeAttribute('data-theme');
	});

	it('sets data-theme="dark" for dark theme', () => {
		applyTheme('dark');
		expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
	});

	it('sets data-theme="light" for light theme', () => {
		applyTheme('light');
		expect(document.documentElement.getAttribute('data-theme')).toBe('light');
	});

	it('removes data-theme for system theme', () => {
		document.documentElement.setAttribute('data-theme', 'dark');
		applyTheme('system');
		expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
	});
});
