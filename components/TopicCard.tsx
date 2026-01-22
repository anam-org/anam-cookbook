import Link from 'next/link';
import { TopicConfig } from '@/lib/config';

interface TopicCardProps {
  topic: TopicConfig;
}

export function TopicCard({ topic }: TopicCardProps) {
  return (
    <Link
      href={`/?topic=${topic.slug}`}
      className="group relative flex items-center justify-center h-28 rounded-xl overflow-hidden hover:scale-[1.02] hover:shadow-lg transition-all duration-200"
      style={{ background: topic.gradient }}
    >
      {/* Subtle overlay for better text readability */}
      <div className="absolute inset-0 bg-black/10 group-hover:bg-black/5 transition-colors" />
      
      {/* Topic name */}
      <span className="relative z-10 text-white font-semibold text-lg drop-shadow-md">
        {topic.name}
      </span>
    </Link>
  );
}
