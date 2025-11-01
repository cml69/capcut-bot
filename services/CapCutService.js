/**
 * CapCut Service for handling account creation workflow
 */

import { CONFIG } from '../config/config.js';
import { BrowserService } from './BrowserService.js';
import { EmailService } from './EmailService.js';
import { FileService } from './FileService.js';
import { generateRandomBirthday, sleep, formatAccountData } from '../utils/helpers.js';
import chalk from 'chalk';
import ora from 'ora';

export class CapCutService {
  /**
   * Fill in email on signup page
   * @param {Page} page - Puppeteer page instance
   * @param {string} email - Email address
   * @returns {Promise<void>}
   */
  static async fillEmail(page, email) {
    const spinner = ora(chalk.blue('Mengisi email...')).start();
    
    try {
      const { EMAIL_INPUT, CONTINUE_BUTTON } = CONFIG.CAPCUT.SELECTORS;
      
      await BrowserService.typeIntoField(page, EMAIL_INPUT, email);
      await BrowserService.clickElement(page, CONTINUE_BUTTON);
      
      spinner.succeed(chalk.green('Berhasil mengisi email!'));
    } catch (error) {
      spinner.fail(chalk.red('Gagal mengisi email!'));
      throw error;
    }
  }

  /**
   * Fill in password on signup page
   * @param {Page} page - Puppeteer page instance
   * @param {string} password - Password
   * @returns {Promise<void>}
   */
  static async fillPassword(page, password) {
    try {
      const { PASSWORD_INPUT, SIGNUP_BUTTON } = CONFIG.CAPCUT.SELECTORS;
      
      await BrowserService.typeIntoField(page, PASSWORD_INPUT, password);
      await BrowserService.clickElement(page, SIGNUP_BUTTON);
    } catch (error) {
      console.error(chalk.red('Gagal mengisi password!'));
      throw error;
    }
  }

  /**
   * Fill in birthday information
   * @param {Page} page - Puppeteer page instance
   * @returns {Promise<Object>} Birthday data
   */
  static async fillBirthday(page) {
    try {
      const {
        BIRTHDAY_INPUT,
        BIRTHDAY_MONTH_SELECTOR,
        BIRTHDAY_DAY_SELECTOR,
        BIRTHDAY_NEXT_BUTTON
      } = CONFIG.CAPCUT.SELECTORS;

      // Wait for birthday input to appear
      await page.waitForSelector(BIRTHDAY_INPUT, { 
        visible: true, 
        timeout: CONFIG.TIMING.SELECTOR_TIMEOUT 
      });

      // Generate random birthday
      const birthday = generateRandomBirthday();

      // Fill year
      await page.type(BIRTHDAY_INPUT, String(birthday.year), { 
        delay: CONFIG.TIMING.TYPING_DELAY 
      });

      // Select month
      await page.click(BIRTHDAY_MONTH_SELECTOR);
      await sleep(CONFIG.TIMING.PAGE_WAIT);
      await BrowserService.selectDropdownItem(page, birthday.month);

      // Select day
      await page.click(BIRTHDAY_DAY_SELECTOR);
      await sleep(CONFIG.TIMING.PAGE_WAIT);
      await BrowserService.selectDropdownItem(page, birthday.day);

      console.log(chalk.green(`📆 Tanggal lahir yang dipilih: ${birthday.day} ${birthday.month} ${birthday.year}`));

      // Click next button
      await BrowserService.clickElement(page, BIRTHDAY_NEXT_BUTTON);

      return birthday;
    } catch (error) {
      console.error(chalk.red('Gagal mengisi tanggal lahir!'));
      throw error;
    }
  }

  /**
   * Enter OTP code
   * @param {Page} page - Puppeteer page instance
   * @param {string} otpCode - OTP code
   * @returns {Promise<void>}
   */
  static async enterOTP(page, otpCode) {
    try {
      await BrowserService.typeIntoField(
        page, 
        CONFIG.CAPCUT.SELECTORS.OTP_INPUT, 
        otpCode
      );
      console.log(chalk.green('✅ Kode OTP dimasukkan dan verifikasi berhasil!'));
    } catch (error) {
      console.error(chalk.red('Gagal memasukkan kode OTP!'));
      throw error;
    }
  }

  /**
   * Create a CapCut account
   * @param {number} accountNumber - Account number being created
   * @param {number} totalAccounts - Total accounts to create
   * @returns {Promise<Object|null>} Account data or null if failed
   */
  static async createAccount(accountNumber, totalAccounts) {
    let browser = null;

    try {
      console.log(chalk.magenta(`\n🚀 Memproses akun ${accountNumber} dari ${totalAccounts}`));

      // Initialize browser
      const browserData = await BrowserService.initializeBrowser();
      browser = browserData.browser;
      const page = browserData.page;

      // Get email
      const email = await EmailService.getNewEmail();

      // Get password
      const password = FileService.getPassword();

      // Navigate to signup page
      const signupSpinner = ora(chalk.blue('Membuka halaman signup CapCut...')).start();
      await BrowserService.navigateToURL(
        page,
        CONFIG.CAPCUT.SIGNUP_URL,
        'Gagal membuka halaman signup!'
      );
      signupSpinner.succeed(chalk.green('Halaman signup dibuka!'));

      // Fill email
      await this.fillEmail(page, email);

      // Fill password
      await this.fillPassword(page, password);

      // Fill birthday
      const birthday = await this.fillBirthday(page);

      // Wait for and enter OTP
      const otpCode = await EmailService.waitForOTP(email);
      await this.enterOTP(page, otpCode);

      // Save account data
      const accountData = formatAccountData(accountNumber, email, password, birthday);
      FileService.saveAccount(accountData);

      // Wait before closing
      await sleep(CONFIG.TIMING.FINAL_WAIT);
      await BrowserService.closeBrowser(browser);

      return { email, password, birthDate: `${birthday.day} ${birthday.month} ${birthday.year}` };

    } catch (error) {
      console.error(chalk.red(`❌ Gagal membuat akun #${accountNumber}:`), error.message);
      await BrowserService.closeBrowser(browser);
      return null;
    }
  }
}