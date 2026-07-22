export type ReportStep =
  'evidence' | 'location' | 'category' | 'description' | 'privacy' | 'review';
export interface ReportStepperProps {
  currentStep: ReportStep;
  completedSteps: ReportStep[];
  canProceed: boolean;
  errors?: Partial<Record<ReportStep, string>>;
  onNext: () => void;
  onBack: () => void;
  onJumpToStep?: (step: ReportStep) => void;
}
export type ReportStatus =
  | 'open'
  | 'assigned'
  | 'acknowledged'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'closed'
  | 'duplicate'
  | 'no_action';
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  status: ReportStatus;
  category: string;
  title: string;
  confidence?: 'high' | 'medium' | 'low';
}
export interface StatusEvent {
  id: string;
  status: string;
  actorType: 'system' | 'citizen' | 'department' | 'moderator';
  actorLabel: string;
  timestamp: string;
  note?: string;
  mediaUrl?: string;
}
export interface ContactEntry {
  id: string;
  officeName: string;
  departmentName: string;
  wardName?: string;
  roleTitle: string;
  officerName?: string;
  phones: string[];
  whatsapp?: string;
  email?: string;
  address?: string;
  hours?: string;
  languages?: string[];
  tags?: string[];
}
