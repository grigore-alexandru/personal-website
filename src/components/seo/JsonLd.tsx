/**
 * Renders a schema.org graph as a real <script type="application/ld+json">.
 *
 * This replaces the previous approach of passing JSON through
 * `metadata.other['script:ld+json']`, which does not do what it looks like it
 * does: `metadata.other` only ever emits <meta name="..." content="...">, so
 * the payload shipped HTML-escaped inside a meta tag where no search engine
 * would ever read it. The site had zero valid structured data as a result.
 *
 * Server Component by design — this adds nothing to the client bundle.
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Escaping "<" is what stops a "</script>" inside any string value (a post
      // title, a caption) from closing the tag early and breaking the document.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
