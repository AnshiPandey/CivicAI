export type SeverityLevel = 1 | 2 | 3 | 4 | 5;

export type ComplaintPriority = 'low' | 'medium' | 'high' | 'critical';

export type ComplaintStatus = 'pending' | 'in-progress' | 'resolved' | 'rejected';

export interface Complaint {
  id: string;
  title: string;
  description: string;
  department: string;
  severity: SeverityLevel;
  priority: ComplaintPriority;
  status: ComplaintStatus;
  estimatedResolutionTime: string;
  suggestedAction: string;
  images: string[];
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
  reportedBy: string;
  reporterName: string;
  assignedOfficer?: string;
  resolutionNotes?: string;
  isFake?: boolean;
  estimatedRepairTime?: string;
  recommendedAction?: string;
  confidence?: number;
  citizenTips?: string;
  fakeComplaintProbability?: number;
  detectedIssues?: string[];
  aiReasoning?: string;
}

export interface DepartmentStats {
  department: string;
  count: number;
}

export interface StatusStats {
  pending: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  critical: number;
  fakeReports: number;
  total: number;
}
