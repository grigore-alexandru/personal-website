import { MetadataRoute } from 'next';
import { SITE_URL } from '../config/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/', '/r/'],
      },
      {
        // Social scrapers MUST be allowed to fetch /r/. Meta's crawler honours
        // robots.txt, so the blanket Disallow above meant facebookexternalhit
        // never fetched a short link at all and no preview could ever be
        // generated for one — on Facebook, Instagram or WhatsApp.
        //
        // Blocking the fetch and blocking the index are different controls, and
        // only the second one is wanted here: /r/[slug] returns
        // `robots: { index: false, follow: false }` in its own metadata, which
        // keeps short links out of search results while still letting the card
        // be built.
        //
        // Meta caches robots.txt for up to 24 hours, so previews will not start
        // working the instant this deploys.
        userAgent: [
          'facebookexternalhit',
          'meta-externalagent',
          'WhatsApp',
          'Twitterbot',
          'LinkedInBot',
          'Slackbot-LinkExpanding',
          'TelegramBot',
          'Discordbot',
        ],
        allow: ['/', '/r/'],
        disallow: ['/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
