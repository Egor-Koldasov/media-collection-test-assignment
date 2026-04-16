const documentScene = new URL(
  '../../assets/document-previews/document-scene.svg',
  import.meta.url
).href;

export function getDocumentPreviewUrl(): string {
  return documentScene;
}
