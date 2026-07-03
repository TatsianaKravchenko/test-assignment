import { Observable } from 'rxjs';

export const REPORT_PACKAGE = 'REPORT_PACKAGE';
export const REPORT_SERVICE_NAME = 'ReportService';

export interface ReportRequest {
  fromTs?: number;
  toTs?: number;
}

export interface ReportReply {
  pdf: Buffer;
  filename: string;
}

export interface ReportServiceClient {
  generateReport(data: ReportRequest): Observable<ReportReply>;
}
