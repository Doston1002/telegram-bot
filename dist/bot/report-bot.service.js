'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.ReportBotService = void 0;
const common_1 = require('@nestjs/common');
const mongoose_1 = require('@nestjs/mongoose');
const message_entity_1 = require('./message.entity');
const telegraf_1 = require('telegraf');
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');
const REPORT_BOT_TOKEN = '8237553914:AAE19a-64DxV--NJt5b-cfxjbKpKDivwIQQ';
const ADMIN_CHAT_ID = 5531717864;
let ReportBotService = class ReportBotService {
  constructor(messageModel) {
    this.messageModel = messageModel;
    this.bot = new telegraf_1.Telegraf(REPORT_BOT_TOKEN);
  }
  async onModuleInit() {
    this.startTime = new Date();
    this.setupHandlers();
    await this.bot.launch();
    console.log('📊 Report bot ishga tushdi... (Vaqt: ' + this.startTime.toISOString() + ')');
  }
  setupHandlers() {
    this.bot.start(async ctx => {
      if (ctx.chat.id !== ADMIN_CHAT_ID) {
        return ctx.reply("❌ Sizda ruxsat yo'q. Faqat admin foydalanishi mumkin.");
      }
      await ctx.reply("📊 Ma'lumotlar yuklanmoqda... Iltimos, kuting.");
      try {
        const docs = await this.messageModel.find({}).sort({ createdAt: 1 }).exec();
        console.log("📋 Topilgan ma'lumotlar soni:", docs.length);
        if (docs.length === 0) {
          return ctx.reply("📭 Umumiy bazada hech qanday ma'lumot yo'q. Bot orqali test qiling.");
        }
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Ro'yxatdan o'tganlar");
        worksheet.addRow([]);
        worksheet.getCell(
          'A1',
        ).value = `📊 Hisobot: Barcha ma'lumotlar (${docs.length} ta yozuv), saralangan: Eski birinchi`;
        worksheet.getCell('A1').font = { bold: true, color: { argb: 'FF0070C0' } };
        worksheet.addRow([]);
        worksheet.columns = [
          { header: 'Ism Familiya', key: 'firstName', width: 25 },
          { header: 'Jins', key: 'gender', width: 15 },
          { header: "Tug'ilgan kun", key: 'birthDate', width: 20 },
          { header: 'Viloyat', key: 'region', width: 20 },
          { header: 'Tuman/Shahar', key: 'district', width: 20 },
          { header: 'Manzil', key: 'address', width: 30 },
          { header: 'Maktab raqami', key: 'schoolNumber', width: 15 },
          { header: 'Sinf', key: 'grade', width: 15 },
          { header: "Ta'lim turi", key: 'educationType', width: 30 },
          { header: "Yo'nalish", key: 'specialization', width: 25 },
          { header: 'Nogironlik guruhi', key: 'disabilityGroup', width: 20 },
          { header: 'Telefon raqam', key: 'phoneNumber', width: 20 },
          { header: 'Yaratilgan vaqt (Toshkent)', key: 'createdAt', width: 25 },
        ];
        docs.forEach((msg, index) => {
          const row = msg.toObject();
          row.birthDate = row.birthDate
            ? new Date(row.birthDate).toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent' })
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
          row.phoneNumber = row.phoneNumber || '';
          console.log(`Qator ${index + 1} vaqti (Toshkent):`, row.createdAt);
          worksheet.addRow(row);
        });
        const tempDir = path.join(__dirname, '..', '..', 'temp');
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const fileName = `hisobot_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filePath = path.join(tempDir, fileName);
        await workbook.xlsx.writeFile(filePath);
        await ctx.replyWithDocument({
          source: filePath,
          filename: fileName,
        });
        fs.unlinkSync(filePath);
        await ctx.reply(
          `✅ Hisobot yuborildi! Jami ${docs.length} ta ma'lumot, saralangan: Eski birinchi (yangi oxirida). Vaqt Toshkent bo'yicha.`,
        );
      } catch (error) {
        console.error('Hisobot xatosi:', error);
        await ctx.reply('❌ Hisobot yaratishda xato: ' + error.message);
      }
    });
    this.bot.command('stats', async ctx => {
      if (ctx.chat.id !== ADMIN_CHAT_ID) {
        return ctx.reply("❌ Ruxsat yo'q.");
      }
      const count = await this.messageModel.countDocuments({});
      console.log("Stats so'rovi: Umumiy son =", count);
      await ctx.reply(`📈 Statistik: Umumiy ${count} ta ro'yxatdan o'tgan foydalanuvchi.`);
    });
  }
};
ReportBotService = __decorate(
  [
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_entity_1.Message.name)),
    __metadata('design:paramtypes', [Function]),
  ],
  ReportBotService,
);
exports.ReportBotService = ReportBotService;
//# sourceMappingURL=report-bot.service.js.map
