import { NextResponse } from 'next/server';

const RULES = {
  sqli: [
    /[\'"][ \t]*or[ \t]+/i,
    /union[ \t]+select/i,
    /select[ \t]+.*[ \t]+from/i,
    /insert[ \t]+into/i,
    /update[ \t]+.*[ \t]+set/i,
    /delete[ \t]+from/i,
    /drop[ \t]+table/i
  ],
  xss: [
    /<script[^>]*>/i,
    /javascript:/i,
    /onmouseover=/i,
    /onerror=/i,
    /onload=/i,
    /alert\([^\)]*\)/i
  ],
  traversal: [
    /\.\.\//,
    /\/etc\/passwd/i,
    /boot\.ini/i
  ],
  bots: [
    /sqlmap/i,
    /nikto/i,
    /burpsuite/i,
    /nmap/i
  ]
};

function inspectString(str) {
  if (!str) return false;
  for (const [category, patterns] of Object.entries(RULES)) {
    for (const pattern of patterns) {
      if (pattern.test(str)) {
        console.warn(`[ShieldWall WAF] Blocked request matching category: ${category}`);
        return true;
      }
    }
  }
  return false;
}

export function middleware(request) {
  const url = request.nextUrl;
  const userAgent = request.headers.get('user-agent') || '';

  // 1. Inspect URL & Query
  if (inspectString(url.pathname) || inspectString(url.search)) {
    return new NextResponse(
      '<h1>Blocked by ShieldWall Embedded WAF</h1>',
      { status: 403, headers: { 'content-type': 'text/html' } }
    );
  }

  // 2. Inspect User-Agent
  for (const pattern of RULES.bots) {
    if (pattern.test(userAgent)) {
      return new NextResponse(
        '<h1>Blocked by ShieldWall Embedded WAF</h1>',
        { status: 403, headers: { 'content-type': 'text/html' } }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};