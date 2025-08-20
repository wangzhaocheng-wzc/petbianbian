"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
class Logger {
    /**
     * 记录信息日志
     */
    static info(message, ...args) {
        console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
    }
    /**
     * 记录警告日志
     */
    static warn(message, ...args) {
        console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
    }
    /**
     * 记录错误日志
     */
    static error(message, error) {
        console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
        if (error) {
            console.error(error);
        }
    }
    /**
     * 记录调试日志
     */
    static debug(message, ...args) {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=logger.js.map