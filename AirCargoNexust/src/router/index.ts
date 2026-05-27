import { writable, derived, type Readable, type Writable } from 'svelte/store';

export interface RouteParams {
  [key: string]: string;
}

export interface RouteMatch {
  path: string;
  params: RouteParams;
}

const currentPath: Writable<string> = writable(window.location.pathname);

export function navigate(path: string) {
  window.history.pushState({}, '', path);
  currentPath.set(path);
}

export function goBack() {
  window.history.back();
}

export function getRouteParams(pattern: string, path: string): RouteParams | null {
  const patternParts = pattern.split('/').filter(Boolean);
  const pathParts = path.split('/').filter(Boolean);

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: RouteParams = {};

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    if (patternPart.startsWith(':')) {
      params[patternPart.slice(1)] = decodeURIComponent(pathPart);
    } else if (patternPart !== pathPart) {
      return null;
    }
  }

  return params;
}

export function matchRoute(routes: string[], path: string): RouteMatch | null {
  for (const route of routes) {
    const params = getRouteParams(route, path);
    if (params !== null) {
      return { path: route, params };
    }
  }
  return null;
}

window.addEventListener('popstate', () => {
  currentPath.set(window.location.pathname);
});

export const currentRoute: Readable<string> = currentPath;

export function createParamStore(pattern: string): Readable<RouteParams | null> {
  return derived(currentPath, ($path) => {
    return getRouteParams(pattern, $path);
  });
}
