"use strict";

import { Guid } from "./utils/guid.js";
import { Encryption } from "./utils/encryption.js";
import { Template } from "./model/template.js";
import { Payment } from "./model/payment.js";
import { MoneyStorage } from "./storage.js";
import { Strings, ITranslate } from "./strings.js";
import { Recurrence } from "./model/recurrence.js";

const exportable = crypto !== undefined && crypto.subtle !== undefined;
const internal = Symbol("internal");
const save = Symbol("save");

class PaymentEngine extends ITranslate {
    /**
     * Bind a payment engine to the current window.
     */
    constructor() {
        super();

        this[internal] = {
            /**
             * @type {MoneyStorage}
             */
            storage: {},
            expected: 0,
            paid: 0,
            remaining: 0,
            /**
             * @type {function[]}
             */
            onchange: [],
            trigger: event => {
                switch (event) {
                    case 'change':
                        this[internal].onchange.forEach(h => h({ caller: this }));
                        return;
                }
            }
        };

        this[save] = async () => {
            this[internal].expected = 0;
            this[internal].paid = 0;
            this[internal].remaining = 0;

            await Promise.all([this.getPayments(), this.getTemplates()]).then(values => {
                let payments = values[0];
                let templates = values[1];

                templates.filter(t => t.amount > 0).forEach(t => {
                    this[internal].expected += t.amount;
                    if (t.partial) {
                        let paid = false;
                        let total = 0;

                        payments.filter(p => p.templateId.equalTo(t.id)).forEach(payment => {
                            total += payment.amount;
                            paid |= payment.closePartial;
                        });

                        if (!paid) {
                            this[internal].remaining += Math.max(0, t.amount - total);
                        }
                    } else if (payments.find(p => p.templateId.equalTo(t.id)) === undefined) {
                        this[internal].remaining += t.amount;
                    }
                });

                payments.filter(p => p.amount > 0).forEach(p => {
                    this[internal].paid += p.amount;
                });


                this[internal].trigger('change');
            });

            await window.financeStorage.save(JSON.parse(JSON.stringify(this[internal].storage)));
        }

        this.ready = window.financeStorage.load().then(data => {
            this[internal].storage = new MoneyStorage(data);
            return this[save]();
        });
    }

    /**
     * Selected month.
     *
     * @returns {Date}
     */
    get month() {
        return this[internal].storage.date;
    }

    set month(value) {
        if (value instanceof Date) {
            if (value != this[internal].storage.date) {
                this[internal].storage.date = value;
                this[save]();
            }
        } else {
            throw new TypeError("value must be a date.");
        }
    }

    /**
     * Selected benefactor.
     *
     * @returns {?String}
     */
    get benefactor() {
        return this[internal].storage.benefactor;
    }

    set benefactor(value) {
        this[internal].storage.benefactor = value;
        this[save]();
    }


    get expected() {
        return this[internal].expected;
    }

    get paid() {
        return this[internal].paid;
    }

    get remaining() {
        return this[internal].remaining;
    }

    /**
     * Get payments for provided month(s) or currently selected if not provided..
     *
     * @param {?Date} start
     * @param {?Date} end
     * @return {Promise<Payment[]>}
     */
    async getPayments(start = null, end = null) {
        if (start === null) {
            start = new Date(this.month);
        }

        if (!(start instanceof Date)) {
            throw new TypeError("start is not a date.");
        }

        if (end === null) {
            end = new Date(start);
        }

        if (!(end instanceof Date)) {
            throw new TypeError("end is not a date.");
        }

        let months = [], current = start;
        while (current <= end) {
            months.push(this[internal].storage.getPaymentsByMonth(current))
            current = new Date(current.setMonth(current.getMonth() + 1));
        }

        return Promise.all(months).then(result => {
            return [].concat(... result);
        });
    }

    /**
     * Get templates for currently selected month.
     *
     * @return {Promise<Template[]>}
     */
    async getTemplates() {
        return this[internal].storage.getTemplatesByMonth(this.month).then(result => {
            return result.sort((t1, t2) => {
                if (t1.name > t2.name)
                    return 1;

                if (t1.name < t2.name)
                    return -1;

                return 0;
            });
        });
    }

    /**
     * Get template by Id.
     *
     * @param {guid} id
     * @returns {Promise<Template>}
     */
    async getTemplate(id) {
        if (typeof id === "string") {
            id = new Guid(id);
        }

        if (id instanceof Guid) {
            return this[internal].storage.getTemplate(id);
        } else {
            throw new TypeError("id must be a string or Guid");
        }
    }

    /**
     * Attempts to pay the provided template in the current month.
     * Updates a payment if provided.
     *
     * @param {(Payment|Guid|string)} id Template ID
     * @param {Number} amount
     * @param {boolean} [final=false]
     */
    async addPayment(id, amount, final = false) {
        if (id instanceof Payment) {
            payment = id;
        } else {
            if (typeof id === "string")
                id = new Guid(id);

            var template = await this.getTemplate(id);
            if (template === undefined) {
                throw new RangeError("template does not exist in the current month");
            }

            var payments = await this.getPayments();
            payments = payments.filter(p => p.templateId.equalTo(id));
            if (payments.find(p => p.closePartial) || (template.partial === false && payments.length > 0)) {
                throw new RangeError("This template has already been paid");
            }

            var payment = new Payment(template, this.month, amount);
            if (template.partial && final) {
                payment.closePartial = true;
            }
        }

        this[internal].storage.updatePayment(payment);
        this[save]();
    }

    /**
     * Add a new payment unrelated to any schedule.
     *
     * @param {String} name
     * @param {Number} amount
     * @param {Date} date
     */
    addUnexpected(name, amount) {
        var payment = new Payment(name, this.month, amount);

        this[internal].storage.updatePayment(payment);
        this[save]();
    }

    /**
     * Add or update the provided template.
     *
     * @param {Template} template
     */
    addOrUpdateTemplate(template){
        this[internal].storage.updateTemplate(template, this.month);
        this[save]();
    }

    /**
     * Remove a template and all it's associated payments.
     *
     * @param {Template} template
     */
    deleteTemplate(template) {
        this[internal].storage.removeTemplate(template);
        this[save]();
    }

    /**
     * Undo a payment in the current month.
     *
     * @param {(Guid | String | Payment)} id
     */
    async undoPayment(id) {
        if (typeof id === "string") {
            id = new Guid(id);
        }

        if (id instanceof Payment) {
            id = id.id
        }

        var payment = await this.getPayments().then(payments => payments.find(p => p.id.equalTo(id)));
        if (payment === undefined) {
            throw new Error("payment not found");
        }

        this[internal].storage.removePayment(payment);
        this[save]();
    }

    /**
     * Format the provided number based on the current Storage set locale and currency.
     *
     * @param {Number} amount
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat(this[internal].storage.locale, {
            style: 'currency',
            currency: this[internal].storage.currency
        }).format(amount);
    }

    /**
     * Add an event listener to the object.
     *
     * @param {String} event
     * @param {Function} handler
     */
    addEventListener(event, handler) {
        if (typeof handler !== "function") {
            throw new TypeError("handler is not a function");
        }

        switch (event.toLowerCase()) {
            case 'change':
                this[internal].onchange.push(handler);
                return;
        }
    }

    /**
     * Attempt to translate the provided text into the users language.
     *
     * @param {String} string
     * @param {...String} placeholders
     */
    translate(string, ...placeholders) {
        let value = Strings.tryTranslate(this.locale, string);

        return super.translate(value, ...placeholders);
    }

    /**
     * @returns {String}
     */
    get locale() {
        return this[internal].storage.locale;
    }

    set locale(value) {
        if (this.locales.find(l => l.locale === value) === undefined){
            throw new RangeError("locale does not exist");
        }

        if (this[internal].storage.locale !== value) {
            this[internal].storage.locale = value;
            this[save]();
        }
    }

    /**
     * @returns {String}
     */
    get currency() {
        return this[internal].storage.currency;
    }

    set currency(value) {
        if (this.currencies.find(c => c.code === value) === undefined){
            throw new RangeError("currency does not exist");
        }

        if (this[internal].storage.currency !== value) {
            this[internal].storage.currency = value;
            this[save]();
        }
    }

    /**
     * @return {String}
     */
    get currencySymbol() {
        return new Intl.NumberFormat(this[internal].storage.locale, {
            style: 'currency',
            currency: this[internal].storage.currency
        }).formatToParts().find(p => p.type === "currency").value;
    }

    /**
     * @returns {Number}
     */
    get excessive() {
        return this[internal].storage.excessive;
    }

    set excessive(value) {
        if(isNaN(value)) {
            throw new TypeError("value is not a number");
        }

        if (value < 0) {
            throw new RangeError("value is less than zero");
        }

        if (this[internal].storage.excessive !== value) {
            this[internal].storage.excessive = value;
            this[save]();
        }
    }

    get defaultCurrency(){
        return Strings.currencies.find(c => c.code === this.translate("__CURRENCY__"));
    }

    get currencies() {
        return Strings.currencies;
    }

    get locales() {
        return Strings.locales;
    }

    get recurrences() {
        return [
            { id: Recurrence.never, name: this.translate("Never") },
            { id: Recurrence.monthly, name: this.translate("Monthly") },
            { id: Recurrence.bimonthly, name: this.translate("Bi-Monthly") },
            { id: Recurrence.quarterly, name: this.translate("Quarterly") },
            { id: Recurrence.biannually, name: this.translate("Bi-Annually") },
            { id: Recurrence.annually, name: this.translate("Annually") },
        ];
    }

    /**
     * Encrypts the current storage set with the provided password, and returns the result.
     *
     * @param {String} password must be at least 6 characters long.
     * @returns {Promise<string>}
     * @throws {Error} if encryption isn't supported.
     * @throws {TypeError} if the password isn't a string or is too weak.
     */
    async export(password) {
        if (!exportable)
            throw new Error(this.translate("Your browser doesn't support encryption"));

        if (typeof password !== "string" || password.length < 6)
            throw new TypeError(this.translate("Password must be at least {0} characters.", 6));

        return await Encryption.encrypt(password, JSON.stringify(this[internal].storage));
    }

    /**
     * Decrypts the provided storage set with the password, and overwrites the current dataset.
     *
     * @param {String} password must be at least 6 characters long.
     * @param {Uint8Array} encrypted
     * @returns {Promise<string>} version number of import.
     * @throws {Error} if encryption isn't supported.
     */
    async import(password, encrypted) {
       if (!exportable)
           throw new Error(this.translate("Your browser doesn't support encryption"));

       if (typeof password !== "string" || password.length < 6)
           throw new TypeError(this.translate("Password must be at least {0} characters.", 6));

        let version = await Encryption.version(encrypted);

        if (version === null) {
            throw new Exception(this.translate("Invalid backup format."));
        }

        let result = await Encryption.decrypt(password, encrypted);

        JSON.parse(result);

        this[internal].storage = new MoneyStorage(result);
        await this[save]();
        return version;
    }

    toJSON() {
        throw new Error("Not supported");
    }
}

export { PaymentEngine };