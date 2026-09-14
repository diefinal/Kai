import { VerificationResult } from './VerificationResult';

export interface BrowserVerificationState {
  isOpen?: boolean;
  currentUrl?: string;
  domChanged?: boolean;
  elementCount?: number;
  title?: string;
  activeTabId?: string;
  tabIds?: string[];
  loadingStarted?: boolean;
}


export interface DesktopVerificationState {
  processName?: string;
  processExists?: boolean;
  isProcessRunning?: boolean;
  windowVisible?: boolean;
  isWindowVisible?: boolean;
  isForeground?: boolean;
  windowTitle?: string;
}


export interface VisionVerificationState {
  ocrCompleted?: boolean;
  textLength?: number;
  detectedText?: string;
  ocrLines?: string[];
}

export interface VerificationContext {
  action: string;
  parameters: Record<string, unknown>;
  output?: unknown;
  error?: unknown;
  durationMs?: number;
  expectedState?: Record<string, unknown>;
  browserState?: BrowserVerificationState;
  desktopState?: DesktopVerificationState;
  visionState?: VisionVerificationState;
  customCheck?: (context?: any) => Promise<boolean | VerificationResult> | boolean | VerificationResult;
}

