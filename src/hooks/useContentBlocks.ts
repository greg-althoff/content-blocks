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
import {
  LiveShareSaveManager,
  createShare,
  fetchShare,
  parseSharePath,
  toAbsoluteShareUrl,
  type SaveStatus,
} from '../lib/shareApi';
import { SharedPageSession } from '../lib/sharedPageSession';
import {
  INITIAL_SHARED_PAGE_SAVE_UI,
  reduceSharedPageSaveUi,
  type SharedPageSaveUiState,
} from '../lib/sharedPageSaveUi';
import { isPristineEmpty } from '../lib/richText';
import type { AppState, BlockItem, CanvasItem, Meta } from '../types';
import { isBlock } from '../types';

const MAX_CTAS = 2;
const HASH_FALLBACK_TOAST =
  'Short-link service unavailable—copied an offline-compatible share link instead.';

export function useContentBlocks() {
  const [startBlank] = useState(isNewPageRequest);
  const [liveShareId, setLiveShareId] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : parseSharePath(),
  );
  const [hashOnLoad] = useState(() =>
    startBlank || liveShareId || typeof window === 'undefined' ? '' : window.location.hash.slice(1),
  );
  const [state, setState] = useState<AppState>(() => {
    if (startBlank || liveShareId) return createEmptyState();
    return getFallbackState();
  });
  const [ready, setReady] = useState(!hashOnLoad && !liveShareId);
  const [loadingSharedPage, setLoadingSharedPage] = useState(Boolean(liveShareId));
  const [sharedPageHydrated, setSharedPageHydrated] = useState(false);
  const [sharedPageLoadError, setSharedPageLoadError] = useState(false);
  const [serverVersion, setServerVersion] = useState(1);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [sharedPageSaveUi, setSharedPageSaveUi] = useState<SharedPageSaveUiState>(
    INITIAL_SHARED_PAGE_SAVE_UI,
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const persistGen = useRef(0);
  const persistTimer = useRef<number | undefined>(undefined);
  const toastTimer = useRef<number | undefined>(undefined);
  const serverVersionRef = useRef(1);
  const saveManagerRef = useRef<LiveShareSaveManager | null>(null);
  const liveShareIdRef = useRef<string | null>(liveShareId);
  const sharedPageSessionRef = useRef(new SharedPageSession());
  const skipInitialFetchRef = useRef(false);
  const stateRef = useRef(state);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const handleSaveStatusChange = useCallback((status: SaveStatus) => {
    setSaveStatus(status);
    setSharedPageSaveUi((prev) => reduceSharedPageSaveUi(prev, status));
  }, []);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    serverVersionRef.current = serverVersion;
  }, [serverVersion]);

  useEffect(() => {
    liveShareIdRef.current = liveShareId;
  }, [liveShareId]);

  useEffect(() => {
    if (startBlank) stripNewPageParam();
  }, [startBlank]);

  const recordSharedPageUserEdit = useCallback(() => {
    if (sharedPageSessionRef.current.isHydrated()) {
      sharedPageSessionRef.current.recordUserEdit();
    }
  }, []);

  useEffect(() => {
    saveManagerRef.current?.destroy();
    saveManagerRef.current = null;

    if (!liveShareId) {
      sharedPageSessionRef.current.reset();
      setLoadingSharedPage(false);
      setSharedPageHydrated(false);
      setSharedPageLoadError(false);
      return;
    }

    const manager = new LiveShareSaveManager({
      shareId: liveShareId,
      getServerVersion: () => serverVersionRef.current,
      setServerVersion: (version) => {
        serverVersionRef.current = version;
        setServerVersion(version);
      },
      onStatusChange: handleSaveStatusChange,
    });
    manager.setEnabled(false);
    saveManagerRef.current = manager;

    return () => {
      manager.destroy();
      if (saveManagerRef.current === manager) {
        saveManagerRef.current = null;
      }
    };
  }, [liveShareId]);

  useEffect(() => {
    if (!liveShareId) return;

    let cancelled = false;

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      sharedPageSessionRef.current.completeHydration();
      saveManagerRef.current?.markLoaded(stateRef.current);
      saveManagerRef.current?.setEnabled(true);
      setSharedPageHydrated(true);
      setLoadingSharedPage(false);
      setSharedPageLoadError(false);
      setReady(true);
      return;
    }

    sharedPageSessionRef.current.beginLoad();
    saveManagerRef.current?.setEnabled(false);

    setLoadingSharedPage(true);
    setSharedPageHydrated(false);
    setSharedPageLoadError(false);
    setReady(false);
    setSaveStatus('idle');
    setSharedPageSaveUi(INITIAL_SHARED_PAGE_SAVE_UI);

    fetchShare(liveShareId)
      .then((shared) => {
        if (cancelled) return;

        saveManagerRef.current?.setEnabled(false);
        saveManagerRef.current?.markLoaded(shared.state);
        sharedPageSessionRef.current.completeHydration();
        serverVersionRef.current = shared.version;
        setServerVersion(shared.version);
        setState(shared.state);
        saveManagerRef.current?.setEnabled(true);
        setSharedPageHydrated(true);
        setLoadingSharedPage(false);
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        sharedPageSessionRef.current.failLoad();
        saveManagerRef.current?.setEnabled(false);
        setSharedPageLoadError(true);
        setLoadingSharedPage(false);
        setSharedPageHydrated(false);
        setReady(true);
        showToast('Could not load shared page');
      });

    return () => {
      cancelled = true;
    };
  }, [liveShareId, showToast]);

  useEffect(() => {
    if (!hashOnLoad || liveShareId) return;
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
  }, [hashOnLoad, liveShareId]);

  useEffect(() => {
    if (!ready || liveShareId) return;
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
  }, [state, ready, liveShareId]);

  useEffect(() => {
    if (!ready || !liveShareId || !sharedPageHydrated || sharedPageLoadError) return;
    if (saveStatus === 'conflict') return;
    if (!sharedPageSessionRef.current.canAutosave()) return;
    saveManagerRef.current?.scheduleSave(state);
  }, [state, ready, liveShareId, sharedPageHydrated, sharedPageLoadError, saveStatus]);

  useEffect(() => {
    return () => {
      window.clearTimeout(toastTimer.current);
      window.clearTimeout(persistTimer.current);
      saveManagerRef.current?.destroy();
    };
  }, []);

  const reloadSharedPage = useCallback(() => {
    window.location.reload();
  }, []);

  const retrySharedPageSave = useCallback(async () => {
    if (!liveShareIdRef.current || !sharedPageSessionRef.current.canSharePut()) return;
    await saveManagerRef.current?.flushSave(stateRef.current);
  }, []);

  const selected = state.items.find((item) => item.id === selectedId) ?? null;
  const selectedBlock = selected && isBlock(selected) ? selected : null;

  const insertItem = useCallback((item: CanvasItem) => {
    recordSharedPageUserEdit();
    setState((prev) => {
      const items = [...prev.items];
      const index = selectedId ? items.findIndex((entry) => entry.id === selectedId) : -1;
      const at = index >= 0 ? index + 1 : items.length;
      items.splice(at, 0, item);
      return { ...prev, items };
    });
    setSelectedId(item.id);
  }, [recordSharedPageUserEdit, selectedId]);

  const insertItemAt = useCallback((index: number, item: CanvasItem) => {
    recordSharedPageUserEdit();
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
  }, [recordSharedPageUserEdit]);

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
    recordSharedPageUserEdit();
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === target.id && isBlock(item)
          ? { ...item, ctas: [...item.ctas, 'Learn More'] }
          : item,
      ),
    }));
    setSelectedId(target.id);
  }, [recordSharedPageUserEdit, selectedId, showToast, state.items]);

  const updateMeta = useCallback((patch: Partial<Meta>) => {
    recordSharedPageUserEdit();
    setState((prev) => ({ ...prev, meta: { ...prev.meta, ...patch } }));
  }, [recordSharedPageUserEdit]);

  const updateBlock = useCallback((id: string, patch: Partial<Pick<BlockItem, 'label' | 'ctas'>>) => {
    recordSharedPageUserEdit();
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id && isBlock(item) ? { ...item, ...patch } : item,
      ),
    }));
  }, [recordSharedPageUserEdit]);

  const updateCta = useCallback((id: string, index: number, value: string) => {
    recordSharedPageUserEdit();
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id || !isBlock(item)) return item;
        const ctas = [...item.ctas];
        ctas[index] = value;
        return { ...item, ctas };
      }),
    }));
  }, [recordSharedPageUserEdit]);

  const removeCta = useCallback((id: string, index: number) => {
    recordSharedPageUserEdit();
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id !== id || !isBlock(item)) return item;
        return { ...item, ctas: item.ctas.filter((_, i) => i !== index) };
      }),
    }));
  }, [recordSharedPageUserEdit]);

  const removeItem = useCallback((id: string) => {
    recordSharedPageUserEdit();
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
    setSelectedId((current) => (current === id ? null : current));
  }, [recordSharedPageUserEdit]);

  const reorder = useCallback((activeId: string, overId: string) => {
    recordSharedPageUserEdit();
    setState((prev) => {
      const oldIndex = prev.items.findIndex((item) => item.id === activeId);
      const newIndex = prev.items.findIndex((item) => item.id === overId);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return prev;
      return { ...prev, items: arrayMove(prev.items, oldIndex, newIndex) };
    });
  }, [recordSharedPageUserEdit]);

  const openNewPage = useCallback(() => {
    const opened = window.open(newPageUrl(), '_blank');
    if (opened) opened.opener = null;
    if (!opened) showToast('Allow pop-ups to open a new page');
  }, [showToast]);

  const share = useCallback(async () => {
    const currentLiveId = liveShareIdRef.current;

    if (currentLiveId) {
      if (!sharedPageSessionRef.current.canSharePut()) {
        showToast('Shared page is still loading');
        return;
      }

      const absoluteUrl = toAbsoluteShareUrl(`/p/${currentLiveId}`);
      try {
        await saveManagerRef.current?.flushSave(stateRef.current);
        const copied = await copyTextFromAsync(async () => absoluteUrl);
        if (copied) {
          showToast('Copied!');
          return;
        }
        window.prompt('Copy this share link:', absoluteUrl);
      } catch {
        showToast('Could not save shared page before copying link');
      }
      return;
    }

    const makeHashUrl = async () => {
      const encoded = await encodeState(stateRef.current);
      const url = `${window.location.origin}${window.location.pathname}${window.location.search}#${encoded}`;
      history.replaceState(null, '', `#${encoded}`);
      return url;
    };

    try {
      const created = await createShare(stateRef.current);
      skipInitialFetchRef.current = true;
      history.replaceState(null, '', created.url);
      serverVersionRef.current = created.version;
      setServerVersion(created.version);
      setLiveShareId(created.id);
      liveShareIdRef.current = created.id;

      const copied = await copyTextFromAsync(async () => created.absoluteUrl);
      if (copied) {
        showToast('Copied!');
        return;
      }
      window.prompt('Copy this share link:', created.absoluteUrl);
      return;
    } catch {
      // Fall back to hash-link sharing below.
    }

    try {
      const copied = await copyTextFromAsync(makeHashUrl);
      if (copied) {
        showToast(HASH_FALLBACK_TOAST);
        return;
      }
    } catch {
      // Fall through to prompt.
    }

    try {
      const url = await makeHashUrl();
      window.prompt('Copy this share link:', url);
      showToast(HASH_FALLBACK_TOAST);
    } catch {
      showToast('Could not copy link');
    }
  }, [showToast]);

  return {
    ready,
    state,
    selectedId,
    selectedBlock,
    liveShareId,
    loadingSharedPage,
    sharedPageLoadError,
    saveStatus,
    sharedPageSaveUi,
    retrySharedPageSave,
    reloadSharedPage,
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
