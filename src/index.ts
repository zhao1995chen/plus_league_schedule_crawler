import superagent from 'superagent';
import cheerio from 'cheerio';
import fs from 'fs';
import * as csv from 'csv-writer';

interface Quote {
  subject: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDayEvent: boolean;
  location: string;
}

interface QuoteData {
  data: Array<Quote>
}

class Crawler {
  private url = `https://pleagueofficial.com/schedule-regular-season/2022-23`

  constructor() {
    this.init();
  }

  async init() {
    const html = await this.getHtml();
    const quoteList = this.getQuoteData(html);
    this.saveCsv(quoteList)
  }

  async getHtml() {
    const result = await superagent.get(this.url);
    return result.text
  }

  getQuoteData(html: string) {
    const $ = cheerio.load(html);
    const quotes = $('.is-future');
    let quoteList: Array<Quote> = [];
    quotes.map((index, element) => {
        let date = $(element).find('.match_row_datetime').children().first().text()
        date = `${(Number(date.slice(0,2)) > 9 ? '2022/' : '2023/')}${date}`
        const time = $(element).find('.match_row_datetime').children().last().text()
        const centerArea = $(element).find('.col-lg-4.col-8.align-self-center.px-0').find('.col-md-4.col-6.text-center.align-self-center').children()
        const gameCode = centerArea.first().text()
        const homeTeam = $(element).find('.text-md-left').find('.MOBILE_only.fs12').text()
        const awayTeam = $(element).find('.col-lg-3.col-2.align-self-center.text-right.px-0').find('.MOBILE_only.fs12').text()
        const subject = `${gameCode} ${homeTeam} vs. ${awayTeam}`
        const location = centerArea.first().next().text()

        quoteList.push({
          subject,
          startDate: date,
          startTime: time,
          endDate: date,
          endTime: `${(Number(time.slice(0,2)) + 2)}${time.slice(2)}`,
          allDayEvent: false,
          location
        });
    });
    return {
      data: quoteList
    };
  }

  async saveCsv(quoteList: QuoteData) {
    const csvWriter = csv.createObjectCsvWriter({
      path: './2223.csv',
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

    await csvWriter.writeRecords(quoteList.data)
  }
}

new Crawler();