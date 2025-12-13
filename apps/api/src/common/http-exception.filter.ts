import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { isAiError } from './errors/ai-error';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    if (isAiError(exception)) {
      const body = {
        statusCode: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
      return res.status(exception.status).json(body);
    }

    // Nest HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response: any = exception.getResponse();
      const message =
        (typeof response === 'string' ? response : response?.message) || exception.message;
      const body = {
        statusCode: status,
        code: response?.code || 'HTTP_EXCEPTION',
        message,
        details: typeof response === 'object' ? response : undefined,
      };
      return res.status(status).json(body);
    }

    // fallback
    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const body = {
      statusCode: status,
      code: 'INTERNAL_SERVER_ERROR',
      message: exception?.message || 'Internal server error',
    };
    return res.status(status).json(body);
  }
}
