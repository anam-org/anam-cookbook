import { topics } from '@/lib/config';
import { TopicCard } from './TopicCard';

export function TopicsSection() {
  return (
    <section className="mb-16">
      <h2 className="text-2xl font-bold text-slate-900 dark:text-neutral-100 mb-6">
        Topics
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {topics.map((topic) => (
          <TopicCard key={topic.slug} topic={topic} />
        ))}
      </div>
    </section>
  );
}
