import { Instagram, Facebook, Image, Film, Images } from 'lucide-react';
import { Post, PostType, Platform } from '@/lib/types';

interface IPhoneMockupProps {
  post: Post;
  size?: 'sm' | 'md';
}

function PlatformIcon({ platform }: { platform: Platform }) {
  return platform === 'instagram' 
    ? <Instagram className="w-3 h-3" /> 
    : <Facebook className="w-3 h-3" />;
}

function TypeBadge({ type }: { type: PostType }) {
  const config = {
    image: { icon: Image, label: 'Imagem' },
    reels: { icon: Film, label: 'Reels' },
    carousel: { icon: Images, label: 'Carrossel' },
  };
  const { icon: Icon, label } = config[type];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/70">
      <Icon className="w-3 h-3" /> {label}
    </span>
  );
}

export default function IPhoneMockup({ post, size = 'sm' }: IPhoneMockupProps) {
  const width = size === 'sm' ? 'w-[160px]' : 'w-[240px]';

  return (
    <div className={`${width} mx-auto`}>
      <div className="iphone-mockup bg-card">
        <div className="iphone-notch" />
        {/* Instagram Header */}
        <div className="pt-8 px-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent" />
            <span className="text-[9px] font-semibold text-card-foreground truncate">
              {post.title}
            </span>
            <PlatformIcon platform={post.platform} />
          </div>
        </div>

        {/* Post Image Area */}
        <div className="aspect-square bg-gradient-to-br from-muted to-secondary flex items-center justify-center mx-1 rounded-sm overflow-hidden">
          {post.imageUrl ? (
            <img src={post.imageUrl} alt={post.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-muted-foreground/40">
              <TypeBadge type={post.type} />
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="px-3 py-2">
          <p className="text-[7px] leading-[10px] text-card-foreground/80 line-clamp-4">
            {post.caption}
          </p>
        </div>
      </div>
    </div>
  );
}
