"use strict";

import { Guid } from "../utils/guid.js";
import { Recurrence } from "./recurrence.js";
import { Payment } from "./payment.js";

const internal = Symbol("internal");

class Template {
    constructor(values) {
        this[internal] = {
            id: new Guid(),
            name: "",
            benefactor: null,
            amount: 0,
            startDate: null,
            endDate: null,
            partial: false,
            recurrence: Recurrence.never,
            created: new Date(Date.now())
        };

        if (values === undefined)
            return;

        if (values.id !== undefined) {
            this[internal].id = new Guid(values.id);
            this[internal].created = values.created;
        }

        if (values.startDate instanceof Date) {
            this[internal].startDate = values.startDate;
        } else if (values.startDate !== null) {
            this[internal].startDate = new Date(values.startDate);
        }

        if (values.endDate instanceof Date) {
            this[internal].endDate = values.endDate;
        } else if (values.endDate !== null) {
            this[internal].endDate = new Date(values.endDate);
        }

        this[internal].name = values.name;
        this[internal].amount = parseFloat(values.amount);
        this[internal].partial = values.partial;
        this[internal].recurrence = values.recurrence;
        this[internal].benefactor = values.benefactor === undefined ? null : values.benefactor;
    }

    /**
     * @returns {!Guid}
     */
    get id() {
        return this[internal].id;
    }

    /**
     * @returns {!String}
     */
    get name() {
        return this[internal].name;
    }

    /**
     * @param {String} value
     * @throws {TypeError} if value is not a {String} or has zero length.
     */
    set name(value) {
        if (typeof(value) !== "string" || value.length == 0) {
            throw new TypeError("value must be a string with a length greater than 0");
        }

        this[internal].name = value;
    }

    /**
     * @returns {?String}
     */
    get benefactor() {
        return this[internal].benefactor;
    }

    /**
     * @param {?String} value
     * @throws {TypeError} if value is not a {String} or null.
     */
    set benefactor(value) {
        if (typeof(value) !== "string" && value !== null) {
            throw new TypeError("value must be a string or null");
        }

        if (value === "")
            value = null;

        this[internal].benefactor = value;
    }

    /**
     * @returns {!Number}
     */
    get amount() {
        return this[internal].amount;
    }

    /**
     * @param {!Number} value
     * @throws {TypeError} if value is not a {Number}.
     */
    set amount(value) {
        value = parseFloat(value);
        if (isNaN(value)) {
            throw new TypeError("value must be a number");
        }

        this[internal].amount = value;
    }

    /**
     * @returns {?Date}
     */
    get startDate() {
        return this[internal].startDate;
    }

    /**
     * @param {?Date} value
     * @throws {TypeError} if value is not a {Date} or {null}.
     * @throws {RangeError} if value is after end date.
     */
    set startDate(value) {
        if (value === null) {
            this[internal].startDate = value;
        } else if (value instanceof Date) {
            if (this.endDate !== null && this.endDate < value) {
                throw new RangeError("value cannot be after end date");
            }

            this[internal].startDate = value;
        } else {
            throw new TypeError("value must be a Date or null.");
        }
    }

    /**
     * @returns {?Date}
     */
    get endDate() {
        return this[internal].endDate;
    }

    /**
     * @param {?Date} value
     * @throws {TypeError} if value is not a {Date} or {null}.
     * @throws {RangeError} if value is after end date.
     */
    set endDate(value) {
        if (value === null) {
            this[internal].endDate = value;
        } else if (value instanceof Date) {
            if (this.endDate !== null && this.startDate > value) {
                throw new RangeError("value cannot be before start date");
            }

            this[internal].endDate = value;
        } else {
            throw new TypeError("value must be a Date or null.");
        }
    }

    /**
     * @returns {boolean}
     */
    get partial() {
        return this[internal].partial;
    }

    /**
     * @param {boolean} value
     * @throws {TypeError} if value is not boolean
     */
    set partial(value) {
        if (typeof value !== "boolean") {
            throw new TypeError("value must be a boolean.");
        }

        this[internal].partial = value;
    }

    get recurrence() {
        return this[internal].recurrence;
    }

    set recurrence(value) {
        switch (value) {
            case Recurrence.never:
            case Recurrence.monthly:
            case Recurrence.bimonthly:
            case Recurrence.quarterly:
            case Recurrence.biannually:
            case Recurrence.annually:
                this[internal].recurrence = value;
                return;
            default:
                throw new RangeError("value isn't a supported Recurrence type");
        }
    }

    get created() {
        return this[internal].created;
    }

    /**
     * Returns true if the template should be paid in the provided month.
     *
     * @param {Date} month
     * @returns {boolean}
     * @throws {TypeError} if month is not a Date
     */
    isDueInMonth(month){
        month = new Date(month.getFullYear(), month.getMonth(), 1);
        if (this.startDate !== null)
        {
            if (this.startDate.getFullYear() > month.getFullYear())
                return false;

            if (this.startDate.getFullYear() === month.getFullYear() && this.startDate.getMonth() > month.getMonth())
                return false;
        }

        if (this.endDate !== null && this.endDate < month)
            return false;

        if (month instanceof Date) {
            switch (this.recurrence) {
                case Recurrence.never:
                    if (this.startDate === null)
                        return false;

                    return month.getFullYear() === this.startDate.getFullYear() && month.getMonth() === this.startDate.getMonth();
                case Recurrence.monthly:
                    if (this.startDate === null && this.endDate === null) {
                        return true;
                    }

                    if (this.endDate === null) {
                        return this.startDate <= month;
                    }

                    if (this.startDate === null) {
                        return this.endDate >= month;
                    }

                    return this.startDate <= month && this.endDate >= month;

                case Recurrence.bimonthly:
                    if (this.startDate === null) {
                        return false;
                    }

                    return month.getMonth() % 2 === this.startDate.getMonth() % 2;

                case Recurrence.quarterly:
                    if (this.startDate === null) {
                        return false;
                    }

                    return month.getMonth() % 3 === this.startDate.getMonth() % 3;

                case Recurrence.biannually:
                    if (this.startDate === null) {
                        return false;
                    }

                    return month.getMonth() % 6 === this.startDate.getMonth() % 6;

                case Recurrence.annually:
                    return month.getMonth() === this.startDate.getMonth();
            }
        } else {
            throw new TypeError("month is not a date");
        }
    }

    /**
     * Calculate remaining total based on provided payments.
     *
     * @param {Payment[]} payments
     */
    getRemaining(payments){
        var remaining = this.amount;

        payments.filter(p => p.templateId.equalTo(this.id)).forEach(p => remaining -= p.amount);
        return Math.max(0, remaining);
    }

    /**
     * Calculate total cost based on provided payments.
     *
     * @param {Payment[]} payments
     */
    getCost(payments){
        var cost = 0;

        payments.filter(p => p.templateId.equalTo(this.id)).forEach(p => cost += p.amount);

        if (this.amount < 0) {
            return Math.min(0, cost);
        } else {
            return Math.max(0, cost);
        }
    }

    /**
     * Calculate if this bill has been satisfied based on provided payments.
     *
     * @param {Payment[]} payments
     */
    isPaid(payments){
        if (this.partial) {
            return payments.find(p => p.templateId.equalTo(this.id) && p.closePartial) !== undefined;
        } else {
            return payments.find(p => p.templateId.equalTo(this.id)) !== undefined;
        }
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            benefactor: this.benefactor,
            amount: this.amount,
            startDate: this.startDate,
            endDate: this.endDate,
            partial: this.partial,
            recurrence: this.recurrence,
            created: this.created
        }
    }
}

export { Template };