import { Injectable, type OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import { Message } from '../bot/message.entity';
import { Telegraf } from 'telegraf';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const REPORT_BOT_TOKEN = '7804568258:AAG_uCt2otfljGkra8qhnUk1UAOis7b1uGM';
const ADMIN_CHAT_ID = 5531717864;

@Injectable()
export class ReportBotService implements OnModuleInit {
  private bot: Telegraf;
  private startTime: Date;

  constructor(@InjectModel(Message.name) private messageModel: Model<Message>) {
    this.bot = new Telegraf(REPORT_BOT_TOKEN);
  }

  async onModuleInit() {
    this.startTime = new Date();
    this.setupHandlers();
    await this.bot.launch();
    console.log('📊 Report bot ishga tushdi... (Vaqt: ' + this.startTime.toISOString() + ')');
  }

  private setupHandlers() {
    this.bot.start(async ctx => {
      if (ctx.chat.id !== ADMIN_CHAT_ID) {
        return ctx.reply("❌ Sizda ruxsat yo'q. Faqat admin foydalanishi mumkin.");
      }

      await ctx.reply("📊 Ma'lumotlar yuklanmoqda... Iltimos, kuting.");

      try {
        const docs: any[] = await this.messageModel.find({}).sort({ createdAt: 1 }).exec();

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
}
