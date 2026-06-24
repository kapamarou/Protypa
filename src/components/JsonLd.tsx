// Renders a schema.org JSON-LD block. Server component — safe because the data
// is our own structured content (never untrusted user input concatenated raw).
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
