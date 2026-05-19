import { beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
