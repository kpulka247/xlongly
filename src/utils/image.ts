export async function dataURLtoBlob(dataurl: string): Promise<Blob> {
    const response = await fetch(dataurl);
    if (!response.ok) {
        throw new Error(`Failed to fetch data URL: ${response.statusText}`);
    }
    return await response.blob();
}