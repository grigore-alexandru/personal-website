import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2 } from 'lucide-react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { AdminBlogCard } from '../../components/admin/AdminBlogCard';
import { loadAllPostsForAdmin, BlogPost } from '../../utils/blogLoader';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../hooks/useToast';

type FilterType = 'all' | 'published' | 'drafts';

export function BlogManagementPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [postToPublish, setPostToPublish] = useState<{ id: string; title: string } | null>(null);
  const navigate = useNavigate();
  const { showToast } = useToast();

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
    navigate(`/admin/blog/edit/${postId}`);
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
        prevPosts.map((post) =>
          post.id === postId ? { ...post, isDraft: !currentIsDraft } : post
        )
      );

      showToast(
        currentIsDraft ? 'Post published successfully!' : 'Post unpublished successfully!',
        'success'
      );
    } catch (error) {
      console.error('Error toggling post status:', error);
      showToast('Failed to update post status', 'error');
      throw error;
    }
  };

  const confirmPublish = async () => {
    if (!postToPublish) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          is_draft: false,
          published_at: new Date().toISOString()
        })
        .eq('id', postToPublish.id);

      if (error) throw error;

      setPosts((prevPosts) =>
        prevPosts.map((post) =>
          post.id === postToPublish.id
            ? { ...post, isDraft: false, publishedAt: new Date().toISOString() }
            : post
        )
      );

      showToast('Post published successfully!', 'success');
      setPublishModalOpen(false);
      setPostToPublish(null);
    } catch (error) {
      console.error('Error publishing post:', error);
      showToast('Failed to publish post', 'error');
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

      setPosts((prevPosts) => prevPosts.filter((post) => post.id !== postToDelete));
      showToast('Post deleted successfully', 'success');
      setDeleteModalOpen(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Failed to delete post', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRepublish = (postId: string) => {
    navigate(`/admin/blog/republish/${postId}`);
  };

  return (
    <AdminLayout currentSection="Blog Management">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-black mb-2">Blog Posts</h2>
          <p className="text-gray-600">Manage your blog posts and drafts</p>
        </div>
        <button
          onClick={() => navigate('/admin/blog/create')}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
        >
          <Plus size={20} />
          <span>New Post</span>
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeFilter === 'all'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-black'
          }`}
        >
          All ({posts.length})
        </button>
        <button
          onClick={() => setActiveFilter('published')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeFilter === 'published'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-black'
          }`}
        >
          Published ({posts.filter((p) => !p.isDraft).length})
        </button>
        <button
          onClick={() => setActiveFilter('drafts')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeFilter === 'drafts'
              ? 'text-black border-b-2 border-black'
              : 'text-gray-500 hover:text-black'
          }`}
        >
          Drafts ({posts.filter((p) => p.isDraft).length})
        </button>
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
            onClick={() => navigate('/admin/blog/create')}
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

      {publishModalOpen && postToPublish && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-2">Publish Post</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to publish "{postToPublish.title}"?
            </p>
            <p className="text-sm text-gray-500 mb-6">
              This will set the published date to now and make the post visible to the public.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setPublishModalOpen(false);
                  setPostToPublish(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmPublish}
                className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-black mb-2">Delete Post</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 size={16} className="animate-spin" />}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
