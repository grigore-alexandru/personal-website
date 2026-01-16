import { Edit, MoreVertical, Calendar, Clock } from 'lucide-react';
import { BlogPost } from '../../utils/blogLoader';
import { formatDistanceToNow } from '../../utils/dateUtils';

interface AdminBlogCardProps {
  post: BlogPost;
  onEdit: (postId: string) => void;
  onToggleStatus: (postId: string, currentStatus: boolean) => void;
  onMenuClick: (postId: string, event: React.MouseEvent) => void;
}

export function AdminBlogCard({ post, onEdit, onToggleStatus, onMenuClick }: AdminBlogCardProps) {
  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onToggleStatus(post.id, post.isDraft || false);
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuClick(post.id, e);
  };

  return (
    <article className="group relative bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-lg transition-all duration-300">
      {post.heroImageThumbnail && (
        <div className="aspect-[16/9] overflow-hidden bg-neutral-100">
          <img
            src={post.heroImageThumbnail}
            alt={post.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}

      <div className="absolute top-4 left-4">
        <span
          className={`inline-flex px-3 py-1 rounded-full text-xs font-bold ${
            post.isDraft
              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300'
              : 'bg-green-100 text-green-800 border border-green-300'
          }`}
        >
          {post.isDraft ? 'DRAFT' : 'PUBLISHED'}
        </span>
      </div>

      <div className="absolute top-4 right-4 flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={!post.isDraft}
            onChange={handleToggle}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-black rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
        </label>

        <button
          onClick={handleMenuClick}
          className="p-2 rounded-lg bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <MoreVertical size={16} className="text-neutral-600" />
        </button>
      </div>

      <div className="p-6">
        <div className="mb-3">
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {post.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 bg-neutral-100 text-neutral-700 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <h3 className="text-xl font-bold text-black mb-2 line-clamp-2">
            {post.title}
          </h3>
          {post.excerpt && (
            <p className="text-neutral-600 text-sm line-clamp-2">
              {post.excerpt}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-1 mb-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>Updated {formatDistanceToNow(post.updatedAt || post.createdAt || '')}</span>
          </div>
          {!post.isDraft && (
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>Published {formatDistanceToNow(post.publishedAt)}</span>
            </div>
          )}
          {post.isDraft && post.createdAt && (
            <div className="flex items-center gap-1">
              <Calendar size={12} />
              <span>Created {formatDistanceToNow(post.createdAt)}</span>
            </div>
          )}
        </div>

        <button
          onClick={() => onEdit(post.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors text-sm font-medium"
        >
          <Edit size={16} />
          <span>Edit</span>
        </button>
      </div>
    </article>
  );
}
