import { DomElement } from './DomElement';

export interface DomFormInfo {
  id?: string;
  name?: string;
  action?: string;
  method?: string;
  selector: string;
  inputs: DomElement[];
}

export interface DomTableInfo {
  id?: string;
  selector: string;
  headers: string[];
  rowCount: number;
  columnCount: number;
}

export interface DomSnapshot {
  title: string;
  url: string;
  timestamp: number;
  forms: DomFormInfo[];
  buttons: DomElement[];
  links: DomElement[];
  inputs: DomElement[];
  textareas: DomElement[];
  selects: DomElement[];
  checkboxes: DomElement[];
  radioButtons: DomElement[];
  images: DomElement[];
  tables: DomTableInfo[];
  visibleText: string;
  elements: DomElement[];
}
