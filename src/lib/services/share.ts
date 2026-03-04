export async function shareOrDownload(blob: Blob, filename: string, title: string): Promise<void> {
	const file = new File([blob], filename, { type: blob.type });

	if (navigator.canShare && navigator.canShare({ files: [file] })) {
		await navigator.share({ files: [file], title });
	} else {
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		setTimeout(() => URL.revokeObjectURL(url), 10_000);
	}
}

export function copyToClipboard(text: string): Promise<void> {
	return navigator.clipboard.writeText(text);
}
