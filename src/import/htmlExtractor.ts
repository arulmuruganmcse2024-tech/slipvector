/**
 * Sandboxed HTML/CSS DOM Extractor
 * Uses <iframe sandbox="allow-same-origin" srcdoc="..."> to isolate untrusted markup
 * while accessing getBoundingClientRect() geometry without throwing SecurityError.
 * Strips script tags, inline event handlers, and infers semantic roles with manual override table.
 */

import { UIElement, ElementRole } from '../engine/biomechanics.ts';

export const STARTER_SNIPPETS = [
  {
    id: 'starter-tailwind-action-bar',
    name: 'AI-Generated Action Bar (Tailwind)',
    html: `
<div class="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-lg max-w-lg">
  <input type="text" placeholder="Project name..." class="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded text-sm text-white" value="production-service">
  <div class="flex items-center gap-1">
    <button class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded">
      Delete Project
    </button>
    <button class="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded">
      Save Changes
    </button>
  </div>
</div>
`.trim()
  },
  {
    id: 'starter-card-footer',
    name: 'Compact Card Footer',
    html: `
<div class="p-6 bg-slate-900 border border-slate-800 rounded-xl max-w-md">
  <textarea class="w-full p-2 mb-4 bg-slate-800 border border-slate-700 rounded text-sm text-white" rows="2">New blog post draft</textarea>
  <div class="flex justify-end gap-2">
    <button class="px-4 py-2 border border-red-500 text-red-400 text-sm rounded">
      Discard Draft
    </button>
    <button class="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded">
      Publish Post
    </button>
  </div>
</div>
`.trim()
  }
];

/**
 * Sanitizes untrusted HTML by removing script tags and inline event handlers.
 */
export function sanitizeHTML(dirtyHtml: string): string {
  // Strip <script>...</script> tags
  let clean = dirtyHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  // Strip inline on* handlers
  clean = clean.replace(/\s+on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');
  // Strip dangerous embedding tags
  clean = clean.replace(/<\/?(iframe|object|embed)\b[^>]*>/gi, '');
  return clean;
}

/**
 * Heuristic semantic role classifier.
 */
export function inferElementRole(text: string, id: string, className: string, tagName: string): ElementRole {
  const combined = `${text} ${id} ${className}`.toLowerCase();

  if (/input|textarea|select|checkbox|form/.test(tagName.toLowerCase())) {
    return 'anchor';
  }

  if (/delete|remove|destroy|revoke|cancel|discard|reset|drop|terminate|close/.test(combined)) {
    return 'destructive';
  }

  if (/save|submit|confirm|publish|merge|complete|pay|order|checkout|create|add|apply/.test(combined)) {
    return 'primary';
  }

  return 'neutral';
}

export interface ExtractedLayout {
  container: { width: number; height: number };
  elements: UIElement[];
}

/**
 * Extracts element bounding boxes from sanitized HTML via a sandboxed srcdoc iframe.
 */
export async function extractLayoutFromHTML(
  rawHtml: string,
  containerEl: HTMLElement
): Promise<ExtractedLayout> {
  const sanitized = sanitizeHTML(rawHtml);

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-same-origin');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.top = '-9999px';
    iframe.style.width = '640px';
    iframe.style.height = '480px';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';

    // Inject base styles so buttons have natural dimensions even if external css is missing
    const wrappedHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: sans-serif; background: transparent; }
    button, input, textarea, a { display: inline-block; }
  </style>
</head>
<body>
  ${sanitized}
</body>
</html>
`;

    iframe.srcdoc = wrappedHtml;
    containerEl.appendChild(iframe);

    iframe.onload = () => {
      try {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) {
          throw new Error('Unable to access sandboxed iframe document');
        }

        const bodyRect = doc.body.getBoundingClientRect();
        const interactiveElements = doc.querySelectorAll('button, a[role="button"], input, textarea, select, [data-role]');

        const extracted: UIElement[] = [];
        let idx = 0;

        interactiveElements.forEach(node => {
          const el = node as HTMLElement;
          const rect = el.getBoundingClientRect();

          // Skip hidden or zero-size elements
          if (rect.width <= 0 || rect.height <= 0) return;

          const relX = Math.round(rect.left - bodyRect.left);
          const relY = Math.round(rect.top - bodyRect.top);
          const text = (el.innerText || (el as HTMLInputElement).value || el.getAttribute('placeholder') || el.id || 'Button').trim();
          const role = inferElementRole(text, el.id, el.className, el.tagName);

          extracted.push({
            id: el.id || `imported-${role}-${idx++}`,
            label: text || `Element ${idx}`,
            role,
            rect: {
              x: Math.max(0, relX),
              y: Math.max(0, relY),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
            }
          });
        });

        // Ensure at least one primary target exists if interactive elements are found
        const hasPrimary = extracted.some(e => e.role === 'primary');
        if (!hasPrimary && extracted.length > 0) {
          const candidate = extracted.find(e => e.role !== 'anchor') || extracted[0];
          candidate.role = 'primary';
        }

        // Compute enclosing container
        let maxX = 520;
        let maxY = 320;
        for (const el of extracted) {
          const right = el.rect.x + el.rect.width + 32;
          const bottom = el.rect.y + el.rect.height + 32;
          if (right > maxX) maxX = right;
          if (bottom > maxY) maxY = bottom;
        }

        containerEl.removeChild(iframe);

        resolve({
          container: { width: Math.min(800, maxX), height: Math.min(600, maxY) },
          elements: extracted
        });
      } catch (err) {
        if (iframe.parentNode) containerEl.removeChild(iframe);
        reject(err);
      }
    };

    iframe.onerror = (err) => {
      if (iframe.parentNode) containerEl.removeChild(iframe);
      reject(err);
    };
  });
}
