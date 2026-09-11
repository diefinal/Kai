import { RendererApp } from './RendererApp';

export * from './types';
export * from './components';
export * from './RendererApp';

export function initializeRenderer(): void {
  if (typeof document !== 'undefined') {
    const appElement = document.getElementById('app');
    if (appElement) {
      const app = new RendererApp();
      app.mount(appElement);
    }
  }
}