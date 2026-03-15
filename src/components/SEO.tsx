import { Helmet } from 'react-helmet-async';
import { SEOProps, SITE_NAME, defaultSEO } from '../config/seo';

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonicalUrl,
  ogType,
  ogImage,
  structuredData,
}) => {
  const resolvedTitle = title
    ? title === SITE_NAME
      ? SITE_NAME
      : `${title} | ${SITE_NAME}`
    : defaultSEO.title;
  const resolvedDescription = description || defaultSEO.description;
  const resolvedCanonical = canonicalUrl || defaultSEO.canonicalUrl;
  const resolvedOgType = ogType || defaultSEO.ogType;
  const resolvedOgImage = ogImage || defaultSEO.ogImage;

  return (
    <Helmet>
      <title>{resolvedTitle}</title>
      <meta name="description" content={resolvedDescription} />
      <link rel="canonical" href={resolvedCanonical} />

      <meta property="og:title" content={resolvedTitle} />
      <meta property="og:description" content={resolvedDescription} />
      <meta property="og:type" content={resolvedOgType} />
      <meta property="og:url" content={resolvedCanonical} />
      <meta property="og:image" content={resolvedOgImage} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={resolvedTitle} />
      <meta name="twitter:description" content={resolvedDescription} />
      <meta name="twitter:image" content={resolvedOgImage} />

      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}
    </Helmet>
  );
};

export default SEO;
