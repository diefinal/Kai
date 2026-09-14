import { ToolCategory } from './ToolMetadata';
import { ToolDefinition } from './ToolDefinition';

export interface IUnifiedToolResolver {
  resolveById(id: string): ToolDefinition | undefined;
  resolveByCapability(capability: string): ToolDefinition[];
  resolveByCategory(category: ToolCategory): ToolDefinition[];
  findBestMatch(query: string): ToolDefinition | undefined;
}

export class ToolResolver implements IUnifiedToolResolver {

  private readonly aliasMap = new Map<string, string>([
    ['navigate', 'browser.navigate'],
    ['open_browser', 'browser.open'],
    ['read_dom', 'browser.read_dom'],
    ['query_dom', 'browser.query_dom'],
    ['open_application', 'windows.open'],
    ['bring_to_front', 'windows.bring_to_front'],
    ['read_screen', 'vision.read'],
    ['capture_screen', 'vision.capture'],
  ]);

  constructor(private readonly getTools: () => ToolDefinition[]) {}

  resolveById(id: string): ToolDefinition | undefined {
    const tools = this.getTools();
    const exact = tools.find((t) => t.metadata.id.toLowerCase() === id.toLowerCase());
    if (exact) return exact;

    const mappedId = this.aliasMap.get(id.toLowerCase());
    if (mappedId) {
      const exactMapped = tools.find((t) => t.metadata.id.toLowerCase() === mappedId.toLowerCase());
      if (exactMapped) return exactMapped;

      const prefix = mappedId.split('.')[0];
      const categoryMatch = tools.find(
        (t) => t.metadata.id.toLowerCase().startsWith(`${prefix}.`) || t.metadata.category === prefix
      );
      if (categoryMatch) return categoryMatch;
    }

    return undefined;
  }


  resolveByCapability(capability: string): ToolDefinition[] {
    const normalized = capability.toLowerCase();
    return this.getTools().filter((t) => {
      const caps = t.metadata.capabilities || [t.metadata.id];
      return caps.some((c) => c.toLowerCase() === normalized);
    });
  }

  resolveByCategory(category: ToolCategory): ToolDefinition[] {
    return this.getTools().filter((t) => t.metadata.category === category);
  }

  findBestMatch(query: string): ToolDefinition | undefined {
    const direct = this.resolveById(query);
    if (direct) return direct;

    const byCap = this.resolveByCapability(query);
    if (byCap.length > 0) return byCap[0];

    const lowerQuery = query.toLowerCase();
    return this.getTools().find((t) => {
      const idMatch = t.metadata.id.toLowerCase().includes(lowerQuery);
      const nameMatch = t.metadata.name.toLowerCase().includes(lowerQuery);
      const tagMatch = t.metadata.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery));
      return idMatch || nameMatch || tagMatch;
    });
  }
}
