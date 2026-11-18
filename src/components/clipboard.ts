/**
 * Copies text to the clipboard. Tries the modern API first, then the old
 * select-and-copy trick (needed on some older browsers and on pages the modern
 * API refuses). Resolves true only if the text really was copied.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // denied or unavailable: try the fallback below
  }
  try {
    const box = document.createElement('textarea');
    box.value = text;
    box.setAttribute('readonly', '');
    // Off-screen but still selectable; 16px keeps iOS from zooming in.
    box.style.cssText = 'position:fixed;top:0;left:0;opacity:0;font-size:16px;pointer-events:none';
    document.body.append(box);
    box.select();
    box.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    box.remove();
    return ok;
  } catch {
    return false;
  }
}
