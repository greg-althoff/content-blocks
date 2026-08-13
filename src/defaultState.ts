import { v4 as uuid } from 'uuid';
import type { AppState } from './types';

export function createDefaultState(): AppState {
  return {
    meta: {
      page: 'Home Page',
      client: 'Alan Gartenhaus',
      version: '1.0',
      preparedBy: 'Creative Isles',
      contact: 'aloha@creativeisles.com',
    },
    items: [
      {
        id: uuid(),
        type: 'content',
        label: 'Top Banner: Polu Resorts is officially launching Fall of 2025',
        ctas: [],
      },
      {
        id: uuid(),
        type: 'content',
        label: 'Logo and Menu Area',
        ctas: ['Book Your Stay'],
      },
      {
        id: uuid(),
        type: 'focus',
        label: "Featured: Hali'i Kai Resort",
        ctas: ['Book Your Stay'],
      },
      { id: uuid(), type: 'fold' },
      {
        id: uuid(),
        type: 'content',
        label: "Hali'i Kai Property Info (Images / Video)",
        ctas: [],
      },
      {
        id: uuid(),
        type: 'content',
        label: 'Sub-Features (Activities, Modern Guest Exp, Hospitality, Included in your Stay)',
        ctas: [],
      },
      {
        id: uuid(),
        type: 'content',
        label: 'Contact Information Area',
        ctas: ['Submit Form'],
      },
      { id: uuid(), type: 'footer' },
    ],
  };
}

export function createEmptyState(): AppState {
  return {
    meta: {
      page: 'Untitled Page',
      client: '',
      version: '1.0',
      preparedBy: '',
      contact: '',
    },
    items: [],
  };
}
