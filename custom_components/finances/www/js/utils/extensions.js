if ('HTMLDialogElement' in window) {
    if (!('showModal' in HTMLDialogElement.prototype)) {
        HTMLDialogElement.prototype.showModal = function () {
            if (this.attributes.open !== undefined) {
                throw new InvalidStateError("Dialog is already open.");
            }

            this.setAttribute('open', '');
        }
    }

    if (!('close' in HTMLDialogElement.prototype)) {
        HTMLDialogElement.prototype.close = function () {
            if (this.attributes.open === undefined) {
                throw new InvalidStateError("Dialog is already closed.");
            }

            this.removeAttribute('open');
        }
    }
} else {
    HTMLElement.prototype.showModal = function () {
        if (this.attributes.open !== undefined) {
            throw new InvalidStateError("Dialog is already open.");
        }

        this.setAttribute('open', '');
    }

    HTMLElement.prototype.close = function () {
        if (this.attributes.open === undefined) {
            throw new InvalidStateError("Dialog is already closed.");
        }

        this.removeAttribute('open');
    }
}

HTMLElement.prototype.clearChildren = function() {
    while(this.firstChild) {
        this.removeChild(this.firstChild);
    }
}

Date.prototype.toMonthString = function () {
    var result = this.getFullYear() + "-";
    var month = this.getMonth() + 1;
    if (month < 10)
        result += "0";

    result += month;
    return result;
}

/**
 * @returns {HTMLElement}
 */
String.prototype.toHtml = function () {
    let template = document.createElement('template')
    template.innerHTML = this.trim();
    return template.content.firstChild;
}

/**
 * Groups the provided elements by the specified callback.
 *
 * @this {Array<T>}
 * @param {Function<T, K>} selector
 * @return {Map<K, T>}
 * @template T
 * @template K
 */
Array.prototype.groupBy = function(selector) {
    const result = new Map();

    this.forEach(e => {
        let key = selector(e);
        let group = result.get(key);
        if (group === undefined) {
            result.set(key, [e]);
        } else {
            group.push(e);
        }
    });

    return result;
}

/**
 * Asynchronously groups the provided elements by the specified callback.
 *
 * @this {Array<T>}
 * @param {Function<T, Promise<K>>} selector
 * @return {Promise<Map<K, T>>}
 *
 * @template T Array type.
 * @template K Key type.
 */
Array.prototype.groupByAsync = async function(selector) {
    const result = new Map();

    for (let e = 0; e < this.length; e++) {
        let key = await selector(this[e]);
        let group = result.get(key);
        if (group === undefined) {
            result.set(key, [this[e]]);
        } else {
            group.push(this[e]);
        }
    }

    return result;
}

/**
 * Returns a new map with the previously grouped elements subselected.
 *
 * @this {Map<K, Array<T>>}
 * @param {Function<T, any>} callbackfn
 * @return {Map<K, Array<any>>}
 *
 * @template T Array type.
 * @template K Key type.
 */
Map.prototype.map = function (callbackfn) {
    const result = new Map();

    this.forEach((values, key) => {
        if (Array.isArray(values)) {
            result.set(key, values.map(callbackfn));
        } else {
            result.set(key, callbackfn(values));
        }
    });

    return result;
}