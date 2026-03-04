// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	const google: {
		accounts: {
			oauth2: {
				initTokenClient(config: {
					client_id: string;
					scope: string;
					callback: (response: {
						access_token: string;
						expires_in: string | number;
						error?: string;
					}) => void;
					error_callback?: (err: { message?: string; type?: string }) => void;
				}): {
					requestAccessToken(opts?: { prompt?: string }): void;
				};
			};
		};
	};
}

export {};
