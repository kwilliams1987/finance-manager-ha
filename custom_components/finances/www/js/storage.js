"use strict";

import { Guid } from "./utils/guid.js";
import { Payment } from "./model/payment.js";
import { Template } from "./model/template.js";

const internal = Symbol("internal");

class MoneyStorage {
    /**
     *
     *
     * @param {String} [storage]
     */
    constructor(storage) {
        this[internal] = {
            payments: [],
            templates: [],
            locale: "en-GB",
            currency: "EUR",
            excessive: 0,
            date: new Date(),
            benefactor: null
        };

        if (storage === undefined) {
            return;
        }

        if (typeof storage === "string") {
            if (storage.length === 0) {
                return;
            }

            storage = JSON.parse(storage);
        }

        if (typeof(storage.date) === "string") {
            try {
                storage.date = new Date(storage.date);
            } catch { }
        }

        if (storage.date instanceof Date) {
            this[internal].date = storage.date;
        }

        if (storage.payments !== undefined && Array.isArray(storage.payments)) {
            storage.payments.forEach(p => {
                if (p.id !== undefined) {
                    this[internal].payments.push(new Payment(p))
                }
            });
        }

        if (storage.templates !== undefined && Array.isArray(storage.templates)) {
            storage.templates.forEach(t => {
                if (t.id !== undefined) {
                    this[internal].templates.push(new Template(t))
                }
            });
        }

        if (typeof(storage.locale) === "string" && storage.locale.length > 0) {
            this[internal].locale = storage.locale;
        }

        if (typeof(storage.currency) === "string" && storage.currency.length === 3) {
            this[internal].currency = storage.currency;
        }

        if (!isNaN(storage.excessive)) {
            this[internal].excessive = Math.max(storage.excessive, 0);
        }

        if (typeof(storage.benefactor) === "string" && storage.benefactor.length > 0) {
            this[internal].benefactor = storage.benefactor;
        }
    }

    get date() {
        return this[internal].date;
    }

    set date(value) {
        if (value instanceof Date) {
            this[internal].date = value;
        } else {
            throw new TypeError("value must be a Date");
        }
    }

    get locale() {
        return this[internal].locale;
    }

    set locale(value) {
        if (typeof value === "string" && value.length > 0) {
            this[internal].locale = value;
        } else {
            throw new TypeError("value must be a non-empty string");
        }
    }

    get currency() {
        return this[internal].currency;
    }

    set currency(value) {
        if (typeof value === "string" && value.length === 3) {
            this[internal].currency = value;
        } else {
            throw new TypeError("value must be a three-character string");
        }
    }

    get excessive() {
        return this[internal].excessive;
    }

    set excessive(value) {
        if(isNaN(value)) {
            throw new TypeError("value is not a number");
        }

        if (value < 0) {
            throw new RangeError("value is less than zero");
        }

        this[internal].excessive = value;
    }

    get benefactor() {
        return this[internal].benefactor;
    }

    set benefactor(value) {
        if(value === null) {
            this[internal].benefactor = value;
        } else if (typeof(value) === "string" && value.length > 0) {
            this[internal].benefactor = value;
        } else {
            throw TypeError("value must be null or a none-empty string");
        }
    }

    /**
     * @returns {Payment[]}
     */
    get payments() {
        return this[internal].payments;
    }

    /**
     * Get all payments for the current month.
     *
     * @param {Date} month
     * @returns {Promise<Payment[]>}
     * @throws {TypeError} if month is not a Date.
     */
    getPaymentsByMonth(month) {
        if (month instanceof Date) {
            return new Promise(resolve => resolve(this[internal].payments.filter(p => p.date instanceof Date && p.date.getFullYear() === month.getFullYear() && p.date.getMonth() === month.getMonth())));
        } else {
            throw new TypeError("month is not a valid Date.");
        }
    }

    /**
     * Get payment with specified ID.
     *
     * @param {Guid} id
     * @returns {Promise<?Payment>}
     * @throws {TypeError} if id is not a Guid.
     */
    getPayment(id) {
        if (id instanceof Guid) {
            return new Promise(resolve => resolve(this[internal].payment.find(p => p.id.equalTo(id))));
        } else {
            throw new TypeError("id is not a valid Guid.");
        }
    }

    /**
     * Stored changed payment in the dataset, adding if it doesn't already exist.
     *
     * @param {Payment} payment
     */
    updatePayment(payment) {
        if (payment instanceof Payment){
            for (let p = 0; p < this[internal].payments.length; p++) {
                if (payment.id.equalTo(this[internal].payments[p].id)) {
                    this[internal].payments[p] = payment;
                    return;
                }
            }

            this[internal].payments.push(payment);
        } else {
            throw new TypeError("payment is not the correct type.");
        }
    }

    /**
     * Removes payment from the dataset if it exists.
     *
     * @param {(Payment|Guid)} payment
     */
    removePayment(payment) {
        if (payment instanceof Payment) {
            payment = payment.id;
        }

        if (payment instanceof Guid) {
            for (let p = 0; p < this[internal].payments.length; p++) {
                if (payment.equalTo(this[internal].payments[p].id)) {
                    this[internal].payments.splice(p, 1);
                    return;
                }
            }
        } else {
            throw new TypeError("payment must be a Payment or Guid.");
        }
    }

    /**
     * @returns {Template[]}
     */
    get templates() {
        return this[internal].templates;
    }

    /**
     * Get all templates for the current month.
     *
     * @param {Date} month
     * @returns {Promise<Template[]>}
     * @throws {TypeError} if month is not a Date.
     */
    getTemplatesByMonth(month) {
        if (month instanceof Date) {
            return new Promise(resolve => resolve(this[internal].templates.filter(t => t.isDueInMonth(month))));
        } else {
            throw new TypeError("month is not a valid date.");
        }
    }

    /**
     * Get template with specified ID.
     *
     * @param {Guid} id
     * @returns {Promise<?Template>}
     */
    getTemplate(id) {
        if (id instanceof Guid) {
            return new Promise(resolve => resolve(this[internal].templates.find(t => t.id.equalTo(id))));
        } else {
            throw new TypeError("id is not a valid Guid.");
        }
    }

    /**
     * Stored changed template in the dataset, adding if it doesn't already exist.
     *
     * @param {Template} template
     * @param {?Date} month
     */
    updateTemplate(template, month) {
        if (template instanceof Template){
            /**
             * @type {Template}
             */
            var current = this[internal].templates.find(t => t.id.equalTo(template.id));
            if (current === undefined) {
                this[internal].templates.push(template);
            } else {
                if (current.amount === template.amount
                    && current.partial === template.partial
                    && current.recurrence === template.recurrence) {
                    current.benefactor = template.benefactor;
                    current.endDate = template.endDate;
                    current.name = template.name;
                    current.partial = template.partial;
                    current.recurrence = template.recurrence;
                    current.startDate = template.startDate;
                } else {
                    let record = new Template({
                        name: template.name,
                        benefactor: template.benefactor,
                        amount: template.amount,
                        partial: template.partial,
                        startDate: month,
                        endDate: template.month,
                        recurrence: template.recurrence
                    });

                    this[internal].templates.push(record);
                    if (this.payments.find(p => p.templateId.equalTo(current.id)) === undefined) {
                        this.removeTemplate(current);
                    } else {
                        current.endDate = month;
                    }
                }
            }
        } else {
            throw new TypeError("template is not the correct type.");
        }
    }

    /**
     * Removes template from the dataset if it exists.
     *
     * @param {(Template|Guid)} template
     */
    removeTemplate(template) {
        if (template instanceof Template) {
            template = template.id;
        }

        if (template instanceof Guid) {
            for (let p = 0; p < this[internal].payments.length; p++) {
                if (template.equalTo(this[internal].payments[p].templateId)) {
                    this[internal].payments.splice(p, 1);
                }
            }

            for (let t = 0; t < this[internal].templates.length; t++) {
                if (template.equalTo(this[internal].templates[t].id)) {
                    this[internal].templates.splice(t, 1);
                    return;
                }
            }
        } else {
            throw new TypeError("template must be a Template or Guid.");
        }
    }

    toJSON() {
        return {
            date: this.date,
            payments: this.payments,
            templates: this.templates,
            locale: this.locale,
            currency: this.currency,
            excessive: this.excessive,
            benefactor: this.benefactor
        }
    }
}

export { MoneyStorage };