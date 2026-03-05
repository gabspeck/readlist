// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		interface Platform {
			env: Env;
			ctx: ExecutionContext;
			caches: CacheStorage;
			cf?: IncomingRequestCfProperties
		}

		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
	}

	const google: { 
		accounts: { 
			oauth2: { 
				initTokenClient(
					config: { 
						client_id: string;
						scope: string;
						callback: (
							response: { 
								access_token: string;
								expires_in: string | number;
								error?: string
							 }
						) => void;
						error_callback?: (err: { message?: string; type?: string }) => void
					 }
				): { requestAccessToken(opts: { prompt?: string }): void }
			 }
		 }
	 };
}

export {};
