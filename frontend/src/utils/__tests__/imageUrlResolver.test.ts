import { describe, it, expect, beforeAll } from 'vitest';
import { resolveImageUrl } from '../imageUrlResolver';

describe('imageUrlResolver', () => {
  beforeAll(() => {
    // jsdom 默认 protocol 为 http:
    // 确保 window.location.origin 可用
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost:5173/')
    });
  });

  it('rewrites localhost port from 5000 to current backend origin', () => {
    const raw = 'http://localhost:5000/uploads/analysis/a.jpg';
    const res = resolveImageUrl(raw);
    expect(res).toMatch('http://localhost:5003/uploads/analysis/a.jpg');
  });

  it('handles absolute relative path starting with /uploads', () => {
    const raw = '/uploads/analysis/b.png';
    const res = resolveImageUrl(raw);
    expect(res).toBe('http://localhost:5003/uploads/analysis/b.png');
  });

  it('handles relative path starting with uploads', () => {
    const raw = 'uploads/analysis/c.webp';
    const res = resolveImageUrl(raw);
    expect(res).toBe('http://localhost:5003/uploads/analysis/c.webp');
  });

  it('adds uploads prefix for known subdir (analysis)', () => {
    const raw = 'analysis/d.jpg';
    const res = resolveImageUrl(raw);
    expect(res).toBe('http://localhost:5003/uploads/analysis/d.jpg');
  });

  it('defaults to analysis when only filename provided', () => {
    const raw = 'e.jpg';
    const res = resolveImageUrl(raw);
    expect(res).toBe('http://localhost:5003/uploads/analysis/e.jpg');
  });

  it('keeps CDN absolute URL unchanged', () => {
    const raw = 'https://cdn.example.com/img/f.jpg';
    const res = resolveImageUrl(raw);
    expect(res).toBe(raw);
  });

  it('normalizes protocol-relative URL', () => {
    const raw = '//cdn.example.com/img/g.jpg';
    const res = resolveImageUrl(raw);
    expect(res).toBe('http://cdn.example.com/img/g.jpg');
  });

  it('returns placeholder for invalid URL', () => {
    const raw = '::::invalid-url::::';
    const res = resolveImageUrl(raw);
    expect(res).toBe('/pwa-192x192.png');
  });
});