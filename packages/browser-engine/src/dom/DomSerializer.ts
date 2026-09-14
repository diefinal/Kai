import { DomElement } from './DomElement';
import { DomSnapshot } from './DomSnapshot';

export class DomSerializer {
  /**
   * Formats a single DOM element into a concise string descriptor.
   */
  static formatElement(element: DomElement): string {
    const parts: string[] = [`[${element.tag}]`];
    if (element.role && element.role !== element.tag) {
      parts.push(`role="${element.role}"`);
    }
    if (element.id) {
      parts.push(`#${element.id}`);
    }
    if (element.text) {
      parts.push(`"${element.text.trim().substring(0, 40)}"`);
    } else if (element.placeholder) {
      parts.push(`placeholder="${element.placeholder}"`);
    } else if (element.ariaLabel) {
      parts.push(`aria-label="${element.ariaLabel}"`);
    }
    if (element.type) {
      parts.push(`type="${element.type}"`);
    }
    if (element.href) {
      parts.push(`href="${element.href}"`);
    }
    if (!element.visible) {
      parts.push('(hidden)');
    }
    if (!element.enabled) {
      parts.push('(disabled)');
    }
    return parts.join(' ');
  }

  /**
   * Produces a human-readable and LLM-friendly summary of the DOM snapshot.
   */
  static toSummary(snapshot: DomSnapshot): string {
    const lines: string[] = [
      `Page: ${snapshot.title || 'Untitled'} (${snapshot.url})`,
      `Elements summary:`,
      `- Forms: ${snapshot.forms.length}`,
      `- Buttons: ${snapshot.buttons.length}`,
      `- Inputs: ${snapshot.inputs.length}`,
      `- Textareas: ${snapshot.textareas.length}`,
      `- Selects: ${snapshot.selects.length}`,
      `- Links: ${snapshot.links.length}`,
      `- Tables: ${snapshot.tables.length}`,
    ];

    if (snapshot.forms.length > 0) {
      lines.push('\nForms:');
      snapshot.forms.forEach((form, i) => {
        const idStr = form.id ? ` #${form.id}` : '';
        lines.push(`  [Form ${i + 1}${idStr}] Action: ${form.action || 'none'}, Inputs: ${form.inputs.length}`);
      });
    }

    if (snapshot.buttons.length > 0) {
      lines.push('\nButtons:');
      snapshot.buttons.slice(0, 10).forEach((b) => {
        lines.push(`  - ${b.text || b.ariaLabel || b.name || 'unnamed'} (${b.selector})`);
      });
      if (snapshot.buttons.length > 10) {
        lines.push(`  ... and ${snapshot.buttons.length - 10} more`);
      }
    }

    if (snapshot.inputs.length > 0) {
      lines.push('\nInputs:');
      snapshot.inputs.slice(0, 10).forEach((inp) => {
        lines.push(`  - [${inp.type || 'text'}] ${inp.placeholder || inp.name || inp.id || 'unnamed'} (${inp.selector})`);
      });
      if (snapshot.inputs.length > 10) {
        lines.push(`  ... and ${snapshot.inputs.length - 10} more`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Returns formatted visible text.
   */
  static toVisibleText(snapshot: DomSnapshot): string {
    return snapshot.visibleText;
  }

  /**
   * Returns JSON string representation.
   */
  static toJson(snapshot: DomSnapshot, pretty = false): string {
    return JSON.stringify(snapshot, null, pretty ? 2 : undefined);
  }
}
