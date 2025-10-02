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
exports.BotService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const message_entity_1 = require("./message.entity");
const telegraf_1 = require("telegraf");
const BOT_TOKEN = '8082153813:AAEOWJvSMYv-kqYrHdw_7Jsg2NSWhX3c7Ns';
let BotService = class BotService {
    constructor(messageModel) {
        this.messageModel = messageModel;
        this.userSteps = new Map();
        this.bot = new telegraf_1.Telegraf(BOT_TOKEN);
    }
    async onModuleInit() {
        this.startBot();
        await this.bot.launch();
        console.log('🤖 Bot ishga tushdi...');
    }
    startBot() {
        this.bot.start(async (ctx) => {
            const chatId = ctx.chat.id;
            if (this.userSteps.has(chatId)) {
                await ctx.reply('Sizda allaqachon ro‘yxatdan o‘tish jarayoni boshlangan. Iltimos, uni tugating yoki /reset buyrug‘ini yuboring.', telegraf_1.Markup.inlineKeyboard([[telegraf_1.Markup.button.callback('🔄 Jarayonni tozalash', 'reset_steps')]]));
                return;
            }
            this.userSteps.set(chatId, 'askName');
            await ctx.reply('Assalomu alaykum!\n\nIsm familiyangizni lotin alifbosida yozing:');
        });
        this.bot.command('reset', async (ctx) => {
            const chatId = ctx.chat.id;
            this.userSteps.delete(chatId);
            await ctx.reply('✅ Jarayon tozalandi. Endi /start buyrug‘ini bosing.');
        });
        this.bot.action('reset_steps', async (ctx) => {
            const chatId = ctx.chat.id;
            this.userSteps.delete(chatId);
            await ctx.answerCbQuery('Jarayon tozalandi!');
            await ctx.reply('✅ Jarayon tozalandi. Endi ro‘yxatdan o‘tishni boshlang.');
        });
        this.bot.on('text', async (ctx) => {
            const step = this.userSteps.get(ctx.chat.id);
            const chatId = ctx.chat.id.toString();
            if (step === 'askName') {
                await this.messageModel.findOneAndUpdate({ chatId }, { chatId, firstName: ctx.message.text }, { upsert: true });
                this.userSteps.set(ctx.chat.id, 'askRegion');
                return ctx.reply('Hududingizni tanlang:', telegraf_1.Markup.inlineKeyboard(regions.map(r => [telegraf_1.Markup.button.callback(r.name, `region_${r.id}`)])));
            }
            if (step === 'askBirthDate') {
                const birthDateStr = ctx.message.text.trim();
                const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
                if (!dateRegex.test(birthDateStr)) {
                    return ctx.reply("Iltimos, tug'ilgan kuningizni YYYY-MM-DD formatida kiriting (masalan: 2010-05-15):");
                }
                const birthDate = new Date(birthDateStr);
                if (isNaN(birthDate.getTime()) || birthDate > new Date()) {
                    return ctx.reply("Noto'g'ri sana. Iltimos, to'g'ri sana kiriting (kelajak sanasi bo'lmasligi kerak):");
                }
                await this.messageModel.updateOne({ chatId }, { birthDate });
                this.userSteps.set(ctx.chat.id, 'askPhone');
                return ctx.reply('Aloqa uchun telefon raqamingizni ulashing:', telegraf_1.Markup.keyboard([telegraf_1.Markup.button.contactRequest('📞 Telefon raqamni ulashish')])
                    .oneTime()
                    .resize());
            }
            if (step === 'askSchool' && /^\d+$/.test(ctx.message.text)) {
                await this.messageModel.updateOne({ chatId }, { schoolNumber: Number(ctx.message.text) });
                this.userSteps.set(ctx.chat.id, 'askGrade');
                return ctx.reply('Sinfingizni tanlang:', telegraf_1.Markup.inlineKeyboard(Array.from({ length: 8 }, (_, i) => [
                    telegraf_1.Markup.button.callback(`${i + 3}-sinf`, `grade_${i + 3}`),
                ])));
            }
            if (step === 'askSchool' && !/^\d+$/.test(ctx.message.text)) {
                return ctx.reply('Iltimos, maktab raqamini faqat raqam sifatida kiriting (masalan: 123):');
            }
        });
        this.bot.on('contact', async (ctx) => {
            const step = this.userSteps.get(ctx.chat.id);
            if (step !== 'askPhone')
                return;
            const phoneNumber = ctx.message.contact.phone_number;
            const chatId = ctx.chat.id.toString();
            await this.messageModel.updateOne({ chatId }, { phoneNumber });
            this.userSteps.delete(ctx.chat.id);
            await ctx.reply('✅ Ma’lumotlaringiz to’liq saqlandi. Rahmat!\n\nTelefon raqamingiz: ' + phoneNumber);
            await ctx.reply('Jarayon tugadi.', telegraf_1.Markup.removeKeyboard());
        });
        this.bot.action(/region_(\d+)/, async (ctx) => {
            const regionId = ctx.match[1];
            const region = regions.find(r => r.id == +regionId);
            if (!region) {
                return ctx.reply('Hudud topilmadi. /start buyrug‘ini qayta bosing.');
            }
            await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { region: region.name });
            this.userSteps.set(ctx.chat.id, `askDistrict_${regionId}`);
            const districts = districtsData[regionId] || [];
            if (districts.length === 0) {
                await ctx.reply('Bu hudud uchun tumanlar topilmadi. /start buyrug‘ini qayta bosing.');
                return;
            }
            await ctx.reply(`${region.name}dan tumaningizni tanlang:`, telegraf_1.Markup.inlineKeyboard(districts.map(d => [telegraf_1.Markup.button.callback(d, `district_${encodeURIComponent(d)}`)])));
        });
        this.bot.action(/district_(.+)/, async (ctx) => {
            const district = decodeURIComponent(ctx.match[1]);
            await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { district });
            this.userSteps.set(ctx.chat.id, 'askSchool');
            await ctx.reply('Maktab raqamini kiriting (faqat raqam, masalan: 123):');
        });
        this.bot.action(/grade_(\d+)/, async (ctx) => {
            const grade = ctx.match[1];
            await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { grade: `${grade}-sinf` });
            this.userSteps.set(ctx.chat.id, 'askEducationType');
            await ctx.reply('Ta’lim turini tanlang:', telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('1. Inklyuziv ta’lim sinfi', 'edu_inclusive')],
                [telegraf_1.Markup.button.callback('2. Uyda yakka tartibdagi ta’lim', 'edu_home')],
            ]));
        });
        this.bot.action(/edu_(.+)/, async (ctx) => {
            const type = ctx.match[1] === 'inclusive' ? 'Inklyuziv ta’lim sinfi' : 'Uyda yakka tartibdagi ta’lim';
            await this.messageModel.updateOne({ chatId: ctx.chat.id.toString() }, { educationType: type });
            this.userSteps.set(ctx.chat.id, 'askSpecialization');
            await ctx.reply('Yo‘nalishingizni tanlang:', telegraf_1.Markup.inlineKeyboard([
                [telegraf_1.Markup.button.callback('estrada-vokal yoki anʼanaviy ijrochilik', 'spec_estrada')],
                [telegraf_1.Markup.button.callback('Tasviriy sanʼat', 'spec_art')],
            ]));
        });
        this.bot.action(/spec_(.+)/, async (ctx) => {
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
            await ctx.reply("Tug'ilgan kuningizni kiriting (YYYY-MM-DD formatida, masalan: 2010-05-15):");
        });
        this.bot.use(async (ctx, next) => {
            if (ctx.callbackQuery && !this.userSteps.has(ctx.chat.id)) {
                await ctx.answerCbQuery('Iltimos, /start buyrug‘ini bosing va qaytadan boshlang.');
                return;
            }
            await next();
        });
    }
};
BotService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(message_entity_1.Message.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], BotService);
exports.BotService = BotService;
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
const districtsData = {
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
//# sourceMappingURL=bot.service.js.map