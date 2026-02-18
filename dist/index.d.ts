// Type definitions for AgentPages v0.5.1

type Theme = 'light' | 'dark';
type IconMode = 'line' | 'solid' | 'none';
type Background = 'default' | 'muted' | 'transparent';

export interface Colors {
  colorBg?: string;
  colorFg?: string;
  colorMuted?: string;
  colorBorder?: string;
  colorPrimary?: string;
  colorPrimaryHover?: string;
  colorAccent?: string;
  colorBgAccent?: string;
}

export interface SafetyLimits {
  MAX_SECTIONS?: number;
  MAX_TABLE_ROWS?: number;
  MAX_FAQ_ITEMS?: number;
  MAX_LIST_ITEMS?: number;
  MAX_FEATURES?: number;
  MAX_STEPS?: number;
  MAX_NESTING_DEPTH?: number;
  MAX_STRING_LENGTH?: number;
}

export type ActionPolicy = 'allowAll' | 'allowList' | 'denyAll';

export interface Options {
  theme?: Theme;
  iconMode?: IconMode;
  colors?: Colors;
  background?: Background;

  useShadow?: boolean;
  cspNonce?: string | null;

  trustedTypesPolicyName?: string;
  trustedTypesPolicy?: any;

  actionPolicy?: ActionPolicy;
  allowedActions?: string[];
  onAction?: (actionName: string, event: Event | null, payload?: any) => void;

  componentCatalog?: Record<string, (data: any, ctx: any) => HTMLElement>;

  safetyLimits?: SafetyLimits;
}

export interface PageSpec {
  theme?: Theme;
  iconMode?: IconMode;
  style?: { background?: Background | string };
  sections: SectionSpec[];
  [k: string]: any;
}

export type SectionSpec = { type: string; [k: string]: any };

declare class AgentPages {
  static componentTypes: readonly string[];

  constructor(target: string | Element, options?: Options);

  render(pageSpec: PageSpec): void;

  renderStream(stream: any): Promise<void>;
  renderStreamNDJSON(stream: any): Promise<void>;

  addSection(sectionSpec: SectionSpec): void;
  addSections(sections: SectionSpec[]): void;

  updateSection(index: number, sectionSpec: SectionSpec): boolean;
  removeSection(index: number): boolean;

  toJSON(): any;
  toHTML(): string;

  clear(): void;
  destroy(): void;

  setTheme(theme: Theme, colors?: Colors): void;
  setBackground(bg: Background): void;

  on(eventName: string, handler: (payload: any) => void): () => void;
  off(eventName: string, handler: (payload: any) => void): void;
}

export = AgentPages;
export as namespace AgentPages;
