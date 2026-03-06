import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';

// Map HTTP methods + route patterns to meaningful actions
const ACTION_MAP: Record<string, string> = {
  'POST /api/auth/login': 'LOGIN',
  'POST /api/auth/register': 'REGISTER',
  'POST /api/auth/refresh-token': 'TOKEN_REFRESH',
  'POST /api/auth/change-password': 'PASSWORD_CHANGE',
  'GET /api/admin/reports/export': 'EXPORT',
};

function getAction(method: string, url: string): string {
  // Check exact matches first
  const key = `${method} ${url.split('?')[0]}`;
  if (ACTION_MAP[key]) return ACTION_MAP[key];

  // Map by HTTP method
  switch (method) {
    case 'POST':
      return 'CREATE';
    case 'PUT':
    case 'PATCH':
      return 'UPDATE';
    case 'DELETE':
      return 'DELETE';
    default:
      return 'READ';
  }
}

function getResource(url: string): string {
  const path = url.split('?')[0].replace('/api/', '').replace('admin/', '');
  const segment = path.split('/')[0];
  return segment || 'unknown';
}

function getResourceId(url: string): string | undefined {
  const path = url.split('?')[0];
  const parts = path.split('/');
  // Look for MongoDB ObjectId pattern or any ID after a resource name
  const idPart = parts.find((p) => /^[0-9a-fA-F]{24}$/.test(p));
  return idPart;
}

function getDescription(method: string, url: string, statusCode: number): string {
  const action = getAction(method, url);
  const resource = getResource(url);
  const id = getResourceId(url);

  if (action === 'LOGIN') return `User login attempt`;
  if (action === 'LOGIN_FAILED') return `Failed login attempt`;
  if (action === 'REGISTER') return `New user registration`;
  if (action === 'PASSWORD_CHANGE') return `Password changed`;
  if (action === 'EXPORT') return `Exported ${resource} data`;
  if (action === 'CREATE') return `Created ${resource}${id ? ` (${id})` : ''}`;
  if (action === 'UPDATE') return `Updated ${resource}${id ? ` (${id})` : ''}`;
  if (action === 'DELETE') return `Deleted ${resource}${id ? ` (${id})` : ''}`;
  if (action === 'READ' && id) return `Viewed ${resource} (${id})`;

  return `${method} ${resource}`;
}

// Skip logging for these patterns (high-frequency, low-value)
const SKIP_PATTERNS = [
  '/api/auth/refresh-token',
  '/uploads/',
  '/favicon.ico',
];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;

    // Skip non-audit-worthy requests
    if (method === 'OPTIONS') return next.handle();
    if (SKIP_PATTERNS.some((p) => url.includes(p))) return next.handle();
    // Skip GET list/read requests for non-sensitive resources to reduce noise
    if (method === 'GET' && !url.includes('/export') && !url.includes('admin/audit')) {
      return next.handle();
    }

    const user = request.user;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const statusCode = response.statusCode;

        const action = url.includes('/auth/login') ? 'LOGIN' : getAction(method, url);

        this.auditService.log({
          action,
          resource: getResource(url),
          userId: user?._id,
          userEmail: user?.email,
          userRole: user?.role,
          resourceId: getResourceId(url),
          description: getDescription(method, url, statusCode),
          method,
          endpoint: url.split('?')[0],
          ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || ip,
          userAgent: headers['user-agent'],
          statusCode,
          metadata: { duration: Date.now() - startTime },
        });
      }),
      catchError((error) => {
        const statusCode = error.status || 500;

        const action = url.includes('/auth/login')
          ? 'LOGIN_FAILED'
          : `${getAction(method, url)}_FAILED`;

        this.auditService.log({
          action,
          resource: getResource(url),
          userId: user?._id,
          userEmail: user?.email || request.body?.email,
          userRole: user?.role,
          resourceId: getResourceId(url),
          description:
            action === 'LOGIN_FAILED'
              ? `Failed login attempt for ${request.body?.email || 'unknown'}`
              : `Failed: ${error.message}`,
          method,
          endpoint: url.split('?')[0],
          ipAddress: headers['x-forwarded-for'] || headers['x-real-ip'] || ip,
          userAgent: headers['user-agent'],
          statusCode,
          metadata: { error: error.message, duration: Date.now() - startTime },
        });

        throw error;
      }),
    );
  }
}
