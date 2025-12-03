"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateUserLogin = exports.validateUserRegistration = exports.handleValidationErrors = void 0;
const express_validator_1 = require("express-validator");
// 验证结果处理中间件
const handleValidationErrors = (req, res, next) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '输入数据验证失败',
            errors: errors.array().map(error => ({
                field: 'path' in error ? error.path : 'unknown',
                message: error.msg,
            })),
        });
    }
    next();
};
exports.handleValidationErrors = handleValidationErrors;
// 用户注册验证规则
exports.validateUserRegistration = [
    (0, express_validator_1.body)('username')
        .trim()
        .isLength({ min: 2, max: 20 })
        .withMessage('用户名长度必须在2-20个字符之间')
        .matches(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/)
        .withMessage('用户名只能包含字母、数字、下划线和中文字符'),
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .isLength({ min: 6 })
        .withMessage('密码至少需要6个字符')
        .matches(/^(?=.*[a-zA-Z])(?=.*\d)/)
        .withMessage('密码必须包含至少一个字母和一个数字'),
    (0, express_validator_1.body)('confirmPassword')
        .custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('确认密码与密码不匹配');
        }
        return true;
    }),
    exports.handleValidationErrors
];
// 用户登录验证规则
exports.validateUserLogin = [
    (0, express_validator_1.body)('email')
        .trim()
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    (0, express_validator_1.body)('password')
        .notEmpty()
        .withMessage('密码不能为空'),
    exports.handleValidationErrors
];
//# sourceMappingURL=validation.js.map