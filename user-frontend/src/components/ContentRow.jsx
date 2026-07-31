import ContentCard from "./ContentCard";

export default function ContentRow({ title, items, landscape = false }) {
  if (!items?.length) return null;
  return (
    <section className="mx-auto max-w-7xl px-6 py-6">
      <h2 className="mb-3 text-lg font-medium tracking-tight">{title}</h2>
      <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2">
        {items.map((item, i) => (
          <ContentCard key={item.id ?? item._id ?? item.video_id ?? i} item={item} landscape={landscape} />
        ))}
      </div>
    </section>
  );
}
