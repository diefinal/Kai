import { DomElement } from './DomElement';
import { DomFormInfo, DomSnapshot, DomTableInfo } from './DomSnapshot';
import { IPlaywrightPageHandle } from '../BrowserTypes';

export class DomReader {
  /**
   * Extracts a structured DOM snapshot from a live browser page.
   */
  async readFromPage(pageHandle: IPlaywrightPageHandle): Promise<DomSnapshot> {
    if (pageHandle.evaluate) {
      try {
        const snapshot = await pageHandle.evaluate(() => {
          function isVisible(el: HTMLElement): boolean {
            if (!el) return false;
            if (el.hasAttribute('hidden')) return false;
            const style = window.getComputedStyle(el);
            if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
              return false;
            }
            return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
          }

          function getSelector(el: Element): string {
            if (el.id) return `#${el.id}`;
            const name = el.getAttribute('name');
            if (name) return `${el.tagName.toLowerCase()}[name="${name}"]`;
            const role = el.getAttribute('role');
            if (role) return `${el.tagName.toLowerCase()}[role="${role}"]`;
            return el.tagName.toLowerCase();
          }

          function toElement(el: HTMLElement, idCounter: { val: number }): DomElement {
            idCounter.val += 1;
            const tag = el.tagName.toLowerCase();
            const role = el.getAttribute('role') || undefined;
            const text = (el.innerText || el.textContent || '').trim();
            const placeholder = el.getAttribute('placeholder') || undefined;
            const ariaLabel = el.getAttribute('aria-label') || undefined;
            const visible = isVisible(el);
            const enabled = !el.hasAttribute('disabled') && !el.getAttribute('aria-disabled');
            const type = el.getAttribute('type') || undefined;
            const name = el.getAttribute('name') || undefined;
            const value = (el as HTMLInputElement).value || undefined;
            const href = el.getAttribute('href') || undefined;
            const src = el.getAttribute('src') || undefined;
            const alt = el.getAttribute('alt') || undefined;
            const checked = (el as HTMLInputElement).checked;
            const selected = (el as HTMLOptionElement).selected;

            return {
              id: el.id || `dom-el-${idCounter.val}`,
              tag,
              role,
              text: text ? text.substring(0, 500) : undefined,
              placeholder,
              ariaLabel,
              selector: getSelector(el),
              visible,
              enabled,
              type,
              name,
              value,
              href,
              src,
              alt,
              checked,
              selected,
            };
          }

          const idCounter = { val: 0 };
          const allInteractive = Array.from(
            document.querySelectorAll(
              'button, a, input, textarea, select, form, table, img, [role="button"], [role="link"], [role="textbox"], [role="form"]'
            )
          ) as HTMLElement[];

          const elements = allInteractive.map((el) => toElement(el, idCounter));
          const buttons = elements.filter(
            (e) => e.tag === 'button' || e.role === 'button' || (e.tag === 'input' && (e.type === 'button' || e.type === 'submit'))
          );
          const links = elements.filter((e) => e.tag === 'a' || e.role === 'link');
          const inputs = elements.filter((e) => e.tag === 'input' && e.type !== 'submit' && e.type !== 'button');
          const textareas = elements.filter((e) => e.tag === 'textarea');
          const selects = elements.filter((e) => e.tag === 'select');
          const checkboxes = elements.filter((e) => e.tag === 'input' && e.type === 'checkbox');
          const radioButtons = elements.filter((e) => e.tag === 'input' && e.type === 'radio');
          const images = elements.filter((e) => e.tag === 'img');

          // Forms
          const forms: DomFormInfo[] = Array.from(document.forms).map((form) => {
            const formInputs = Array.from(form.querySelectorAll('input, textarea, select, button')).map((el) =>
              toElement(el as HTMLElement, idCounter)
            );
            return {
              id: form.id || undefined,
              name: form.getAttribute('name') || undefined,
              action: form.getAttribute('action') || undefined,
              method: (form.getAttribute('method') || 'GET').toUpperCase(),
              selector: getSelector(form),
              inputs: formInputs,
            };
          });

          // Tables
          const tables: DomTableInfo[] = Array.from(document.querySelectorAll('table')).map((tbl) => {
            const headers = Array.from(tbl.querySelectorAll('th')).map((th) => th.innerText.trim());
            const rowCount = tbl.querySelectorAll('tr').length;
            const firstRowCells = tbl.querySelector('tr') ? tbl.querySelector('tr')!.querySelectorAll('td, th').length : 0;
            return {
              id: tbl.id || undefined,
              selector: getSelector(tbl),
              headers,
              rowCount,
              columnCount: headers.length || firstRowCells,
            };
          });

          return {
            title: document.title || '',
            url: window.location.href || '',
            timestamp: Date.now(),
            forms,
            buttons,
            links,
            inputs,
            textareas,
            selects,
            checkboxes,
            radioButtons,
            images,
            tables,
            visibleText: document.body ? document.body.innerText.trim() : '',
            elements,
          };
        });

        if (snapshot && typeof snapshot === 'object' && 'elements' in snapshot && Array.isArray((snapshot as any).elements)) {
          return snapshot as DomSnapshot;
        }
      } catch {
        // Fallback to content parsing if evaluate fails
      }
    }

    const html = pageHandle.content ? await pageHandle.content() : '';
    const title = await pageHandle.title();
    const url = pageHandle.url();
    return this.readFromHtml(html, url, title);
  }

  /**
   * Pure HTML string parser to extract a DomSnapshot.
   */
  readFromHtml(html: string, url = 'about:blank', title = ''): DomSnapshot {
    let resolvedTitle = title;
    if (!resolvedTitle) {
      const match = /<title[^>]*>([^<]*)<\/title>/i.exec(html);
      resolvedTitle = match ? match[1].trim() : '';
    }

    let idCounter = 0;
    const elements: DomElement[] = [];

    // Helper to extract attributes from an opening HTML tag
    function parseAttrs(tagStr: string): Record<string, string> {
      const attrs: Record<string, string> = {};
      const re = /([a-zA-Z0-9_-]+)(?:=["']([^"']*)["'])?/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(tagStr)) !== null) {
        const key = m[1].toLowerCase();
        const val = m[2] !== undefined ? m[2] : 'true';
        attrs[key] = val;
      }
      return attrs;
    }

    function isElementVisible(attrs: Record<string, string>): boolean {
      if (attrs.hidden !== undefined) return false;
      const style = attrs.style || '';
      if (/display\s*:\s*none/i.test(style) || /visibility\s*:\s*hidden/i.test(style)) {
        return false;
      }
      return true;
    }

    let m: RegExpExecArray | null;

    // 1. Inputs
    const inputRegex = /<input([^>]*?)>/gi;
    while ((m = inputRegex.exec(html)) !== null) {
      const attrs = parseAttrs(m[1]);
      idCounter++;
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag: 'input',
        role: attrs.role,
        type: attrs.type || 'text',
        name: attrs.name,
        placeholder: attrs.placeholder,
        ariaLabel: attrs['aria-label'],
        value: attrs.value,
        selector: attrs.id ? `#${attrs.id}` : attrs.name ? `input[name="${attrs.name}"]` : 'input',
        visible: isElementVisible(attrs),
        enabled: attrs.disabled === undefined && attrs['aria-disabled'] !== 'true',
        checked: attrs.checked !== undefined,
      });
    }

    // 2. Buttons
    const buttonRegex = /<button([^>]*)>([\s\S]*?)<\/button>/gi;
    while ((m = buttonRegex.exec(html)) !== null) {
      const attrs = parseAttrs(m[1]);
      idCounter++;
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag: 'button',
        role: attrs.role || 'button',
        type: attrs.type || 'button',
        text: text || undefined,
        ariaLabel: attrs['aria-label'],
        selector: attrs.id ? `#${attrs.id}` : 'button',
        visible: isElementVisible(attrs),
        enabled: attrs.disabled === undefined && attrs['aria-disabled'] !== 'true',
      });
    }

    // 3. Links (a)
    const aRegex = /<a([^>]*)>([\s\S]*?)<\/a>/gi;
    while ((m = aRegex.exec(html)) !== null) {
      const attrs = parseAttrs(m[1]);
      idCounter++;
      const text = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag: 'a',
        role: attrs.role || 'link',
        href: attrs.href,
        text: text || undefined,
        ariaLabel: attrs['aria-label'],
        selector: attrs.id ? `#${attrs.id}` : 'a',
        visible: isElementVisible(attrs),
        enabled: attrs.disabled === undefined && attrs['aria-disabled'] !== 'true',
      });
    }

    // 4. Textareas
    const textareaRegex = /<textarea([^>]*)>([\s\S]*?)<\/textarea>/gi;
    while ((m = textareaRegex.exec(html)) !== null) {
      const attrs = parseAttrs(m[1]);
      idCounter++;
      const text = m[2].trim();
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag: 'textarea',
        role: attrs.role || 'textbox',
        name: attrs.name,
        placeholder: attrs.placeholder,
        text: text || undefined,
        value: text || undefined,
        ariaLabel: attrs['aria-label'],
        selector: attrs.id ? `#${attrs.id}` : attrs.name ? `textarea[name="${attrs.name}"]` : 'textarea',
        visible: isElementVisible(attrs),
        enabled: attrs.disabled === undefined && attrs['aria-disabled'] !== 'true',
      });
    }

    // 5. Selects
    const selectRegex = /<select([^>]*)>([\s\S]*?)<\/select>/gi;
    while ((m = selectRegex.exec(html)) !== null) {
      const attrs = parseAttrs(m[1]);
      idCounter++;
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag: 'select',
        role: attrs.role || 'combobox',
        name: attrs.name,
        ariaLabel: attrs['aria-label'],
        selector: attrs.id ? `#${attrs.id}` : attrs.name ? `select[name="${attrs.name}"]` : 'select',
        visible: isElementVisible(attrs),
        enabled: attrs.disabled === undefined && attrs['aria-disabled'] !== 'true',
      });
    }

    // 6. Images
    const imgRegex = /<img([^>]*?)>/gi;
    while ((m = imgRegex.exec(html)) !== null) {
      const attrs = parseAttrs(m[1]);
      idCounter++;
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag: 'img',
        role: attrs.role || 'img',
        src: attrs.src,
        alt: attrs.alt,
        ariaLabel: attrs['aria-label'] || attrs.alt,
        selector: attrs.id ? `#${attrs.id}` : 'img',
        visible: isElementVisible(attrs),
        enabled: true,
      });
    }

    // 7. Extra elements with role
    const roleRegex = /<([a-zA-Z0-9]+)([^>]*role=["']([a-zA-Z0-9_-]+)["'][^>]*)>(?:([\s\S]*?)<\/\1>)?/gi;
    while ((m = roleRegex.exec(html)) !== null) {
      const tag = m[1].toLowerCase();
      if (['button', 'a', 'input', 'textarea', 'select', 'img'].includes(tag)) continue;
      const attrs = parseAttrs(m[2]);
      idCounter++;
      const text = (m[4] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      elements.push({
        id: attrs.id || `dom-el-${idCounter}`,
        tag,
        role: attrs.role,
        text: text || undefined,
        ariaLabel: attrs['aria-label'],
        selector: attrs.id ? `#${attrs.id}` : `[role="${attrs.role}"]`,
        visible: isElementVisible(attrs),
        enabled: attrs.disabled === undefined && attrs['aria-disabled'] !== 'true',
      });
    }

    const buttons = elements.filter(
      (e) => e.tag === 'button' || e.role === 'button' || (e.tag === 'input' && (e.type === 'button' || e.type === 'submit'))
    );
    const links = elements.filter((e) => e.tag === 'a' || e.role === 'link');
    const inputs = elements.filter((e) => e.tag === 'input' && e.type !== 'submit' && e.type !== 'button');
    const textareas = elements.filter((e) => e.tag === 'textarea');
    const selects = elements.filter((e) => e.tag === 'select');
    const checkboxes = elements.filter((e) => e.tag === 'input' && e.type === 'checkbox');
    const radioButtons = elements.filter((e) => e.tag === 'input' && e.type === 'radio');
    const images = elements.filter((e) => e.tag === 'img');

    // Forms
    const formRegex = /<form([^>]*)>([\s\S]*?)<\/form>/gi;
    const forms: DomFormInfo[] = [];
    let formMatch: RegExpExecArray | null;
    while ((formMatch = formRegex.exec(html)) !== null) {
      const fAttrs = parseAttrs(formMatch[1]);
      const fBody = formMatch[2];
      const formInputs = this.readFromHtml(fBody).elements.filter(
        (e) => ['input', 'button', 'textarea', 'select'].includes(e.tag)
      );
      forms.push({
        id: fAttrs.id,
        name: fAttrs.name,
        action: fAttrs.action,
        method: (fAttrs.method || 'GET').toUpperCase(),
        selector: fAttrs.id ? `#${fAttrs.id}` : fAttrs.name ? `form[name="${fAttrs.name}"]` : 'form',
        inputs: formInputs,
      });
    }

    // Tables
    const tableRegex = /<table([^>]*)>([\s\S]*?)<\/table>/gi;
    const tables: DomTableInfo[] = [];
    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tAttrs = parseAttrs(tableMatch[1]);
      const tBody = tableMatch[2];
      const headers: string[] = [];
      const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
      let thMatch: RegExpExecArray | null;
      while ((thMatch = thRegex.exec(tBody)) !== null) {
        headers.push(thMatch[1].replace(/<[^>]+>/g, '').trim());
      }
      const rowCount = (tBody.match(/<tr/gi) || []).length;
      tables.push({
        id: tAttrs.id,
        selector: tAttrs.id ? `#${tAttrs.id}` : 'table',
        headers,
        rowCount,
        columnCount: headers.length || 0,
      });
    }

    // Extract visible text
    const cleanText = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return {
      title: resolvedTitle,
      url,
      timestamp: Date.now(),
      forms,
      buttons,
      links,
      inputs,
      textareas,
      selects,
      checkboxes,
      radioButtons,
      images,
      tables,
      visibleText: cleanText,
      elements,
    };
  }
}
