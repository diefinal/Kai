import { DomElement } from './DomElement';
import { DomFormInfo, DomSnapshot } from './DomSnapshot';

export interface DomQueryCriteria {
  text?: string;
  role?: string;
  tag?: string;
  placeholder?: string;
  ariaLabel?: string;
  selector?: string;
  type?: string;
  name?: string;
  visibleOnly?: boolean;
}

export class DomQuery {
  /**
   * Evaluates whether a DOM element satisfies the given criteria.
   */
  static matches(element: DomElement, criteria: DomQueryCriteria): boolean {
    const visibleOnly = criteria.visibleOnly ?? true;
    if (visibleOnly && !element.visible) {
      return false;
    }

    if (criteria.tag && element.tag.toLowerCase() !== criteria.tag.toLowerCase().trim()) {
      return false;
    }

    if (criteria.role && element.role?.toLowerCase() !== criteria.role.toLowerCase().trim()) {
      return false;
    }

    if (criteria.type && element.type?.toLowerCase() !== criteria.type.toLowerCase().trim()) {
      return false;
    }

    if (criteria.name && element.name?.toLowerCase() !== criteria.name.toLowerCase().trim()) {
      return false;
    }

    if (criteria.placeholder) {
      const ph = element.placeholder?.toLowerCase() || '';
      const target = criteria.placeholder.toLowerCase().trim();
      if (!ph.includes(target)) {
        return false;
      }
    }

    if (criteria.ariaLabel) {
      const al = element.ariaLabel?.toLowerCase() || '';
      const target = criteria.ariaLabel.toLowerCase().trim();
      if (!al.includes(target)) {
        return false;
      }
    }

    if (criteria.selector) {
      const sel = element.selector.toLowerCase();
      const target = criteria.selector.toLowerCase().trim();
      if (sel !== target && !sel.includes(target)) {
        return false;
      }
    }

    if (criteria.text) {
      const target = criteria.text.toLowerCase().trim();
      const textMatch = element.text?.toLowerCase().includes(target);
      const labelMatch = element.ariaLabel?.toLowerCase().includes(target);
      const placeholderMatch = element.placeholder?.toLowerCase().includes(target);
      const valMatch = element.value?.toLowerCase().includes(target);
      if (!textMatch && !labelMatch && !placeholderMatch && !valMatch) {
        return false;
      }
    }

    return true;
  }

  /**
   * Filters an array of elements matching criteria.
   */
  static query(elements: DomElement[], criteria: DomQueryCriteria): DomElement[] {
    return elements.filter((el) => DomQuery.matches(el, criteria));
  }

  /**
   * Returns the first matching element, or null.
   */
  static findOne(elements: DomElement[], criteria: DomQueryCriteria): DomElement | null {
    const match = elements.find((el) => DomQuery.matches(el, criteria));
    return match || null;
  }

  /**
   * Finds a button by text or aria-label.
   */
  static findButton(elements: DomElement[], textOrLabel: string): DomElement | null {
    return DomQuery.findOne(elements, {
      role: 'button',
      text: textOrLabel,
    }) || DomQuery.findOne(elements, {
      tag: 'button',
      text: textOrLabel,
    });
  }

  /**
   * Finds an input/textarea by placeholder, name, or label.
   */
  static findInput(elements: DomElement[], placeholderOrName: string): DomElement | null {
    return (
      DomQuery.findOne(elements, {
        tag: 'input',
        placeholder: placeholderOrName,
      }) ||
      DomQuery.findOne(elements, {
        tag: 'input',
        name: placeholderOrName,
      }) ||
      DomQuery.findOne(elements, {
        tag: 'input',
        text: placeholderOrName,
      }) ||
      DomQuery.findOne(elements, {
        tag: 'textarea',
        placeholder: placeholderOrName,
      })
    );
  }

  /**
   * Finds a link by text, aria-label, or href.
   */
  static findLink(elements: DomElement[], textOrHref: string): DomElement | null {
    const byText = DomQuery.findOne(elements, {
      tag: 'a',
      text: textOrHref,
    });
    if (byText) return byText;

    const trimmed = textOrHref.toLowerCase().trim();
    return elements.find(
      (el) =>
        (el.tag.toLowerCase() === 'a' || el.role === 'link') &&
        el.visible &&
        (el.href?.toLowerCase().includes(trimmed) || el.text?.toLowerCase().includes(trimmed))
    ) || null;
  }

  /**
   * Finds a form in a snapshot by ID, name, or action.
   */
  static findForm(snapshot: DomSnapshot, identifier?: string): DomFormInfo | null {
    if (!identifier) {
      return snapshot.forms.length > 0 ? snapshot.forms[0] : null;
    }
    const target = identifier.toLowerCase().trim();
    return (
      snapshot.forms.find(
        (f) =>
          f.id?.toLowerCase().includes(target) ||
          f.name?.toLowerCase().includes(target) ||
          f.action?.toLowerCase().includes(target) ||
          f.selector.toLowerCase().includes(target)
      ) || null
    );
  }
}
