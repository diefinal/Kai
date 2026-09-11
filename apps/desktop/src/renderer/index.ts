export * from './types';
export * from './components';
export * from './App';

export function initializeRenderer(): void {
  if (typeof document !== 'undefined') {
    const appElement = document.getElementById('app');
    if (appElement) {
      const app = new (require('./App').RendererApp)();
      app.mount(appElement);
    }
  }
}