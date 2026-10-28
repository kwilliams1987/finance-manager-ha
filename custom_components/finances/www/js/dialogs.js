"use strict";

import { ITranslate } from "./strings.js";

/**
 * @typedef {Object} ElementTemplate
 * @property {String} node
 * @property {?String} text
 * @property {?ElementTemplate[]} children
 * @property {Object.<string, Function>} events
 */

/**
 * @param {ElementTemplate} properties
 * @returns {HTMLElement}
 */
const elementTemplate = (properties) => {
    /**
     * @param {HTMLElement} element
     * @param {ElementTemplate} properties
     */
    let recursive = (element, properties) => {
            if (properties.text !== undefined) {
                element.innerHTML = properties.text;
            }

            if (properties.children !== undefined) {
                properties.children.filter(child => child.node !== undefined)
                    .forEach(child => element.appendChild(recursive(document.createElement(child.node), child)));
            }

            if (properties.events  !== undefined) {
                Object.keys(properties.events).forEach(event => element.addEventListener(event, properties.events[event]));
            }

            Object.keys(properties).forEach(property => {
                switch (property){
                    case "children":
                    case "text":
                    case "node":
                    case "events":
                        break;
                    default:element.setAttribute(property, properties[property]);
                }
            });

            if (properties.node.toUpperCase() === "SELECT" && properties.value !== undefined) {
                element.value = properties.value;
            }
            return element;
        };

    if (properties.node !== undefined) {
        return recursive(document.createElement(properties.node), properties);
    }
}

const translate = Symbol('translator');

class DialogManager {
    /**
     * @param {ITranslate} translator
     */
    constructor(translator) {
        if (translator instanceof ITranslate) {
            this[translate] = translator;
        } else {
            throw new TypeError("translator does not implement ITranslate");
        }
    }

    /**
     * @param {String} message Translatable message string.
     * @param {...String} values Translation placeholder values.
     * @returns {Promise<void>}
     */
    async alert(message, ...parameters) {
        return new Promise(resolve => {
            let dialog = elementTemplate({
                node: "dialog",
                children: [
                    { node: "p", text: this[translate].translate(message, ...parameters) },
                    {
                        node: "div",
                        class: "controls",
                        children: [{
                            node: "button",
                            text: this[translate].translate('Close'),
                            events: {
                                click: e => {
                                    resolve();
                                    e.target.closest('dialog').close();
                                    document.body.removeChild(e.target.closest('dialog'));
                                }
                            }
                        }]
                    }
                ]
            });

            document.body.appendChild(dialog);
            dialog.showModal();
        });
    };

    /**
     * @typedef {Object} PromptOptions
     * @property {String} text
     * @property {?String} type
     * @property {?String[]} parameters
     */

    /**
     * @param {(String|PromptOptions} message Translatable message string or advanced options.
     * @param {...String} values Translation placeholder values, ignored with PromptOptions.
     * @returns {Promise<String>}
     */
    async prompt(message, ...parameters) {
        let props = { type: "text"} ;
        if (typeof message === "object") {
            if (typeof message.text !== "string") {
                throw Error("message isn't a valid PromptOptions object");
            }

            if (typeof message.type === "string") {
                props.type = message.type;
                switch (props.type) {
                    case "password":
                        props.autocomplete = "new-password";
                        break;
                    case "number":
                        if (message.step !== undefined) {
                            props.step = message.step;
                        }
                        if (message.min !== undefined) {
                            props.min = message.min;
                        }
                        if (message.max !== undefined) {
                            props.max = message.max;
                        }
                        break;
                }
            }

            if (message.value !== undefined) {
                props.value = message.value;
            }

            if (Array.isArray(message.parameters)) {
                parameters = message.parameters;
            }

            message = message.text;
        }

        return new Promise(resolve => {
            let dialog = elementTemplate({
                node: "dialog",
                children: [
                    {
                        node: "form",
                        events: {
                            submit: e => {
                                e.preventDefault();
                                resolve(Array.from(e.target.children).find(i => i.name === "value").value);
                                e.target.closest('dialog').close();
                                document.body.removeChild(e.target.closest('dialog'));
                            },
                            reset: e => {
                                e.preventDefault();
                                resolve(null);
                                e.target.closest('dialog').close();
                                document.body.removeChild(e.target.closest('dialog'));
                            }
                        },
                        children: [
                            { node: "label", text: this[translate].translate(message, ...parameters) },
                            { node: "input", name: "value" },
                            { node: "br" },
                            {
                                node: "div",
                                class: "controls",
                                children: [
                                    { node: "input", type: "submit", value: this[translate].translate('Okay') },
                                    { node: "input", type: "reset", value: this[translate].translate('Cancel') }
                                ]
                            }
                        ]
                    }
                ]
            });

            var input = dialog.querySelector('[name="value"]');

            for(var p in props) {
                input[p] = props[p];
            }

            document.body.appendChild(dialog);
            dialog.showModal();
        });
    };

    /**
     * @param {String} message Translatable message string.
     * @param {...String} values Translation placeholder values.
     * @returns {Promise<boolean>}
     */
    async confirm(message, ...values) {
        return new Promise(resolve => {
            let dialog = elementTemplate({
                node: "dialog",
                children: [
                    { node: "p", text: this[translate].translate(message, ...values) },
                    {
                        node: "div",
                        class: "controls",
                        children: [
                            {
                                node: "button",
                                text: this[translate].translate('Yes'),
                                events: {
                                    click: e => {
                                        resolve(true);
                                        e.target.closest('dialog').close();
                                        document.body.removeChild(e.target.closest('dialog'));
                                    }
                                }
                            },
                            {
                                node: "button",
                                text: this[translate].translate('No'),
                                events: {
                                    click: e => {
                                        resolve(false);
                                        e.target.closest('dialog').close();
                                        document.body.removeChild(e.target.closest('dialog'));
                                    }
                                }
                            }
                        ]
                    }
                ]
            });

            document.body.appendChild(dialog);
            dialog.showModal();
        });
    }

    /**
     * @param {String} message Translatable message string.
     * @param {...String} values Translation placeholder values.
     * @returns {void}
     */
    notification(message, ...values) {
        let notification = elementTemplate({
            node: "aside",
            role: "dialog",
            text: this[translate].translate(message, ...values),
            children: [
                {
                    node: 'button',
                    text: this[translate].translate("Close"),
                    events: {
                        click: e => document.body.removeChild(e.target.closest('aside'))
                    }
                }
            ]
        });

        document.body.appendChild(notification);
    }
}

export { elementTemplate, DialogManager };