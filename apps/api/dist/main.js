"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const path_1 = require("path");
const fs_1 = require("fs");
const express = require('express');
const http_exception_filter_1 = require("./common/http-exception.filter");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((req, _res, next) => {
        console.log(`[REQ] ${req.method} ${req.url} ct=${req.headers?.['content-type'] || ''}`);
        next();
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.GlobalHttpExceptionFilter());
    const uploadsDir = (0, path_1.join)(process.cwd(), 'uploads');
    if (!(0, fs_1.existsSync)(uploadsDir))
        (0, fs_1.mkdirSync)(uploadsDir, { recursive: true });
    app.use('/uploads', express.static(uploadsDir));
    app.enableCors({
        origin: [
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ],
        credentials: true,
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'Accept',
            'Origin',
        ],
    });
    const port = Number(process.env.API_PORT ?? 3000);
    await app.listen(port);
    console.log(`[BOOT] listening on ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map