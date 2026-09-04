/**
 * Agents that fetch a page only to build a link-preview card.
 *
 * /r/[slug] treats these differently from visitors: they get a 200 carrying the
 * destination's mirrored metadata instead of a redirect, and they never
 * register a click.
 *
 * The list is matched as lowercase substrings of the User-Agent. It is
 * deliberately a heuristic, and the failure mode is benign in both directions:
 *
 *  - A crawler we do not recognise gets the ordinary 307 and follows it to the
 *    destination, whose own tags produce the same card one hop later. It also
 *    registers a click, which is the behaviour that exists today.
 *  - A human whose UA happens to match sees a blank page instead of being
 *    redirected. None of these strings appear in a real browser UA — the
 *    closest is 'applebot', which no Safari build sends.
 */
const PREVIEW_AGENTS = [
  // Meta. WhatsApp and Instagram previews are served by this family too.
  'facebookexternalhit',
  'facebookcatalog',
  'meta-externalagent',
  'whatsapp',
  'instagram',
  // Other messengers and social platforms
  'twitterbot',
  'linkedinbot',
  'slackbot',
  'slack-imgproxy',
  'telegrambot',
  'discordbot',
  'pinterest',
  'redditbot',
  'skypeuripreview',
  'vkshare',
  'applebot',
  // Embed/oEmbed services
  'embedly',
  'iframely',
  'quora link preview',
  'nuzzel',
  'bitlybot',
  // Search engines: /r/ is noindex, but they should still see a real response
  // rather than being counted as visitors.
  'googlebot',
  'google-inspectiontool',
  'bingbot',
  'duckduckbot',
  'yandexbot',
] as const;

export function isPreviewAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return PREVIEW_AGENTS.some((agent) => ua.includes(agent));
}
