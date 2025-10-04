'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.getJWTConfig = void 0;
const getJWTConfig = async configService => {
  return {
    secret: configService.get('SECRET_JWT'),
  };
};
exports.getJWTConfig = getJWTConfig;
//# sourceMappingURL=jwt.config.js.map
