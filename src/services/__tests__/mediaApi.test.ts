import { delay, http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { server } from '../../mocks/server';
import { uploadFile, fetchMediaPage } from '../mediaApi';

describe('mediaApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a paginated media response through the MSW request boundary', async () => {
    server.use(
      http.get('/api/media', async () => {
        await delay(20);

        return HttpResponse.json({
          items: Array.from({ length: 12 }, (_, index) => ({
            id: `seed-${index + 1}`,
            name: `Item ${index + 1}.png`,
            type: 'image',
            size: 120_000 + index,
            createdAt: '2026-04-01T12:00:00.000Z'
          })),
          nextPage: 2,
          total: 60
        });
      })
    );

    const response = await fetchMediaPage(1);

    expect(response.items).toHaveLength(12);
    expect(response.nextPage).toBe(2);
    expect(response.total).toBe(60);
  });

  it('surfaces occasional page failures from the mock backend', async () => {
    server.use(
      http.get('/api/media', async () => {
        await delay(20);

        return HttpResponse.json(
          { message: 'This section could not be loaded right now. Please retry.' },
          { status: 500 }
        );
      })
    );

    await expect(fetchMediaPage(1)).rejects.toThrow(/retry/i);
  });

  it(
    'reports upload progress and resolves on success',
    async () => {
      server.use(
        http.post('/api/uploads', async () => {
          await delay(800);

          return HttpResponse.json({
            url: 'https://mock.media/uploads/hero.png-123'
          });
        })
      );

      const progressUpdates: number[] = [];
      const controller = new AbortController();
      const uploadPromise = uploadFile(
        new File(['image'], 'hero.png', { type: 'image/png' }),
        (progress) => progressUpdates.push(progress),
        controller.signal
      );

      const response = await uploadPromise;

      expect(progressUpdates[0]).toBe(0);
      expect(progressUpdates.at(-1)).toBe(100);
      expect(progressUpdates.length).toBeGreaterThan(2);
      expect(response.url).toContain('hero.png');
    },
    4_000
  );

  it('rejects with AbortError when cancelled', async () => {
    server.use(
      http.post('/api/uploads', async () => {
        await delay(2_000);

        return HttpResponse.json({
          url: 'https://mock.media/uploads/clip.mp4-123'
        });
      })
    );

    const controller = new AbortController();
    const uploadPromise = uploadFile(
      new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
      () => undefined,
      controller.signal
    );

    controller.abort();

    await expect(uploadPromise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
