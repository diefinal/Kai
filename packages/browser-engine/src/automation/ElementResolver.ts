import { DomElement } from '../dom/DomElement';

export interface ElementSearchCriteria {
  text?: string;
  role?: string;
  tag?: string;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  id?: string;
  type?: string;
  selector?: string;
  visibleOnly?: boolean;
}

export interface ResolvedElementMatch {
  element: DomElement;
  score: number;
  matchedCriteria: string[];
  alternativeSelectors: string[];
}

export class ElementResolver {
  resolve(
    elements: DomElement[],
    criteria: ElementSearchCriteria | string
  ): ResolvedElementMatch | null {
    const crit = typeof criteria === 'string' ? { text: criteria } : criteria;
    const matches = this.resolveAll(elements, crit);
    return matches.length > 0 ? matches[0] : null;
  }

  resolveAll(
    elements: DomElement[],
    criteria: ElementSearchCriteria
  ): ResolvedElementMatch[] {
    const results: ResolvedElementMatch[] = [];

    for (const el of elements) {
      if (criteria.visibleOnly !== false && !el.visible) {
        continue;
      }

      let score = 0;
      const matchedCriteria: string[] = [];

      // 1. Direct CSS Selector
      if (criteria.selector && el.selector === criteria.selector) {
        score += 100;
        matchedCriteria.push('selector');
      }

      // 2. ID match
      if (criteria.id && el.id && el.id.toLowerCase() === criteria.id.toLowerCase()) {
        score += 90;
        matchedCriteria.push('id');
      }

      // 3. Name match
      if (criteria.name && el.name && el.name.toLowerCase() === criteria.name.toLowerCase()) {
        score += 80;
        matchedCriteria.push('name');
      }

      // 4. Text Match (visible text)
      if (criteria.text && el.text) {
        const targetText = criteria.text.trim().toLowerCase();
        const elText = el.text.trim().toLowerCase();

        if (elText === targetText) {
          score += 60;
          matchedCriteria.push('text_exact');
        } else if (elText.includes(targetText) || targetText.includes(elText)) {
          score += 35;
          matchedCriteria.push('text_partial');
        }
      }

      // 5. Aria-Label Match
      if (criteria.ariaLabel && el.ariaLabel) {
        const targetAria = criteria.ariaLabel.trim().toLowerCase();
        const elAria = el.ariaLabel.trim().toLowerCase();

        if (elAria === targetAria) {
          score += 55;
          matchedCriteria.push('aria_exact');
        } else if (elAria.includes(targetAria)) {
          score += 30;
          matchedCriteria.push('aria_partial');
        }
      }

      // 6. Placeholder Match
      if (criteria.placeholder && el.placeholder) {
        const targetPh = criteria.placeholder.trim().toLowerCase();
        const elPh = el.placeholder.trim().toLowerCase();

        if (elPh === targetPh) {
          score += 50;
          matchedCriteria.push('placeholder_exact');
        } else if (elPh.includes(targetPh)) {
          score += 25;
          matchedCriteria.push('placeholder_partial');
        }
      }

      // 7. Role Match
      if (criteria.role && el.role && el.role.toLowerCase() === criteria.role.toLowerCase()) {
        score += 20;
        matchedCriteria.push('role');
      }

      // 8. Tag Match
      if (criteria.tag && el.tag.toLowerCase() === criteria.tag.toLowerCase()) {
        score += 15;
        matchedCriteria.push('tag');
      }

      // 9. Type Match
      if (criteria.type && el.type && el.type.toLowerCase() === criteria.type.toLowerCase()) {
        score += 15;
        matchedCriteria.push('type');
      }

      // Bonus points for visible & enabled elements
      if (score > 0) {
        if (el.visible) score += 10;
        if (el.enabled) score += 5;

        const alternativeSelectors = this.generateAlternativeSelectors(el);
        results.push({
          element: el,
          score,
          matchedCriteria,
          alternativeSelectors,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  generateAlternativeSelectors(el: DomElement): string[] {
    const selectors: string[] = [];

    if (el.id) {
      selectors.push(`#${el.id}`);
      selectors.push(`${el.tag}#${el.id}`);
    }

    if (el.name) {
      selectors.push(`${el.tag}[name="${el.name}"]`);
    }

    if (el.ariaLabel) {
      selectors.push(`${el.tag}[aria-label="${el.ariaLabel}"]`);
    }

    if (el.placeholder) {
      selectors.push(`${el.tag}[placeholder="${el.placeholder}"]`);
    }

    if (el.role) {
      selectors.push(`[role="${el.role}"]`);
    }

    if (el.text && el.text.trim()) {
      selectors.push(`${el.tag}:has-text("${el.text.trim().substring(0, 30)}")`);
    }

    if (el.selector && !selectors.includes(el.selector)) {
      selectors.push(el.selector);
    }

    return selectors;
  }
}
