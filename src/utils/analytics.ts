type DataLayerEvent = Record<string, unknown>;

declare global {
  interface Window {
    dataLayer: DataLayerEvent[];
  }
}

export function initDataLayer(): void {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = [];
  }
}

export function pushDataLayerEvent(event: DataLayerEvent): void {
  if (typeof window !== 'undefined' && Array.isArray(window.dataLayer)) {
    window.dataLayer.push(event);
  }
}
