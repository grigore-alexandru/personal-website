'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link2, Loader2, Plus } from 'lucide-react';
import { SearchBar } from '../../../components/ui/SearchBar';
import { ToastContainer } from '../../../components/ui/Toast';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import CustomDropdown from '../../../components/forms/CustomDropdown';
import { LinkCard } from '../../../components/links/LinkCard';
import { NewLinkCard } from '../../../components/links/NewLinkCard';
import { InterstitialEditorModal } from '../../../components/links/InterstitialEditorModal';
import { QrModal } from '../../../components/links/QrModal';
import { LinkStatsModal } from '../../../components/links/LinkStatsModal';
import { useToast } from '../../../hooks/useToast';
import { createLink, deleteLink, listLinks, updateLink } from '../../../utils/linksService';
import type { Link as LinkRecord, LinkPatch, NewLinkInput } from '../../../types/links';

type SortKey = 'newest' | 'oldest' | 'most-clicked' | 'name';

const sortOptions = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most-clicked', label: 'Most clicked' },
  { value: 'name', label: 'Name (A–Z)' },
];

export default function LinksManagementPage() {
  const [links, setLinks] = useState<LinkRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('newest');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [linkToDelete, setLinkToDelete] = useState<LinkRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [interstitialLink, setInterstitialLink] = useState<LinkRecord | null>(null);
  const [qrLink, setQrLink] = useState<LinkRecord | null>(null);
  const [statsLink, setStatsLink] = useState<LinkRecord | null>(null);

  const { toasts, showToast, closeToast } = useToast();

  const loadLinks = useCallback(async () => {
    setLoading(true);
    try {
      setLinks(await listLinks());
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not load links');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadLinks();
  }, [loadLinks]);

  /** Single write path for every inline edit, so the list stays in step with
   *  the row the database actually returned. */
  const handlePatch = useCallback(
    async (id: string, patch: LinkPatch) => {
      const updated = await updateLink(id, patch);
      setLinks((prev) => prev.map((l) => (l.id === id ? updated : l)));
      // Keep any open modal pointed at the fresh record.
      setInterstitialLink((cur) => (cur?.id === id ? updated : cur));
      setQrLink((cur) => (cur?.id === id ? updated : cur));
    },
    []
  );

  const handleCreate = async (input: NewLinkInput) => {
    const created = await createLink(input);
    setLinks((prev) => [created, ...prev]);
    setCreating(false);
    setExpandedId(created.id);
    showToast('success', 'Link created');
  };

  const handleConfirmDelete = async () => {
    if (!linkToDelete) return;
    setDeleting(true);
    try {
      await deleteLink(linkToDelete.id);
      setLinks((prev) => prev.filter((l) => l.id !== linkToDelete.id));
      showToast('success', 'Link deleted');
      setLinkToDelete(null);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Could not delete this link');
    } finally {
      setDeleting(false);
    }
  };

  const visibleLinks = useMemo(() => {
    const needle = search.trim().toLowerCase();

    const filtered = needle
      ? links.filter((l) =>
          [l.name, l.slug, l.destinationUrl, l.description ?? '']
            .join(' ')
            .toLowerCase()
            .includes(needle)
        )
      : links;

    const sorted = [...filtered];
    switch (sort) {
      case 'oldest':
        sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        break;
      case 'most-clicked':
        sorted.sort((a, b) => b.clickCount - a.clickCount);
        break;
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return sorted;
  }, [links, search, sort]);

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Links</h2>
          <p className="text-gray-600">Short links, QR codes, and redirect animations</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          disabled={creating}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 flex-shrink-0"
        >
          <Plus size={20} />
          <span>New Link</span>
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search links by name, slug, or destination..."
          className="flex-1"
        />
        <div className="w-full sm:w-52">
          <CustomDropdown
            options={sortOptions}
            value={sort}
            onChange={(value: string) => setSort(value as SortKey)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-gray-400 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {creating && (
            <NewLinkCard onCreate={handleCreate} onCancel={() => setCreating(false)} />
          )}

          {visibleLinks.length === 0 && !creating ? (
            <div className="text-center py-20">
              <Link2 size={40} className="text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-4">
                {search ? 'No links match that search' : 'No links yet'}
              </p>
              {!search && (
                <button
                  onClick={() => setCreating(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Plus size={20} />
                  <span>Create Your First Link</span>
                </button>
              )}
            </div>
          ) : (
            visibleLinks.map((link) => (
              <LinkCard
                key={link.id}
                link={link}
                expanded={expandedId === link.id}
                onToggleExpand={() => setExpandedId(expandedId === link.id ? null : link.id)}
                onPatch={handlePatch}
                onDelete={() => setLinkToDelete(link)}
                onOpenStats={() => setStatsLink(link)}
                onOpenQr={() => setQrLink(link)}
                onEditInterstitial={() => setInterstitialLink(link)}
                onToast={showToast}
              />
            ))
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!linkToDelete}
        title="Delete Link"
        message={`Are you sure you want to delete "${linkToDelete?.name ?? ''}"? This action cannot be undone.`}
        note="Any printed QR code or card pointing at this short link will stop working, and its click history will be removed."
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={deleting}
        onCancel={() => setLinkToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      <InterstitialEditorModal
        open={!!interstitialLink}
        link={interstitialLink}
        onClose={() => setInterstitialLink(null)}
        onSave={handlePatch}
        onToast={showToast}
      />

      <QrModal
        open={!!qrLink}
        link={qrLink}
        onClose={() => setQrLink(null)}
        onToast={showToast}
      />

      <LinkStatsModal
        open={!!statsLink}
        link={statsLink}
        onClose={() => setStatsLink(null)}
      />
    </>
  );
}
