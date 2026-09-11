export * from './App';

export function initializeRenderer(): void {
  if (typeof document !== 'undefined') {
    const appElement = document.getElementById('app');
    if (appElement) {
      appElement.innerHTML = '<h1 class="title">Kai Desktop</h1><p class="status">Loading...</p>';
    }
  }
}