import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchMediaPage, uploadFile } from '../mockMediaApi';

describe('mockMediaApi', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('returns a paginated media response', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.9);

    const responsePromise = fetchMediaPage(1);

    await vi.advanceTimersByTimeAsync(500);

    const response = await responsePromise;

    expect(response.items).toHaveLength(12);
    expect(response.nextPage).toBe(2);
    expect(response.total).toBe(60);
  });

  it('simulates occasional page failures', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.1);

    const responsePromise = fetchMediaPage(1);
    const rejection = expect(responsePromise).rejects.toThrow(/retry/i);

    await vi.advanceTimersByTimeAsync(500);

    await rejection;
  });

  it('reports upload progress and resolves on success', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    const progressUpdates: number[] = [];
    const controller = new AbortController();
    const uploadPromise = uploadFile(
      new File(['image'], 'hero.png', { type: 'image/png' }),
      (progress) => progressUpdates.push(progress),
      controller.signal
    );

    await vi.advanceTimersByTimeAsync(3_000);

    const response = await uploadPromise;

    expect(progressUpdates[0]).toBe(0);
    expect(progressUpdates.at(-1)).toBe(100);
    expect(response.url).toContain('hero.png');
  });

  it('rejects with AbortError when cancelled', async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, 'random').mockReturnValue(0.9);

    const controller = new AbortController();
    const uploadPromise = uploadFile(
      new File(['video'], 'clip.mp4', { type: 'video/mp4' }),
      () => undefined,
      controller.signal
    );

    controller.abort();
    await Promise.resolve();

    await expect(uploadPromise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
