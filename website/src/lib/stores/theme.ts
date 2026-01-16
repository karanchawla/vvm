import { writable } from 'svelte/store';
import { browser } from '$app/environment';

type Theme = 'light' | 'dark';

function getInitialTheme(): Theme {
	if (!browser) return 'light';

	// Check localStorage first
	const stored = localStorage.getItem('theme');
	if (stored === 'dark' || stored === 'light') {
		return stored;
	}

	// Fall back to system preference
	if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
		return 'dark';
	}

	return 'light';
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,
		set: (value: Theme) => {
			if (browser) {
				localStorage.setItem('theme', value);
				updateDocumentClass(value);
			}
			set(value);
		},
		toggle: () => {
			update((current) => {
				const next = current === 'light' ? 'dark' : 'light';
				if (browser) {
					localStorage.setItem('theme', next);
					updateDocumentClass(next);
				}
				return next;
			});
		},
		init: () => {
			if (browser) {
				const theme = getInitialTheme();
				updateDocumentClass(theme);
				set(theme);

				// Listen for system preference changes
				window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
					// Only auto-switch if user hasn't set a preference
					if (!localStorage.getItem('theme')) {
						const newTheme = e.matches ? 'dark' : 'light';
						updateDocumentClass(newTheme);
						set(newTheme);
					}
				});
			}
		}
	};
}

function updateDocumentClass(theme: Theme) {
	if (browser) {
		document.documentElement.classList.remove('light', 'dark');
		document.documentElement.classList.add(theme);
	}
}

export const theme = createThemeStore();
