// One page audit, used by every suite that checks a surface: names on controls, heading order, duplicate
// ids, image alternatives, and every text run against the background it actually sits on.
export async function auditPage(page) {
  return page.evaluate(() => {
    const out = [];
    const name = (element) => (element.getAttribute('aria-label') || element.getAttribute('title') || element.textContent || '').trim();
    if (document.documentElement.lang !== 'en') out.push(`html lang is ${JSON.stringify(document.documentElement.lang)}`);
    if (!document.title.trim()) out.push('empty title');
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    for (const id of new Set(ids.filter((value, index) => ids.indexOf(value) !== index))) out.push(`duplicate id ${id}`);
    for (const image of document.querySelectorAll('img')) {
      if (!image.hasAttribute('alt')) out.push(`img without alt: ${image.getAttribute('src')}`);
      if (!image.hasAttribute('width') || !image.hasAttribute('height')) out.push(`img without dimensions: ${image.getAttribute('src')}`);
    }
    const hidden = (element) => element.hasAttribute('hidden') || Boolean(element.closest('[hidden], [aria-hidden="true"]'));
    for (const control of document.querySelectorAll('button, a[href], input, select, textarea')) {
      if (hidden(control)) continue;
      const style = getComputedStyle(control);
      if (style.display === 'none' || style.visibility === 'hidden') continue;
      const labels = control.labels ? [...control.labels].map((label) => label.textContent).join(' ') : '';
      if (!(name(control) || control.getAttribute('aria-labelledby') || labels).trim()) out.push(`${control.tagName.toLowerCase()} with no accessible name`);
    }
    let previous = 0;
    for (const heading of document.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
      const level = Number(heading.tagName.slice(1));
      if (previous && level > previous + 1) out.push(`heading jump H${previous} to H${level} at "${heading.textContent.trim().slice(0, 30)}"`);
      previous = level;
    }
    for (const element of document.querySelectorAll('[aria-expanded], [aria-pressed]')) {
      const value = element.getAttribute('aria-expanded') ?? element.getAttribute('aria-pressed');
      if (!['true', 'false'].includes(value)) out.push(`invalid toggle value ${JSON.stringify(value)}`);
    }

    // Contrast against the nearest opaque background, the way the text is actually painted.
    const parse = (colour) => {
      const parts = colour.match(/[\d.]+/g) || [];
      return { r: Number(parts[0]), g: Number(parts[1]), b: Number(parts[2]), a: parts.length > 3 ? Number(parts[3]) : 1 };
    };
    const luminance = ({ r, g, b }) => {
      const channel = (value) => { const scaled = value / 255; return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    };
    const ratio = (one, two) => { const [high, low] = [luminance(one), luminance(two)].sort((a, b) => b - a); return (high + 0.05) / (low + 0.05); };
    const blended = (front, back) => front.a === 1 ? front : ({ r: front.r * front.a + back.r * (1 - front.a), g: front.g * front.a + back.g * (1 - front.a), b: front.b * front.a + back.b * (1 - front.a), a: 1 });
    const background = (element) => {
      for (let node = element; node; node = node.parentElement) {
        const colour = parse(getComputedStyle(node).backgroundColor);
        if (colour.a === 1) return colour;
      }
      return { r: 255, g: 255, b: 255, a: 1 };
    };
    for (const element of document.querySelectorAll('p, span, h1, h2, h3, h4, button, a, li, label, time, small, strong')) {
      if (hidden(element)) continue;
      const own = [...element.childNodes].filter((node) => node.nodeType === 3 && node.textContent.trim());
      if (!own.length) continue;
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
      const size = Number.parseFloat(style.fontSize);
      const large = size >= 24 || (size >= 18.66 && (Number(style.fontWeight) || 400) >= 700);
      const back = background(element);
      const value = ratio(blended(parse(style.color), back), back);
      const required = large ? 3 : 4.5;
      if (value < required) out.push(`contrast ${value.toFixed(2)}:1 needs ${required}:1 for ${size}px "${own.map((node) => node.textContent.trim()).join(' ').slice(0, 40)}"`);
    }
    return out;
  });
}
