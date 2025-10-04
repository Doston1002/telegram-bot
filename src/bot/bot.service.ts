import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Model } from 'mongoose';
import type { MessageDocument } from './message.entity';
import { Telegraf, Markup } from 'telegraf';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';

const BOT_TOKEN = '8237553914:AAE19a-64DxV--NJt5b-cfxjbKpKDivwIQQ';
const ADMIN_CHAT_ID = 5531717864;

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private userSteps = new Map<number, string>();
  private messageModel: Model<MessageDocument>;

  constructor() {
    this.bot = new Telegraf(BOT_TOKEN);
  }

  async onModuleInit() {
    this.startBot();
    await this.bot.launch();
    console.log('🤖 Bot ishga tushdi...');
  }

  startBot() {
    // /start - Admin uchun Excel hisobot, oddiy foydalanuvchilar uchun ro'yxatdan o'tish
    this.bot.start(async ctx => {
      const chatIdNum = ctx.chat.id;

      if (chatIdNum === ADMIN_CHAT_ID) {
        await ctx.reply("📊 Ma'lumotlar yuklanmoqda... Iltimos, kuting.");

        try {
          const docs: any[] = await this.messageModel.find({}).sort({ createdAt: 1 }).exec();

          if (docs.length === 0) {
            return ctx.reply("📭 Umumiy bazada hech qanday ma'lumot yo'q.");
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

          docs.forEach(msg => {
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
        return;
      }

      if (this.userSteps.has(chatIdNum)) {
        await ctx.reply(
          "Sizda allaqachon ro'yxatdan o'tish jarayoni boshlangan. Iltimos, uni tugating yoki /reset buyrug'ini yuboring.",
          Markup.inlineKeyboard([[Markup.button.callback('🔄 Jarayonni tozalash', 'reset_steps')]]),
        );
        return;
      }

      this.userSteps.set(chatIdNum, 'askName');
      await ctx.reply(
        "Assalomu alaykum!\n\nIsm va familiyangizni lotin alifbosida, pasport yoki tug'ilganlik guvohnomasiga mos ravishda yozing:",
      );
    });

    // /reset
    this.bot.command('reset', async ctx => {
      const chatIdNum = ctx.chat.id;
      this.userSteps.delete(chatIdNum);
      await ctx.reply("✅ Jarayon tozalandi. Endi /start buyrug'ini bosing.");
    });

    this.bot.command('stats', async ctx => {
      if (ctx.chat.id !== ADMIN_CHAT_ID) {
        return ctx.reply("❌ Ruxsat yo'q.");
      }

      const count = await this.messageModel.countDocuments({});
      await ctx.reply(`📈 Statistik: Umumiy ${count} ta ro'yxatdan o'tgan foydalanuvchi.`);
    });

    this.bot.action('reset_steps', async ctx => {
      const chatIdNum = ctx.chat.id;
      this.userSteps.delete(chatIdNum);
      await ctx.answerCbQuery('Jarayon tozalandi!');
      await ctx.reply("✅ Jarayon tozalandi. Endi ro'yxatdan o'tishni boshlang.");
    });

    // Matn xabarlari umumiy handleri
    this.bot.on('text', async ctx => {
      const chatIdNum = ctx.chat.id;
      const chatId = chatIdNum.toString();
      const step = this.userSteps.get(chatIdNum);

      if (!step) {
        return ctx.reply("Iltimos, /start buyrug'ini bosing va ro'yxatdan o'tishni boshlang.");
      }

      // askName
      if (step === 'askName') {
        await this.messageModel.findOneAndUpdate(
          { chatId },
          { chatId, firstName: ctx.message.text },
          { upsert: true },
        );

        this.userSteps.set(chatIdNum, 'askGender');
        return ctx.reply(
          'Jinsingizni tanlang:',
          Markup.inlineKeyboard([
            [Markup.button.callback('Erkak', 'gender_male')],
            [Markup.button.callback('Ayol', 'gender_female')],
          ]),
        );
      }

      // askBirthDate
      if (step === 'askBirthDate') {
        const birthDateStr = ctx.message.text.trim();
        const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
        if (!dateRegex.test(birthDateStr)) {
          return ctx.reply(
            "Iltimos, tug'ilgan kuningizni DD.MM.YYYY formatida kiriting (masalan: 02.10.1999):",
          );
        }

        const [day, month, year] = birthDateStr.split('.').map(Number);
        const birthDate = new Date(year, month - 1, day);
        if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
          return ctx.reply(
            "Noto'g'ri sana. Iltimos, to'g'ri sana kiriting (kelajak sanasi bo'lmasligi kerak):",
          );
        }

        await this.messageModel.updateOne({ chatId }, { birthDate });

        this.userSteps.set(chatIdNum, 'askRegion');
        return ctx.reply(
          'Hududingizni tanlang:',
          Markup.inlineKeyboard(
            regions.map(r => [Markup.button.callback(r.name, `region_${r.id}`)]),
          ),
        );
      }

      // askAddress
      if (step === 'askAddress') {
        await this.messageModel.updateOne({ chatId }, { address: ctx.message.text });
        this.userSteps.set(chatIdNum, 'askSchool');
        return ctx.reply('Maktab raqamini kiriting (faqat raqam, masalan: 123):');
      }

      // askSchool
      if (step === 'askSchool') {
        if (/^\d+$/.test(ctx.message.text)) {
          await this.messageModel.updateOne({ chatId }, { schoolNumber: Number(ctx.message.text) });
          this.userSteps.set(chatIdNum, 'askGrade');
          return ctx.reply(
            'Sinfingizni tanlang:',
            Markup.inlineKeyboard(
              Array.from({ length: 8 }, (_, i) => [
                Markup.button.callback(`${i + 3}-sinf`, `grade_${i + 3}`),
              ]),
            ),
          );
        } else {
          return ctx.reply(
            'Iltimos, maktab raqamini faqat raqam sifatida kiriting (masalan: 123):',
          );
        }
      }
    });

    // Contact handler
    this.bot.on('contact', async ctx => {
      const chatIdNum = ctx.chat.id;
      const step = this.userSteps.get(chatIdNum);
      if (step !== 'askPhone') return;

      const phoneNumber = ctx.message.contact.phone_number;
      const chatId = chatIdNum.toString();

      await this.messageModel.updateOne({ chatId }, { phoneNumber });

      // Jarayon tugadi
      this.userSteps.delete(chatIdNum);
      await ctx.reply("✅ Telefon raqamingiz saqlandi. Ro'yxatdan o'tish jarayoni yakunlandi!");
      await ctx.reply('Jarayon tugadi.', Markup.removeKeyboard());
    });

    // Gender tanlash
    this.bot.action(/gender_(.+)/, async ctx => {
      const gender = ctx.match[1] === 'male' ? 'Erkak' : 'Ayol';
      await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { gender });

      this.userSteps.set(ctx.chat.id, 'askBirthDate');
      await ctx.answerCbQuery();
      await ctx.reply("Tug'ilgan kuningizni kiriting (DD.MM.YYYY formatida, masalan: 02.10.1999):");
    });

    // Region tanlash
    this.bot.action(/region_(\d+)/, async ctx => {
      const regionId = ctx.match[1];
      const region = regions.find(r => r.id == +regionId);

      if (!region) {
        return ctx.reply("Hudud topilmadi. /start buyrug'ini qayta bosing.");
      }

      await this.messageModel.updateOne(
        { chatId: ctx.chat.id.toString() },
        { region: region.name },
      );

      this.userSteps.set(ctx.chat.id, `askDistrict_${regionId}`);

      const districts = districtsData[regionId] || [];
      if (districts.length === 0) {
        await ctx.reply("Bu hudud uchun tumanlar topilmadi. /start buyrug'ini qayta bosing.");
        return;
      }

      await ctx.reply(
        `${region.name}dan tumaningizni tanlang:`,
        Markup.inlineKeyboard(
          districts.map(d => [Markup.button.callback(d, `district_${encodeURIComponent(d)}`)]),
        ),
      );
    });

    // District tanlash
    this.bot.action(/district_(.+)/, async ctx => {
      const district = decodeURIComponent(ctx.match[1]);

      await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { district });

      this.userSteps.set(ctx.chat.id, 'askAddress');
      await ctx.reply("Yashash manzilingizni kiriting (masalan: Do'stlik MFY 12-uy):");
    });

    // Grade tanlash
    this.bot.action(/grade_(\d+)/, async ctx => {
      const grade = ctx.match[1];

      await this.messageModel.updateOne(
        { chatId: ctx.chat.id.toString() },
        { grade: `${grade}-sinf` },
      );

      this.userSteps.set(ctx.chat.id, 'askEducationType');

      await ctx.reply(
        "Ta'lim turini tanlang:",
        Markup.inlineKeyboard([
          [Markup.button.callback("Inklyuziv ta'lim sinfi", 'edu_inclusive')],
          [Markup.button.callback("Uyda yakka tartibdagi ta'lim", 'edu_home')],
        ]),
      );
    });

    // Education type
    this.bot.action(/edu_(.+)/, async ctx => {
      const type =
        ctx.match[1] === 'inclusive' ? "Inklyuziv ta'lim sinfi" : "Uyda yakka tartibdagi ta'lim";
      await this.messageModel.updateOne(
        { chatId: ctx.chat.id.toString() },
        { educationType: type },
      );

      this.userSteps.set(ctx.chat.id, 'askSpecialization');
      await ctx.reply(
        "Yo'nalishingizni tanlang:",
        Markup.inlineKeyboard([
          [Markup.button.callback('Estrada-vokal yoki anʼanaviy ijrochilik', 'spec_estrada')],
          [Markup.button.callback('Tasviriy sanʼat', 'spec_art')],
        ]),
      );
    });

    // Specialization
    this.bot.action(/spec_(.+)/, async ctx => {
      let specialization = '';
      switch (ctx.match[1]) {
        case 'estrada':
          specialization = 'Estrada-vokal yoki anʼanaviy ijrochilik';
          break;
        case 'art':
          specialization = 'Tasviriy sanʼat';
          break;
        default:
          specialization = 'Nomaʼlum';
      }

      await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { specialization });

      this.userSteps.set(ctx.chat.id, 'askDisabilityGroup');
      await ctx.answerCbQuery();
      await ctx.reply(
        'Nogironlik guruhini tanlang:',
        Markup.inlineKeyboard([
          [Markup.button.callback('1-guruh', 'disability_1')],
          [Markup.button.callback('2-guruh', 'disability_2')],
          [Markup.button.callback('3-guruh', 'disability_3')],
          [Markup.button.callback('Bolalikdan nogiron', 'disability_child')],
          [Markup.button.callback('Belgilanmagan', 'disability_none')],
        ]),
      );
    });

    // Disability group selection
    this.bot.action(/disability_(.+)/, async ctx => {
      let disabilityGroup = '';
      switch (ctx.match[1]) {
        case '1':
          disabilityGroup = '1-guruh';
          break;
        case '2':
          disabilityGroup = '2-guruh';
          break;
        case '3':
          disabilityGroup = '3-guruh';
          break;
        case 'child':
          disabilityGroup = 'Bolalikdan nogiron';
          break;
        case 'none':
          disabilityGroup = 'Belgilanmagan';
          break;
        default:
          disabilityGroup = 'Nomaʼlum';
      }

      await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { disabilityGroup });

      this.userSteps.set(ctx.chat.id, 'askPhone');
      await ctx.answerCbQuery();
      await ctx.reply(
        'Aloqa uchun telefon raqamingizni ulashing:',
        Markup.keyboard([Markup.button.contactRequest('📞 Telefon raqamni ulashish')])
          .oneTime()
          .resize(),
      );
    });

    // Umumiy xato handling
    this.bot.use(async (ctx, next) => {
      if (ctx.callbackQuery) {
        const chatIdNum = ctx.chat.id;
        if (!this.userSteps.has(chatIdNum)) {
          await ctx.answerCbQuery("Iltimos, /start buyrug'ini bosing va qaytadan boshlang.");
          return;
        }
      }
      await next();
    });
  }

  setMessageModel(messageModel: Model<MessageDocument>) {
    this.messageModel = messageModel;
  }
}

const regions = [
  { id: 1, name: "Qoraqalpog'iston Respublikasi" },
  { id: 2, name: 'Andijon viloyati' },
  { id: 3, name: 'Buxoro viloyati' },
  { id: 4, name: 'Jizzax viloyati' },
  { id: 5, name: 'Qashqadaryo viloyati' },
  { id: 6, name: 'Navoiy viloyati' },
  { id: 7, name: 'Namangan viloyati' },
  { id: 8, name: 'Samarqand viloyati' },
  { id: 9, name: 'Surxondaryo viloyati' },
  { id: 10, name: 'Sirdaryo viloyati' },
  { id: 11, name: 'Toshkent viloyati' },
  { id: 12, name: "Farg'ona viloyati" },
  { id: 13, name: 'Xorazm viloyati' },
  { id: 14, name: 'Toshkent shahri' },
];

const districtsData: Record<string, string[]> = {
  1: [
    'Nukus shahar',
    'Amudaryo tumani',
    'Beruniy tumani',
    "Bo'zatov tumani",
    'Chimboy tumani',
    "Ellikqal'a tumani",
    'Kegeyli tumani',
    "Mo'ynoq tumani",
    'Nukus tumani',
    "Qonliko'l tumani",
    "Qo'ng'irot tumani",
    "Qorao'zak tumani",
    'Shumanay tumani',
    "Taxtako'pir tumani",
    'Taqiyatosh tumani',
    "To'rtko'l tumani",
    "Xo'jayli tumani",
  ],
  2: [
    'Andijon shahar',
    'Xonobod shahar',
    'Andijon tumani',
    'Asaka tumani',
    'Baliqchi tumani',
    'Buloqboshi tumani',
    "Bo'ston tumani",
    'Jalaquduq tumani',
    'Izboskan tumani',
    "Qo'rg'ontepa tumani",
    'Marhamat tumani',
    "Oltinko'l tumani",
    'Paxtaobod tumani',
    "Ulug'nor tumani",
    "Xo'jaobod tumani",
    'Shahrixon tumani',
  ],
  3: [
    'Buxoro shahar',
    'Kogon shahar',
    'Buxoro tumani',
    'Vobkent tumani',
    "G'ijduvon tumani",
    'Jondor tumani',
    'Kogon tumani',
    "Qorako'l tumani",
    'Qorovulbozor tumani',
    'Olot tumani',
    'Peshku tumani',
    'Romitan tumani',
    'Shofirkon tumani',
  ],
  4: [
    'Jizzax shahar',
    'Arnasoy tumani',
    'Baxmal tumani',
    "G'allaorol tumani",
    "Do'stlik tumani",
    'Zarbdor tumani',
    'Zafarobod tumani',
    'Zomin tumani',
    "Mirzacho'l tumani",
    'Paxtakor tumani',
    'Forish tumani',
    'Sharof Rashidov tumani',
    'Yangiobod tumani',
  ],
  5: [
    'Qarshi shahar',
    'Shahrisabz shahar',
    "G'uzor tumani",
    'Dehqonobod tumani',
    'Kasbi tumani',
    'Kitob tumani',
    'Koson tumani',
    "Ko'kdala tumani",
    'Qamashi tumani',
    'Qarshi tumani',
    'Mirishkor tumani',
    'Muborak tumani',
    'Nishon tumani',
    'Chiroqchi tumani',
    'Shahrisabz tumani',
    "Yakkabog' tumani",
  ],
  6: [
    'Navoiy shahar',
    'Zarafshon shahar',
    "G'ozg'on shahar",
    'Karmana tumani',
    'Konimex tumani',
    'Qiziltepa tumani',
    'Navbahor tumani',
    'Nurota tumani',
    'Tomdi tumani',
    'Uchquduq tumani',
    'Xatirchi tumani',
  ],
  7: [
    'Namangan shahar',
    'Davlatobod tumani',
    'Yangi Namangan tumani',
    'Kosonsoy tumani',
    'Mingbuloq tumani',
    'Namangan tumani',
    'Norin tumani',
    'Pop tumani',
    "To'raqo'rg'on tumani",
    'Uychi tumani',
    "Uchqo'rg'on tumani",
    'Chortoq tumani',
    'Chust tumani',
    "Yangiqo'rg'on tumani",
  ],
  8: [
    'Samarqand shahar',
    "Kattaqo'rg'on shahar",
    "Bulung'ur tumani",
    'Jomboy tumani',
    'Ishtixon tumani',
    "Kattaqo'rg'on tumani",
    "Qo'shrabot tumani",
    'Narpay tumani',
    'Nurobod tumani',
    'Oqdaryo tumani',
    'Payariq tumani',
    "Pastdarg'om tumani",
    'Paxtachi tumani',
    'Samarqand tumani',
    'Toyloq tumani',
    'Urgut tumani',
  ],
  9: [
    'Termiz shahar',
    'Angor tumani',
    'Bandixon tumani',
    'Boysun tumani',
    'Denov tumani',
    "Jarqo'rg'on tumani",
    'Qiziriq tumani',
    "Qumqo'rg'on tumani",
    'Muzrabot tumani',
    'Oltinsoy tumani',
    'Sariosiyo tumani',
    'Termiz tumani',
    'Uzun tumani',
    'Sherobod tumani',
    "Sho'rchi tumani",
  ],
  10: [
    'Guliston shahar',
    'Shirin shahar',
    'Yangiyer shahar',
    'Boyovut tumani',
    'Guliston tumani',
    'Mirzaobod tumani',
    'Oqoltin tumani',
    'Sayxunobod tumani',
    'Sardoba tumani',
    'Sirdaryo tumani',
    'Xovos tumani',
  ],
  11: [
    'Nurafshon shahar',
    'Olmaliq shahar',
    'Angren shahar',
    'Bekobod shahar',
    'Ohangaron shahar',
    'Chirchiq shahar',
    "Yangiyo'l shahar",
    'Bekobod tumani',
    "Bo'ka tumani",
    "Bo'stonliq tumani",
    'Zangiota tumani',
    'Qibray tumani',
    'Quyichirchiq tumani',
    "Oqqo'rg'on tumani",
    'Ohangaron tumani',
    'Parkent tumani',
    'Piskent tumani',
    'Toshkent tumani',
    "O'rtachirchiq tumani",
    'Chinoz tumani',
    'Yuqorichirchiq tumani',
    "Yangiyo'l tumani",
  ],
  12: [
    "Farg'ona shahar",
    "Marg'ilon shahar",
    'Quvasoy shahar',
    "Qo'qon shahar",
    "Bag'dod tumani",
    'Beshariq tumani',
    'Buvayda tumani',
    "Dang'ara tumani",
    'Yozyovon tumani',
    'Oltiariq tumani',
    "Qo'shtepa tumani",
    'Rishton tumani',
    "So'x tumani",
    'Toshloq tumani',
    "Uchko'prik tumani",
    "Farg'ona tumani",
    'Furqat tumani',
    "O'zbekiston tumani",
    'Quva tumani',
  ],
  13: [
    'Urganch shahar',
    'Xiva shahar',
    "Bog'ot tumani",
    'Gurlan tumani',
    "Qo'shko'pir tumani",
    "Tuproqqal'a tumani",
    'Urganch tumani',
    'Hazorasp tumani',
    'Xiva tumani',
    'Xonqa tumani',
    'Shovot tumani',
    'Yangiariq tumani',
    'Yangibozor tumani',
  ],
  14: [
    'Bektemir tumani',
    "Mirzo Ulug'bek tumani",
    'Mirobod tumani',
    'Olmazor tumani',
    'Sergeli tumani',
    'Uchtepa tumani',
    'Chilonzor tumani',
    'Shayxontohur tumani',
    'Yunusobod tumani',
    'Yakkasaroy tumani',
    'Yangi Hayot tumani',
    'Yashnobod tumani',
  ],
};
