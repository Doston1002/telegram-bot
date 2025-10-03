import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Message, MessageDocument } from './message.entity';
import { Telegraf, Markup } from 'telegraf';

const BOT_TOKEN = process.env.BOT_TOKEN || '8082153813:AAEOWJvSMYv-kqYrHdw_7Jsg2NSWhX3c7Ns';

@Injectable()
export class BotService implements OnModuleInit {
  private bot: Telegraf;
  private userSteps = new Map<number, string>();

  constructor(@InjectModel(Message.name) private messageModel: Model<MessageDocument>) {
    this.bot = new Telegraf(BOT_TOKEN);
  }

  async onModuleInit() {
    this.startBot();
    await this.bot.launch();
    console.log('🤖 Bot ishga tushdi...');
  }

  startBot() {
    // /start
    this.bot.start(async ctx => {
      const chatIdNum = ctx.chat.id;
      if (this.userSteps.has(chatIdNum)) {
        await ctx.reply(
          'Sizda allaqachon ro‘yxatdan o‘tish jarayoni boshlangan. Iltimos, uni tugating yoki /reset buyrug‘ini yuboring.',
          Markup.inlineKeyboard([[Markup.button.callback('🔄 Jarayonni tozalash', 'reset_steps')]]),
        );
        return;
      }

      this.userSteps.set(chatIdNum, 'askName');
      await ctx.reply(
        'Assalomu alaykum!\n\nIsm va familiyangizni lotin alifbosida, pasport yoki tug‘ilganlik guvohnomasiga mos ravishda yozing:',
      );
    });

    // /reset
    this.bot.command('reset', async ctx => {
      const chatIdNum = ctx.chat.id;
      this.userSteps.delete(chatIdNum);
      await ctx.reply('✅ Jarayon tozalandi. Endi /start buyrug‘ini bosing.');
    });

    this.bot.action('reset_steps', async ctx => {
      const chatIdNum = ctx.chat.id;
      this.userSteps.delete(chatIdNum);
      await ctx.answerCbQuery('Jarayon tozalandi!');
      await ctx.reply('✅ Jarayon tozalandi. Endi ro‘yxatdan o‘tishni boshlang.');
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

        this.userSteps.set(chatIdNum, 'askPhone');
        return ctx.reply(
          'Aloqa uchun telefon raqamingizni ulashing:',
          Markup.keyboard([Markup.button.contactRequest('📞 Telefon raqamni ulashish')])
            .oneTime()
            .resize(),
        );
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
      await ctx.reply('✅ Telefon raqamingiz saqlandi. Ro‘yxatdan o‘tish jarayoni yakunlandi!');
      await ctx.reply('Jarayon tugadi.', Markup.removeKeyboard());
    });

    // Gender tanlash
    this.bot.action(/gender_(.+)/, async ctx => {
      const gender = ctx.match[1] === 'male' ? 'Erkak' : 'Ayol';
      await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { gender });

      this.userSteps.set(ctx.chat.id, 'askRegion');
      await ctx.reply(
        'Hududingizni tanlang:',
        Markup.inlineKeyboard(regions.map(r => [Markup.button.callback(r.name, `region_${r.id}`)])),
      );
    });

    // Region tanlash
    this.bot.action(/region_(\d+)/, async ctx => {
      const regionId = ctx.match[1];
      const region = regions.find(r => r.id == +regionId);

      if (!region) {
        return ctx.reply('Hudud topilmadi. /start buyrug‘ini qayta bosing.');
      }

      await this.messageModel.updateOne(
        { chatId: ctx.chat.id.toString() },
        { region: region.name },
      );

      this.userSteps.set(ctx.chat.id, `askDistrict_${regionId}`);

      const districts = districtsData[regionId] || [];
      if (districts.length === 0) {
        await ctx.reply('Bu hudud uchun tumanlar topilmadi. /start buyrug‘ini qayta bosing.');
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
        'Ta’lim turini tanlang:',
        Markup.inlineKeyboard([
          [Markup.button.callback('Inklyuziv ta’lim sinfi', 'edu_inclusive')],
          [Markup.button.callback('Uyda yakka tartibdagi ta’lim', 'edu_home')],
        ]),
      );
    });

    // Education type
    this.bot.action(/edu_(.+)/, async ctx => {
      const type =
        ctx.match[1] === 'inclusive' ? 'Inklyuziv ta’lim sinfi' : 'Uyda yakka tartibdagi ta’lim';
      await this.messageModel.updateOne(
        { chatId: ctx.chat.id.toString() },
        { educationType: type },
      );

      this.userSteps.set(ctx.chat.id, 'askSpecialization');
      await ctx.reply(
        'Yo‘nalishingizni tanlang:',
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

      this.userSteps.set(ctx.chat.id, 'askBirthDate');
      await ctx.answerCbQuery();
      await ctx.reply("Tug'ilgan kuningizni kiriting (DD.MM.YYYY formatida, masalan: 02.10.1999):");
    });

    // Umumiy xato handling
    this.bot.use(async (ctx, next) => {
      if (ctx.callbackQuery) {
        const chatIdNum = ctx.chat.id;
        if (!this.userSteps.has(chatIdNum)) {
          await ctx.answerCbQuery('Iltimos, /start buyrug‘ini bosing va qaytadan boshlang.');
          return;
        }
      }
      await next();
    });
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
    'Bo‘zatov tumani',
    'Chimboy tumani',
    'Ellikqal’a tumani',
    'Kegeyli tumani',
    'Mo‘ynoq tumani',
    'Nukus tumani',
    'Qonliko‘l tumani',
    'Qo‘ng‘irot tumani',
    'Qorao‘zak tumani',
    'Shumanay tumani',
    'Taxtako‘pir tumani',
    'Taqiyatosh tumani',
    'To‘rtko‘l tumani',
    'Xo‘jayli tumani',
  ],
  2: [
    'Andijon shahar',
    'Xonobod shahar',
    'Andijon tumani',
    'Asaka tumani',
    'Baliqchi tumani',
    'Buloqboshi tumani',
    'Bo‘ston tumani',
    'Jalaquduq tumani',
    'Izboskan tumani',
    'Qo‘rg‘ontepa tumani',
    'Marhamat tumani',
    'Oltinko‘l tumani',
    'Paxtaobod tumani',
    'Ulug‘nor tumani',
    'Xo‘jaobod tumani',
    'Shahrixon tumani',
  ],
  3: [
    'Buxoro shahar',
    'Kogon shahar',
    'Buxoro tumani',
    'Vobkent tumani',
    'G‘ijduvon tumani',
    'Jondor tumani',
    'Kogon tumani',
    'Qorako‘l tumani',
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
    'G‘allaorol tumani',
    'Do‘stlik tumani',
    'Zarbdor tumani',
    'Zafarobod tumani',
    'Zomin tumani',
    'Mirzacho‘l tumani',
    'Paxtakor tumani',
    'Forish tumani',
    'Sharof Rashidov tumani',
    'Yangiobod tumani',
  ],
  5: [
    'Qarshi shahar',
    'Shahrisabz shahar',
    'G‘uzor tumani',
    'Dehqonobod tumani',
    'Kasbi tumani',
    'Kitob tumani',
    'Koson tumani',
    'Ko‘kdala tumani',
    'Qamashi tumani',
    'Qarshi tumani',
    'Mirishkor tumani',
    'Muborak tumani',
    'Nishon tumani',
    'Chiroqchi tumani',
    'Shahrisabz tumani',
    'Yakkabog‘ tumani',
  ],
  6: [
    'Navoiy shahar',
    'Zarafshon shahar',
    'G‘ozg‘on shahar',
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
    'To‘raqo‘rg‘on tumani',
    'Uychi tumani',
    'Uchqo‘rg‘on tumani',
    'Chortoq tumani',
    'Chust tumani',
    'Yangiqo‘rg‘on tumani',
  ],
  8: [
    'Samarqand shahar',
    'Kattaqo‘rg‘on shahar',
    'Bulung‘ur tumani',
    'Jomboy tumani',
    'Ishtixon tumani',
    'Kattaqo‘rg‘on tumani',
    'Qo‘shrabot tumani',
    'Narpay tumani',
    'Nurobod tumani',
    'Oqdaryo tumani',
    'Payariq tumani',
    'Pastdarg‘om tumani',
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
    'Jarqo‘rg‘on tumani',
    'Qiziriq tumani',
    'Qumqo‘rg‘on tumani',
    'Muzrabot tumani',
    'Oltinsoy tumani',
    'Sariosiyo tumani',
    'Termiz tumani',
    'Uzun tumani',
    'Sherobod tumani',
    'Sho‘rchi tumani',
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
    'Yangiyo‘l shahar',
    'Bekobod tumani',
    'Bo‘ka tumani',
    'Bo‘stonliq tumani',
    'Zangiota tumani',
    'Qibray tumani',
    'Quyichirchiq tumani',
    'Oqqo‘rg‘on tumani',
    'Ohangaron tumani',
    'Parkent tumani',
    'Piskent tumani',
    'Toshkent tumani',
    'O‘rtachirchiq tumani',
    'Chinoz tumani',
    'Yuqorichirchiq tumani',
    'Yangiyo‘l tumani',
  ],
  12: [
    'Farg‘ona shahar',
    'Marg‘ilon shahar',
    'Quvasoy shahar',
    'Qo‘qon shahar',
    'Bag‘dod tumani',
    'Beshariq tumani',
    'Buvayda tumani',
    'Dang‘ara tumani',
    'Yozyovon tumani',
    'Oltiariq tumani',
    'Qo‘shtepa tumani',
    'Rishton tumani',
    'So‘x tumani',
    'Toshloq tumani',
    'Uchko‘prik tumani',
    'Farg‘ona tumani',
    'Furqat tumani',
    'O‘zbekiston tumani',
    'Quva tumani',
  ],
  13: [
    'Urganch shahar',
    'Xiva shahar',
    'Bog‘ot tumani',
    'Gurlan tumani',
    'Qo‘shko‘pir tumani',
    'Tuproqqal’a tumani',
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
    'Mirzo Ulug‘bek tumani',
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
