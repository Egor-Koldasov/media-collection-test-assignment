import { delay, http, HttpResponse } from 'msw';

import { createMediaPage, randomLatency } from './mediaData';

export const handlers = [
  http.get('/api/media', async ({ request }) => {
    await delay(randomLatency());

    if (Math.random() < 0.15) {
      return HttpResponse.json(
        { message: 'This section could not be loaded right now. Please retry.' },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');

    if (!Number.isFinite(page) || page < 1) {
      return HttpResponse.json(
        { message: 'A valid page number is required.' },
        { status: 400 }
      );
    }

    return HttpResponse.json(createMediaPage(page));
  }),

  http.post('/api/uploads', async ({ request }) => {
    await delay(1_400 + Math.floor(Math.random() * 601));

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return HttpResponse.json(
        { message: 'No upload file was provided.' },
        { status: 400 }
      );
    }

    if (Math.random() < 0.2) {
      return HttpResponse.json(
        { message: `Could not upload ${file.name}. Please try again.` },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      url: `https://mock.media/uploads/${encodeURIComponent(file.name)}-${Date.now()}`
    });
  })
];
