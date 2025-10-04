import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { InjectModel } from '@nestjs/mongoose';
import type { Model } from 'mongoose';
import * as ExcelJS from 'exceljs';
import { Message } from './message.entity';

@Controller('bot')
export class BotController {
  private readonly messageModel: Model<Message>;

  constructor(@InjectModel(Message.name) messageModel: Model<Message>) {
    this.messageModel = messageModel;
  }

  @Get('download')
  async downloadExcel(@Res() res: Response) {
    try {
      const docs: any[] = await this.messageModel.find({}).sort({ createdAt: 1 }).exec();
      console.log("Controller da topilgan ma'lumotlar soni:", docs.length);

      if (docs.length === 0) {
        return res.status(404).json({ message: "Hech qanday ma'lumot topilmadi" });
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Messages');

      worksheet.addRow([]);
      worksheet.getCell(
        'A1',
      ).value = `📊 Hisobot: Barcha ma'lumotlar (${docs.length} ta), saralangan: Eski birinchi`;
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

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', 'attachment; filename=messages.xlsx');

      await workbook.xlsx.write(res);
      res.status(200).end();
    } catch (error) {
      console.error('Excel download xatosi:', error);
      res.status(500).json({ message: 'Xato: ' + error.message });
    }
  }
}
