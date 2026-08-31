'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2 } from 'lucide-react';
import { AdminBlogCard } from '../../../components/admin/AdminBlogCard';
import { ToastContainer } from '../../../components/ui/Toast';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog';
import { loadAllPostsForAdmin, BlogPost } from '../../../utils/blogLoader';
import { supabase } from '../../../lib/supabase';
import { useToast } from '../../../hooks/useToast';

type FilterType = 'all' | 'published' | 'drafts';

export default function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [postToPublish, setPostToPublish] = useState<{ id: string; title: string } | null>(null);
  const router = useRouter();
  const { toasts, showToast, closeToast } = useToast();

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    setLoading(true);
    const data = await loadAllPostsForAdmin();
    setPosts(data);
    setLoading(false);
  };

  const filteredPosts = posts.filter((post) => {
    if (activeFilter === 'published') return !post.isDraft;
    if (activeFilter === 'drafts') return post.isDraft;
    return true;
  });

  const handleEdit = (postId: string) => {
    router.push(`/admin/blog/edit/${postId}`);
  };

  const handleToggleStatus = async (postId: string, currentIsDraft: boolean): Promise<void> => {
    const post = posts.find((p) => p.id === postId);

    if (currentIsDraft && post) {
      setPostToPublish({ id: postId, title: post.title });
      setPublishModalOpen(true);
      return;
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_draft: !currentIsDraft })
        .eq('id', postId);

      if (error) throw error;

      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === postId ? { ...p, isDraft: !currentIsDraft } : p))
      );
      showToast('success', currentIsDraft ? 'Post published successfully!' : 'Post unpublished successfully!');
    } catch (error) {
      console.error('Error toggling post status:', error);
      showToast('error', 'Failed to update post status');
      throw error;
    }
  };

  const confirmPublish = async () => {
    if (!postToPublish) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_draft: false })
        .eq('id', postToPublish.id);

      if (error) throw error;

      setPosts((prevPosts) =>
        prevPosts.map((p) => (p.id === postToPublish.id ? { ...p, isDraft: false } : p))
      );
      showToast('success', 'Post published successfully!');
      setPublishModalOpen(false);
      setPostToPublish(null);
    } catch (error) {
      console.error('Error publishing post:', error);
      showToast('error', 'Failed to publish post');
    }
  };

  const handleDelete = (postId: string) => {
    setPostToDelete(postId);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!postToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('posts').delete().eq('id', postToDelete);
      if (error) throw error;
      setPosts((prevPosts) => prevPosts.filter((p) => p.id !== postToDelete));
      showToast('success', 'Post deleted successfully');
      setDeleteModalOpen(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('error', 'Failed to delete post');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRepublish = (postId: string) => {
    router.push(`/admin/blog/republish/${postId}`);
  };

  return (
    <>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Blog Posts</h2>
          <p className="text-gray-600">Manage your blog posts and drafts</p>
        </div>
        <button
          onClick={() => router.push('/admin/blog/create')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>New Post</span>
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
        {(['all', 'published', 'drafts'] as FilterType[]).map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeFilter === f
                ? 'text-black border-b-2 border-black'
                : 'text-gray-500 hover:text-black'
            }`}
          >
            {f === 'all' && `All (${posts.length})`}
            {f === 'published' && `Published (${posts.filter((p) => !p.isDraft).length})`}
            {f === 'drafts' && `Drafts (${posts.filter((p) => p.isDraft).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={40} className="text-gray-400 animate-spin" />
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">
            {activeFilter === 'all'
              ? 'No posts yet'
              : activeFilter === 'published'
              ? 'No published posts'
              : 'No draft posts'}
          </p>
          <button
            onClick={() => router.push('/admin/blog/create')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Plus size={20} />
            <span>Create Your First Post</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredPosts.map((post) => (
            <AdminBlogCard
              key={post.id}
              post={post}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onRepublish={handleRepublish}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={publishModalOpen && !!postToPublish}
        variant="primary"
        title="Make Post Public"
        message={`Are you sure you want to make "${postToPublish?.title ?? ''}" visible to the public?`}
        note="This will keep the original publication date and make the post publicly visible."
        confirmLabel="Make Public"
        onCancel={() => { setPublishModalOpen(false); setPostToPublish(null); }}
        onConfirm={confirmPublish}
      />

      <ConfirmDialog
        open={deleteModalOpen}
        title="Delete Post"
        message="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        loadingLabel="Deleting..."
        loading={isDeleting}
        onCancel={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
