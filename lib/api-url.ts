const BASE_PATH = '/StudyBuddy';

export function apiUrl(path: string): string {
  if (path.startsWith(`${BASE_PATH}/`)) {
    return path;
  }

  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}