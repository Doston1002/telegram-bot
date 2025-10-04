"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BotController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const ExcelJS = require("exceljs");
const message_entity_1 = require("./message.entity");
let BotController = class BotController {
    constructor(messageModel) {
        this.messageModel = messageModel;
    }
    async downloadExcel(res) {
        try {
            const docs = await this.messageModel.find({}).sort({ createdAt: 1 }).exec();
            console.log("Controller da topilgan ma'lumotlar soni:", docs.length);
            if (docs.length === 0) {
                return res.status(404).json({ message: "Hech qanday ma'lumot topilmadi" });
            }
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Messages');
            worksheet.addRow([]);
            worksheet.getCell('A1').value = `📊 Hisobot: Barcha ma'lumotlar (${docs.length} ta), saralangan: Eski birinchi`;
            worksheet.getCell('A1').font = { bold: true, color: { argb: 'FF0070C0' } };
            worksheet.addRow([]);
            worksheet.columns = [
                { header: 'Ism Familiya', key: 'firstName', width: 25 },
                { header: 'Jins', key: 'gender', width: 15 },
                { header: "Tug'ilgan kun", key: 'birthDate', width: 20 },
                { header: 'Viloyat', key: 'region', width: 20 },
                { header: 'Tuman/Shahar', key: 'district', width: 20 },
                { header: 'Yashash manzili', key: 'address', width: 100 },
                { header: 'Maktab raqami', key: 'schoolNumber', width: 15 },
                { header: 'Sinf', key: 'grade', width: 15 },
                { header: "Ta'lim turi", key: 'educationType', width: 30 },
                { header: "Yo'nalish", key: 'specialization', width: 25 },
                { header: 'Nogironlik guruhi', key: 'disabilityGroup', width: 20 },
                { header: 'Telefon raqam', key: 'phoneNumber', width: 20 },
                { header: 'Yaratilgan vaqt (Toshkent)', key: 'createdAt', width: 25 },
            ];
            docs.forEach(msg => {
                const row = msg.toObject();
                row.birthDate = row.birthDate
                    ? new Date(row.birthDate)
                        .toLocaleDateString('uz-UZ', {
                        timeZone: 'Asia/Tashkent',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                    })
                        .split('/')
                        .join('.')
                    : '';
                row.createdAt = row.createdAt
                    ? new Date(row.createdAt).toLocaleString('uz-UZ', {
                        timeZone: 'Asia/Tashkent',
                        hour12: false,
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                    })
                    : '';
                worksheet.addRow(row);
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=messages.xlsx');
            await workbook.xlsx.write(res);
            res.status(200).end();
        }
        catch (error) {
            console.error('Excel download xatosi:', error);
            res.status(500).json({ message: 'Xato: ' + error.message });
        }
    }
};
__decorate([
    (0, common_1.Get)('download'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], BotController.prototype, "downloadExcel", null);
BotController = __decorate([
    (0, common_1.Controller)('bot'),
    __param(0, (0, mongoose_1.InjectModel)(message_entity_1.Message.name)),
    __metadata("design:paramtypes", [Function])
], BotController);
exports.BotController = BotController;
//# sourceMappingURL=bot.controller.js.map