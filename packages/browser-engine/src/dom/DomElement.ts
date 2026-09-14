export interface DomElement {
  id: string;
  tag: string;
  role?: string;
  text?: string;
  placeholder?: string;
  ariaLabel?: string;
  selector: string;
  visible: boolean;
  enabled: boolean;
  type?: string;
  name?: string;
  value?: string;
  href?: string;
  src?: string;
  alt?: string;
  checked?: boolean;
  selected?: boolean;
  attributes?: Record<string, string>;
  childrenCount?: number;
}
