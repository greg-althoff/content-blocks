import { useCallback, useEffect, useRef, useState } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import { v4 as uuid } from 'uuid';
import { createEmptyState } from '../defaultState';
import {
  decodeState,
  encodeState,
  getFallbackState,
  isNewPageRequest,
  newPageUrl,
  saveLocalState,
  stripNewPageParam,
} from '../lib/persistence';
import { copyTextFromAsync } from '../lib/clipboard';
import { isPristineEmpty } from '../lib/richText';
import type { AppState, BlockItem, CanvasItem, Meta } from '../types';
import { isBlock } from '../types';

const MAX_CTAS = 2;

export function useContentBlocks() {
  // Capture once: recomputing these from window.location on re-renders makes the
  // decode effect re-run after the app writes a new hash, reverting fresh edits.
  const [startBlank] = useState(isNewPageRequest);
  const [hashOnLoad] = useState(() =>
    startBlank || typeof window === 'undefined' ? '' : window.location.hash.slice(1),
  );
  const [state, setState] = useState<AppState>(() => (startBlank ? createEmptyState() : getFallbackState()));
  const [ready, setReady] = useState(!hashOnLoad);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const persistGen = useRef(0);
  const persistTimer = useRef<ReturnType<typeof setTimeout>>();
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1800);
  }, []);

  useEffect(() => {
    if (startBlank) stripNewPageParam();
  }, [startBlank]);

  useEffect(() => {
    if (!hashOnLoad) return;
    let cancelled = false;
    decodeState(hashOnLoad)
      .then((decoded) => {
        if (cancelled) return;
        if (decoded) setState(decoded);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [hashOnLoad]);

  useEffect(() => {
    if (!ready) return;
    if (isPristineEmpty(state) && !window.location.hash.slice(1)) {
      return;
    }
    saveLocalState(state);
    window.clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      const gen = ++persistGen.current;
      void encodeState(state).then((encoded) => {
        if (gen !== persistGen.current) return;
        const next = `#${encoded}`;
        if (window.location.hash !== next) {
          history.replaceState(null, '', next);
        }
      });
    }, 120);
  }, [state, ready]);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(persistTimer.current);
    };
  }, []);

  const selected = state.items.find((item) => item.id === selectedId) ?? null;
  const selectedBlock = selected && isBlock(selected) ? selected : null;

  const insertItem = useCallback((item: CanvasItem) => {
    setState((prev) => {
      const items = [...prev.items];
      const index = selectedId ? items.findIndex((entry) => entry.id === selectedId) : -1;
      const at = index >= 0 ? index + 1 : items.length;
      items.splice(at, 0, item);
      return { ...prev, items };
    });
    setSelectedId(item.id);
  }, [selectedId]);

  const insertItemAt = useCallback((index: number, item: CanvasItem) => {
    setState((prev) => {
      if ((item.type === 'fold' || item.type === 'footer') && prev.items.some((entry) => entry.type === item.type)) {
        return prev;
      }
      const items = [...prev.items];
      const at = Math.max(0, Math.min(index, items.length));
      items.splice(at, 0, item);
      return { ...prev, items };
    });
    setSelectedId(item.id);
  }, []);

  const addFocusPoint = useCallback(() => {
    insertItem({
      id: uuid(),
      type: 'focus',
      label: 'Focus Point',
      ctas: [],
    });
  }, [insertItem]);

  const addContentBlock = useCallback(() => {
    insertItem({
      id: uuid(),
      type: 'content',
      label: 'Content Block',
      ctas: [],
    });
  }, [insertItem]);

  const addMarker = useCallback((type: 'fold' | 'footer') => {
    const existing = state.items.find((item) => item.type === type);
    if (existing) {
      setSelectedId(existing.id);
      showToast(type === 'fold' ? 'The Fold is already on the canvas' : 'The Footer is already on the canvas');
      return;
    }
    insertItem({ id: uuid(), type });
  }, [insertItem, showToast, state.items]);

  const addCta = useCallback((blockId?: string) => {
    const targetId = blockId ?? selectedId;
    const target = state.items.find((item) => item.id === targetId);
    if (!target || !isBlock(target)) {
      showToast('Select a Focus Point or Content Block first');
      return;
    }
    if (target.ctas.length >= MAX_CTAS) {
      showToast('Maximum 2 CTAs per block');
      return;
    }
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === target.id && isBlock(item)
          ? { ...item, ctas: [...item.ctas, 'Learn More'] }
          : item,
      ),
    }));
    setSelectedId(target.id);
  }, [selectedId, showToast, state.items]);

  const updateMeta = useCallback((patch: Partial<Meta>) => {
    setState((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }));
  }, []);

  const updateBlock = useCallback((id: string, patch: Partial<Pick<BlockItem, 'label' | 'ctas'>>) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id && isBlock(item) ? { ...item, ...patch } : item,
      ),
    }));
  }, []);

  const updateCta = useCallback((id: string, index: number, value: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id || !isBlock(item)) return item;
        const ctas = [...item.ctas];
        ctas[index] = value;
        return { ...item, ctas };
      }),
    }));
  }, []);

  const removeCta = useCallback((id: string, index: number) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id || !isBlock(item)) return item;
        return { ...item, ctas: item.ctas.filter((_, i) => i !== index) };
      }),
    }));
  }, []);

  const removeItem = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    setSelectedId((current) => (current === id ? null : current));
  }, []);

  const reorder = useCallback((activeId: string, overId: string) => {
    setState((prev) => {
      const oldIndex = prev.items.findIndex((item) => item.id === activeId);
      const newIndex = prev.items.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
    });
  }, []);

  const openNewPage = useCallback(() => {
    const opened = window.open(newPageUrl(), '_blank');
    if (opened) opened.opener = null;
    if (!opened) showToast('Allow pop-ups to open a new page');
  }, [showToast]);

  const share = useCallback(async () => {
    let url = '';
    const makeUrl = async () => {
      const encoded = await encodeState(state);
      url = `${window.location.origin}${window.location.pathname}${window.location.search}#${encoded}`;
      history.replaceState(null, '', `#${encoded}`);
      return url;
    };

    try {
      const copied = await copyTextFromAsync(makeUrl);
      if (copied) {
        showToast('Copied!');
        return;
      }
    } catch {
      // Fall through to the prompt so Safari still has a way to copy.
    }

    if (!url) {
      try {
        url = await makeUrl();
      } catch {
        showToast('Could not copy link');
        return;
      }
    }

    window.prompt('Copy this share link:', url);
  }, [showToast, state]);

  return {
    ready,
    state,
    selectedId,
    selectedBlock,
    toast,
    exporting,
    setExporting,
    setSelectedId,
    showToast,
    insertItemAt,
    addFocusPoint,
    addContentBlock,
    addMarker,
    addCta,
    updateMeta,
    updateBlock,
    updateCta,
    removeCta,
    removeItem,
    reorder,
    openNewPage,
    share,
  };
}
