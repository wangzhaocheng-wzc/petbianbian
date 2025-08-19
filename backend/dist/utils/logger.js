"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
// 简单的日志工具
class Logger {
    static info(message, ...args) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
    static error(message, error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
    }
    static warn(message, ...args) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
    static debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map