import superagent from 'superagent';
import cheerio from 'cheerio';
import * as csv from 'csv-writer';
import * as readline from 'readline';

interface Quote {
  subject: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDayEvent: boolean;
  location: string;
}

interface Season {
  start: string;
  end: string;
}

class Crawler {
  private url: string = `https://pleagueofficial.com/schedule-regular-season`;
  private $: any;
  private html: string = '';
  private year: Season = { start: '', end: ''};
  private quoteList: Array<Quote> = [];

  constructor() {
    this.init();
  }

  async init() {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question('Which season do you want? (If you want get 2022-2023 season, please enter 2223)', async (season: string) => {
      this.year.start = season.slice(0, 2);
      this.year.end = season.slice(2);
      this.url = this.url.concat(`/20${this.year.start}-${this.year.end}`);
      rl.close();
      await this.getData();
      this.saveCsv();
    })
  }
  
  async getHtml() {
    const result = await superagent.get(this.url);
    return result.text;
  }

  async getData() {
    this.html = await this.getHtml();
    this.$ = cheerio.load(this.html);
    this.getQuoteData();
  }

  getQuoteData() {
    this.getMapList(this.$('.before-today'))
    this.getMapList(this.$('.is-future'))
  }

  getMapList(quotes: Array<string>) {
    quotes.map((index, element) => {
      let date = this.$(element).find('.match_row_datetime').children().first().text()
      date = `${(Number(date.slice(0, 2)) > 9 ? `20${this.year.start}/` : `20${this.year.end}/`)}${date}`
      const time = this.$(element).find('.match_row_datetime').children().last().text()
      const centerArea = this.$(element).find('.col-lg-4.col-8.align-self-center.px-0').find('.col-md-4.col-6.text-center.align-self-center').children()
      const gameCode = centerArea.first().text()
      const homeTeam = this.$(element).find('.text-md-left').find('.MOBILE_only.fs12').text()
      const awayTeam = this.$(element).find('.col-lg-3.col-2.align-self-center.text-right.px-0').find('.MOBILE_only.fs12').text()
      const subject = `${gameCode} ${homeTeam} vs. ${awayTeam}`
      const location = centerArea.first().next().text()

      this.quoteList.push({
        subject,
        startDate: date,
        startTime: time,
        endDate: date,
        endTime: `${(Number(time.slice(0,2)) + 2)}${time.slice(2)}`,
        allDayEvent: false,
        location
      });
    });
  }

  async saveCsv() {
    const csvWriter = csv.createObjectCsvWriter({
      path: `./output/${this.year.start}${this.year.end}.csv`,
      header: [
        { id: 'subject', title: 'Subject' },
        { id: 'startDate', title: 'Start Date' },
        { id: 'startTime', title: 'Start Time' },
        { id: 'endDate', title: 'End Date' },
        { id: 'endTime', title: 'End Time' },
        { id: 'allDayEvent', title: 'All Day Event'},
        { id: 'location', title: 'Location' }
      ]
    })
    await csvWriter.writeRecords(this.quoteList).then(() => {
      console.log(`Output Complete! Please check your ${this.year.start}${this.year.end}.csv file in output folder.`)
    })
  }
}

new Crawler();