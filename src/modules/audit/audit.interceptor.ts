// import {
//   Injectable,
//   NestInterceptor,
//   ExecutionContext,
//   CallHandler,
// } from '@nestjs/common';
// import { Observable, tap } from 'rxjs';
// import { AuditService } from './audit.service';

// @Injectable()
// export class AuditInterceptor implements NestInterceptor {
//   constructor(private readonly auditService: AuditService) {}

//   intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
//     const now = Date.now();
//     const req = context.switchToHttp().getRequest();
//     const userId = req.user?.id || null;
//     const operation = `${req.method} ${req.url}`;
//     const transactionId = `txn_${Date.now()}`;

//     return next.handle().pipe(
//       tap(async () => {
//         await this.auditService.logTransaction(
//           transactionId,
//           operation,
//           userId,
//           {
//             duration: Date.now() - now,
//             body: req.body,
//             params: req.params,
//             query: req.query,
//           },
//         );
//       }),
//     );
//   }
// }

export class AuditInterceptor {}