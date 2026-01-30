import Image from 'next/image';
import { isOrgMember } from '@/lib/organization';

interface AuthorAvatarProps {
  username: string;
  size?: 'sm' | 'md';
  showName?: boolean;
}

export function AuthorAvatar({ username, size = 'sm', showName = true }: AuthorAvatarProps) {
  const avatarUrl = `https://github.com/${username}.png`;
  const isTeamMember = isOrgMember(username);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
  };

  const sizePixels = {
    sm: 24,
    md: 32,
  };

  return (
    <div className="flex items-center gap-2">
      <Image
        src={avatarUrl}
        alt={username}
        width={sizePixels[size]}
        height={sizePixels[size]}
        className={`${sizeClasses[size]} rounded-full object-cover`}
        unoptimized
      />
      {showName && (
        <span className="text-sm text-slate-500 dark:text-neutral-400">
          {username}{isTeamMember && ' (Anam)'}
        </span>
      )}
    </div>
  );
}
