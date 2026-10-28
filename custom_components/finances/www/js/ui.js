"use strict";

import { PaymentEngine } from './engine.js';
import { elementTemplate, DialogManager } from './dialogs.js';
import { Payment } from './model/payment.js';
import { Template } from './model/template.js';
import { Recurrence } from './model/recurrence.js';
import { Guid } from './utils/guid.js';

const ThirdParty = {
    ChartJs: "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/2.7.3/Chart.bundle.min.js"
}

/**
 * @type {PaymentEngine}
 */
let engine = {};

/**
 *
 * @type {DialogManager}
 */
let dialogs = {};

const handler = async e => {
    document.getElementById('expected').value = e.caller.formatCurrency(e.caller.expected);
    document.getElementById('paid').value = e.caller.formatCurrency(e.caller.paid);
    document.getElementById('remaining').value = e.caller.formatCurrency(e.caller.remaining);

    let pending = document.getElementById('pending-bills');
    let income = document.getElementById('income');
    let paid = document.getElementById('paid-bills');

    pending.clearChildren();
    income.clearChildren();
    paid.clearChildren();

    await Promise.all([e.caller.getPayments(), e.caller.getTemplates()]).then(values => {
        let payments = values[0];
        let templates = values[1];
        let excessMod = 1 + (e.caller.excessive / 100);
        let benefactor = engine.benefactor;
        let benefactors = [];

        let outputs = [];

        payments.filter(p => p.templateId.equalTo(Guid.empty)).forEach(p => {
            if (benefactor === null) {
                outputs.push({
                    id: p.id,
                    name: p.name,
                    benefactor: null,
                    expected: null,
                    actual: p.amount,
                    paid: true,
                    excessive: true,
                    partial: false
                });
            }
        });

        templates.forEach(t => {
            if (t.benefactor !== null && benefactors.indexOf(t.benefactor) === -1) {
                benefactors.push(t.benefactor);
            }

            if (benefactor === null || benefactor === t.benefactor) {
                let r = {
                    id: t.id,
                    name: t.name,
                    benefactor: t.benefactor,
                    expected: t.amount,
                    actual: t.getCost(payments),
                    paid: t.isPaid(payments),
                    partial: t.partial
                };

                r.excessive = r.actual > r.expected * excessMod;

                outputs.push(r);
            }
        });

        outputs.sort((o1, o2) => {
            if (o1.paid && o1.actual === 0 && (o2.paid || o2.actual !== 0))
                return 1;

            if (o2.paid && o2.actual === 0 && (o1.paid || o1.actual !== 0))
                return -1;

            if ((o1.paid || o1.actual !== 0) && !o2.paid && o2.actual === 0)
                return 1;

            if ((o2.paid || o2.actual !== 0) && !o1.paid && o1.actual === 0)
                return -1;

            if (o1.name > o2.name)
                return 1;

            if (o1.name < o2.name)
                return -1;

            return 0;
         }).forEach(o => {
            let cost = o.actual;
            let amount = o.expected;
            let excessive = o.excessive;
            let isPaid = o.paid;
            let name = o.name;

            if (o.benefactor !== null) {
                name += ` <span class="benefactor">${o.benefactor}</span>`;
            }

            if (amount > 0 || cost > 0) {
                if (isPaid || (o.partial && cost !== 0)) {
                    let row = `
                    <tr data-template-id="${o.id}">
                        <td>${name}</td>
                        <td>${amount === null ? '' : e.caller.formatCurrency(amount)}</td>
                        <td>${cost === 0 ? '' : e.caller.formatCurrency(cost)}</td>
                        <td>
                            ${amount !== null ? `<button class="edit">${e.caller.translate("Edit")}</button>` : ''}
                            <button class="cancel">${e.caller.translate("Undo")}</button>
                        </td>
                    </tr>`.toHtml();

                    if (amount === null) {
                        row.classList.add("unexpected");
                    }

                    if (o.partial) {
                        row.classList.add("partial");
                    }

                    if (!o.partial && cost === 0) {
                        row.classList.add("ignored");
                    }

                    if (excessive) {
                        row.classList.add("excessive");
                    }

                    paid.appendChild(row);
                }

                if (!isPaid) {
                    let remaining = Math.max(0, amount - cost);

                    let row = `
                    <tr data-template-id="${o.id}">
                        <td>${name}</td>
                        <td>${e.caller.formatCurrency(remaining)}</td>
                        <td>
                            <button class="pay">${e.caller.translate("Pay")}</button>
                            <button class="ignore">${e.caller.translate("Ignore")}</button>
                            <button class="edit">${e.caller.translate("Edit")}</button>
                        </td>
                    </tr>`.toHtml();

                    if (o.partial && cost !== 0) {
                        row.classList.add("partial");
                    }

                    if (excessive) {
                        row.classList.add("excessive");
                    }

                    pending.appendChild(row);
                }
            } else if (amount < 0 || o.cost < 0) {
                let row = `
                <tr data-template-id="${o.id}">
                    <td>${name}</td>
                    <td>${amount === null ? '' : e.caller.formatCurrency(amount * -1)}</td>
                    <td>${isPaid ? e.caller.formatCurrency(cost * -1) : ''}</td>
                    <td>
                        <button class="edit">${e.caller.translate("Edit")}</button>
                        <button class="cancel"${isPaid ? "" : " hidden"}>${e.caller.translate("Undo")}</button>
                        <button class="pay"${isPaid ? "hidden" : " "}>${e.caller.translate("Pay")}</button>
                    </td>
                </tr>`.toHtml();

                if (amount === null) {
                    row.classList.add("unexpected");
                }

                if (cost > amount && isPaid) {
                    row.classList.add("excessive");
                }

                income.appendChild(row);
            }
        });

        if (benefactors.length === 0) {
            document.querySelectorAll('.benefactor-selector').forEach(e => {
                e.setAttribute("hidden", "");
                e.clearChildren();
                let all = document.createElement("option");
                all.value = "";
                all.innerHTML = engine.translate("All Benefactors");
                e.appendChild(all);
            });
        } else {
            document.querySelectorAll('.benefactor-selector').forEach(e => {
                e.clearChildren();

                let all = document.createElement("option");
                all.value = "";
                all.innerHTML = engine.translate("All Benefactors");
                e.appendChild(all);

                benefactors.sort().forEach(b => {
                    let option = document.createElement("option");
                    option.value = b;
                    option.innerHTML = b;
                    e.appendChild(option);
                });

                e.removeAttribute("hidden");
            });
        }

        if (pending.children.length === 0) {
            pending.appendChild(`<tr><td colspan="5" class="empty">${engine.translate("No pending bills!")}</td></tr>`.toHtml());
        } else {
            let stillSorting = false,
                rows = pending.querySelectorAll("tbody tr");

            while(stillSorting) {
                stillSorting = false;

                for (let i = 0; i < rows.length - 1; i ++) {
                    let row1 = rows[i].querySelector("td").innerHTML,
                        row2 = rows[i + 1].querySelector("td").innerHTML;

                    if (row1 > row2) {
                        rows[i].parentElement.insertBefore(rows[i + 1], rows[i]);
                        stillSorting = true;
                        break;
                    }
                }
            }

            Array.from(pending.children).forEach(child=> {
                let next = child.nextSibling;

                if (next === null)
                    return;

                let name = child.querySelector('td:first-child').innerHTML;
                let nextName = child.nextSibling.querySelector('td:first-child').innerHTML;

                if (name > nextName) {
                    pending.insertBefore(next, child);
                }
            });
        }

        if (income.children.length === 0) {
            income.appendChild(`<tr><td colspan="4" class="empty">${engine.translate("No pending income!")}</td></tr>`.toHtml());
        }

        if (paid.children.length === 0) {
            paid.appendChild(`<tr><td colspan="4" class="empty">${engine.translate("No paid bills!")}</td></tr>`.toHtml());
        }
    });

    document.getElementById('month').removeAttribute('disabled');
    document.getElementById('now').removeAttribute('disabled');
    document.getElementById('locale').value = e.caller.locale;
    document.getElementById('currency').value = e.caller.currency;
    document.getElementById('excessive').value = e.caller.excessive;
    document.querySelectorAll('.benefactor-selector').forEach(s => s.value = e.caller.benefactor === null ? "" : e.caller.benefactor);

    document.body.classList.remove("loading");
    translate(e.caller);

    document.getElementById('tab-pending').classList.remove('loading');
    document.getElementById('tab-income').classList.remove('loading');
    document.getElementById('tab-paid').classList.remove('loading');

    renderGraphs();
}

const translate = engine => document.querySelectorAll(".translate").forEach(e => {
    let value = e.innerHTML.trim();
    let current = value;

    if (e.dataset.baseTranslation === undefined) {
        e.dataset.baseTranslation = value;
    } else {
        value = e.dataset.baseTranslation;
    }

    let translation = engine.translate(value);

    if (current !== translation) {
        e.innerHTML = translation;
    }
});

const maxSummaryDataPoints = 10;
const renderGraphs = async () => {
    if (!('Chart' in window)) {
        document.querySelector('[href="#tab-graphs"]').setAttribute('hidden', '');
        if (document.querySelector('[href="#tab-graphs"]').classList.contains('active')) {
            document.querySelector('[href="#tab-pending"]').click();
        }
        return;
    } else {
        document.querySelector('[href="#tab-graphs"]').removeAttribute('hidden');
    }

    /**
     * @type {Map<String, Template} templates
     */
    let templates = new Map(),
        startMonth = new Date(document.getElementById('graph-start').value + '-01'),
        endMonth = new Date(document.getElementById('graph-end').value + "-01"),
        dataset = await engine.getPayments(startMonth, endMonth),
        scheduledOnly = document.getElementById('graph-scheduled').checked,
        summarize = document.getElementById('graph-summarize').checked,
        colorsets = new Map();

    const rand = (max, min = 0) => Math.floor(Math.random() * (max - min + 1) + min);

    const getSeriesColor = name => {
        let color = colorsets.get(name);
        if (color === undefined) {
            color = `rgb(${rand(255)},${rand(255)},${rand(255)})`;
            colorsets.set(name, color);
        }
        return color;
    }

    /**
     * @type {Map<String, Payment[]>} grouping
     */
    let grouping = await dataset
        .filter(p => p.amount > 0 && (!scheduledOnly || !p.templateId.equalTo(Guid.empty)))
        .groupByAsync(async p => {
            let name = p.name;
            if (!p.templateId.equalTo(Guid.empty)) {
                let template = templates.get(p.templateId.value);
                if (template === undefined) {
                    template = await engine.getTemplate(p.templateId);
                    templates.set(template.id.value, template);
                }

                name = template.name + (template.benefactor ? " (" + template.benefactor + ")" : "");
            }

            return name;
        });

    let lineData = Array.from(grouping.map(p => ({ x: p.date, y: p.amount })))
        .map(mapping => {
            let result = {
                label: mapping[0],
                fill: false,
                borderColor: getSeriesColor(mapping[0]),
                backgroundColor: getSeriesColor(mapping[0]),
                data: []
            };

            mapping[1].forEach(r => {
                let existing = result.data.find(d => d.x.getFullYear() === r.x.getFullYear() && d.x.getMonth() === r.x.getMonth());
                if (existing === undefined) {
                    existing = {
                        x: r.x,
                        y: 0
                    }

                    result.data.push(existing);
                }

                existing.y += r.y;
            });

            return result;
        });

    let pieData = { datasets:[{ data:[], backgroundColor:[] }], labels: [] };;

    if (summarize) {
        let aggregates = Array.from(grouping)
            .map(g => {
                let r = {
                    key: g[0],
                    total: g[1].reduce((a, p) => a + p.amount, 0),
                    count: Array.from(g[1].groupBy(t => "" + t.date.getFullYear() + t.date.getMonth())).length
                };

                r.average = r.total / r.count;
                return r;
            });

        let totalDataPoints = aggregates.reduce((a, d) => a + d.count, 0);
        let totalDataSets = aggregates.length;
        let averageDataPoints = totalDataPoints / totalDataSets;
        let maxPoints = totalDataSets < maxSummaryDataPoints + 2 ? totalDataPoints : maxSummaryDataPoints;

        aggregates = aggregates.sort((a, b) => {
            if (a.count > averageDataPoints && b.count <= averageDataPoints) {
                return -1;
            }

            if (a.count <= averageDataPoints && b.count > averageDataPoints) {
                return 1;
            }

            return b.average - a.average;
        });

        let bigvalues = aggregates.slice(0, maxPoints).map(v => v.key);

        let otherValues = [];
        let lineValues = [{
            label: engine.translate("Other Payments"),
            fill: false,
            borderColor: getSeriesColor(engine.translate("Other Payments")),
            backgroundColor: getSeriesColor(engine.translate("Other Payments")),
            data: null
        }];
        lineData.forEach(e => {
            if (bigvalues.indexOf(e.label) > -1) {
                lineValues.push(e);
            } else {
                e.data.forEach(p => {
                    var c = otherValues.find(o => o.x.getFullYear() === p.x.getFullYear() && o.x.getMonth() === p.x.getMonth());
                    if (c === undefined) {
                        c = { x: p.x, y: 0 };
                        otherValues.push(c);
                    }
                    c.y += p.y;
                });
            }
        });
        lineValues[0].data = otherValues.sort((a, b) => a.x - b.x);

        lineData = lineValues;

        pieData.labels.push(engine.translate("Other Payments"));
        pieData.datasets[0].data.push(0);
        pieData.datasets[0].backgroundColor.push(getSeriesColor(engine.translate("Other Payments")));

        grouping.forEach((values, label) => {
            let sum = values.reduce((a, v) => a + v.amount, 0);

            if (bigvalues.indexOf(label) > -1) {
                pieData.labels.push(label);
                pieData.datasets[0].data.push(sum);
                pieData.datasets[0].backgroundColor.push(getSeriesColor(label));
            } else {
                pieData.datasets[0].data[0] += sum;
            }
        });
    } else {
        grouping.forEach((values, label) => {
            let sum = values.reduce((a, v) => a + v.amount, 0);

            pieData.labels.push(label);
            pieData.datasets[0].data.push(sum);
            pieData.datasets[0].backgroundColor.push(getSeriesColor(label));
        });
    }

    var lineCanvas = document.getElementById('graph-expenses-per-month');
    if (lineCanvas.chart === undefined) {
        lineCanvas.chart = new Chart(lineCanvas, {
            type: 'line',
            data: {
                datasets: lineData
            },
            options: {
                tooltips: {
                    callbacks: {
                        label: (item, data) => data.datasets[item.datasetIndex].label + ": " + engine.formatCurrency(item.yLabel)
                    }
                },
                scales: {
                    xAxes: [{
                        type: "time",
                        time: {
                            units: 'month',
                            unitStepSize: 1
                        }
                    }],
                    yAxes: [{
                        ticks: {
                            beginAtZero: true,
                            callback: (value, index, values) => {
                                return engine.formatCurrency(value);
                            }
                        }
                    }]
                }
            }
        });
    } else {
        lineCanvas.chart.data.datasets = lineData;
        lineCanvas.chart.update();
    }

    // TODO: Pie doesn't work.
    let pieCanvas = document.getElementById('graph-expenses-per-category');
    if (pieCanvas.chart === undefined) {
        pieCanvas.chart = new Chart(pieCanvas, {
            type: "pie",
            data: pieData,
            options: {
                tooltips: {
                    callbacks: {
                        label: (item, data) => data.labels[item.index] + ": " + engine.formatCurrency(data.datasets[item.datasetIndex].data[item.index])
                    }
                }
            }
        });
    } else {
        pieCanvas.chart.data = pieData;
        pieCanvas.chart.update();
    }

    document.getElementById('tab-graphs').classList.remove('loading');
}

let locales = document.getElementById("locale");
let currencies = document.getElementById("currency");
let excessive = document.getElementById("excessive");

document.addEventListener("DOMContentLoaded", async () => {
    if (window.crypto === undefined || window.crypto.getRandomValues === undefined)
        return;

    engine = new PaymentEngine();
    await engine.ready;
    dialogs = new DialogManager(engine);

    engine.addEventListener('change', handler);
    await handler({ caller: engine });

    document.getElementById('month').value = engine.month.toMonthString();

    engine.locales.forEach(e => locales.appendChild(new Option(e.name, e.locale)));
    locales.value = engine.locale;

    engine.currencies.forEach(e => currencies.appendChild(new Option(e.name, e.code)));
    currencies.value = engine.currency;

    translate(engine);

    if (window.location.hash) {
        Array.from(document.querySelectorAll('#tab-picker a')).find(a => a.href.split('#')[1] === window.location.hash.slice(1))?.click();
    }

    document.documentElement.classList.remove('unsupported');
    document.body.removeChild(document.getElementById('unsupportedBrowser'));

    let date = new Date(Date.now());
    document.getElementById('graph-end').value = date.toMonthString();
    document.getElementById('graph-start').value = date.toMonthString();

    let graphs = document.createElement('script');
    graphs.src = ThirdParty.ChartJs;
    graphs.async = true;
    graphs.onload = renderGraphs;

    document.body.appendChild(graphs);
});

document.getElementById("graph-end").setAttribute('max', new Date().toMonthString());
document.querySelectorAll('#graph-start, #graph-end').forEach(element => element.addEventListener("blur", async e => {
    let startDate = document.getElementById('graph-start').value,
        endDate = document.getElementById('graph-end').value;

    if (startDate > endDate) {
        switch (e.target.id) {
            case "graph-start":
                endDate = startDate;
                document.getElementById('graph-end').value = startDate;
                break;
            case "graph-end":
                startDate = endDate;
                document.getElementById('graph-start').value = endDate;
                break;
        }
    }

    if (startDate === endDate) {
        document.getElementById('title-expenses-per-month').setAttribute('hidden', '');
        document.getElementById('graph-expenses-per-month').setAttribute('hidden', '');
    } else {
        document.getElementById('title-expenses-per-month').removeAttribute('hidden');
        document.getElementById('graph-expenses-per-month').removeAttribute('hidden');
    }

    renderGraphs();
}));

document.getElementById('graph-scheduled').addEventListener('change', async () => renderGraphs());
document.getElementById('graph-summarize').addEventListener('change', async () => renderGraphs());

document.getElementById('month').addEventListener('change', async e => {
    let value = e.target.value;
    let components = value.split('-');

    if (components.length !== 2) {
        await dialogs.alert('Please enter a date in the format: YYYY-MM.');
        e.target.focus();
        return;
    }

    let year = components[0],
        month = components[1];

    if (!/^[1-9][0-9]{3}$/.test(year)) {
        await dialogs.alert('Please enter a date in the format: YYYY-MM.');
        e.target.focus();
        return;
    }

    if (!/^[0-1][0-9]$/.test(month) || parseInt(month) > 12) {
        await dialogs.alert('Please enter a date in the format: YYYY-MM.');
        e.target.focus();
        return;
    }

    e.target.setAttribute('disabled', '');
    document.getElementById('now').setAttribute('disabled', '');

    engine.month = new Date(value + "-01")
});

locales.addEventListener("change", async e => {
    engine.locale = e.target.value;
    let defaultCurrency = engine.defaultCurrency;
    if (defaultCurrency.code !== currencies.value && await dialogs.confirm("Switch to local currency {0}?", defaultCurrency.name)) {
        engine.currency = defaultCurrency.code;
    }
});

currencies.addEventListener("change", e => engine.currency = e.target.value);
excessive.addEventListener("change", e => engine.excessive = e.target.value);

document.getElementById('now').addEventListener('click', async e => {
    e.target.setAttribute('disabled', '');
    document.getElementById('month').setAttribute('disabled', '');

    var date = new Date(Date.now()).toMonthString();
    engine.month = new Date(date + "-01");
    document.getElementById('month').value = date;
});

document.getElementById('export').addEventListener('click', async e => {
    e.preventDefault();

    try {
        let date = new Date(Date.now());
        let filename = await dialogs.prompt({ text: "Please provide a filename:", value: `backup-${date.getFullYear()}-${date.getMonth() < 9 ? "0" : ""}${date.getMonth() + 1}-${date.getDate() < 10 ? "0" : ""}${date.getDate()}` })
        if (filename === null) {
            return;
        }

        if (filename.length === 0) {
            await dialogs.alert("Please provide a valid backup name.");
            return;
        }

        let password = await dialogs.prompt({ text: "Please provide a password:", type: "password"});

        if (password === null) {
            return;
        }

        let encrypted = await engine.export(password),
            blob = new Blob([encrypted], { type: "binary/octet-stream" });

        let link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename + ".money";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        await dialogs.alert("Export failed: {0}.", e.message);
    }
});

document.getElementById('import').addEventListener('click', async e => {
    if (await dialogs.confirm("Restoring a backup will overwrite your existing data, continue?")) {
        document.getElementById('backup').click();
    }
});

document.getElementById('backup').addEventListener('change', async change => {
    try {
        /**
         * @type FileList
         */
        let files = change.target.files;

        if (files.length === 1) {
            let reader = new FileReader();
            reader.onload = async read => {
                change.target.value = "";
                try {
                    let password = await dialogs.prompt({ text: "Backup password:", type: "password" });
                    if (password === null)
                        return;

                    try {
                        let version = await engine.import(password, new Uint8Array(read.target.result));
                        await dialogs.alert("Data restored successfully (v{0}).", version);
                    } catch (e) {
                        if (e.name === "OperationError") {
                            await dialogs.alert("Import failed: {0}.", engine.translate("Invalid backup password"));
                        } else {
                            await dialogs.alert("Import failed: {0}.", e.message);
                        }
                    }
                } catch (e) {
                    if (e instanceof SyntaxError) {
                        throw new Error(engine.translate("Invalid backup selected"));
                    } else {
                        throw e;
                    }
                }
            };

            reader.onerror = read => {
                read.target.abort();
                change.target.value = "";
                throw read.error;
            };

            reader.readAsArrayBuffer(files.item(0));
        }
    } catch (error) {
        dialogs.alert("Import failed: {0}.", error.message);
    }
});

document.querySelectorAll('main tbody').forEach(e => e.addEventListener('click', async e => {
    if (e.target instanceof HTMLElement) {
        switch (e.target.nodeName) {
            case "BUTTON":
                e.preventDefault();

                let templateId = e.target.closest("tr").dataset.templateId;
                let template = await engine.getTemplate(templateId);

                if (e.target.classList.contains("pay")) {
                    let options = {
                        text: template.amount > 0 ? "Total cost:" : "Total received:",
                        type: "number",
                        step: "0.01",
                        min: 0,
                        value: template.partial ? '' : Math.abs(template.amount)
                    },
                        amount = await dialogs.prompt(options);
                    if (amount === null) {
                        return;
                    }

                    amount = parseFloat(amount);

                    if (isNaN(amount)) {
                        await dialogs.alert("You must provide a valid amount.");
                        return;
                    }

                    if (template.amount < 0) {
                        amount *= -1;
                    }

                    if (template.partial && await dialogs.confirm("Close the {0} bill?", template.name)) {
                        await engine.addPayment(templateId, amount, true);
                    } else {
                        await engine.addPayment(templateId, amount);
                    }
                }

                if (e.target.classList.contains("ignore") && await dialogs.confirm("Ignore {0} for this cycle?", template.name)) {
                    await engine.addPayment(templateId, 0, true);
                }

                if (e.target.classList.contains("edit")) {
                    let income = template.amount < 0;
                    /**
                     * @type {Template}
                     */
                    let result = await new Promise(resolve => {
                        let dialog = elementTemplate({
                            node: "dialog",
                            id: "schedule-dialog",
                            children: [
                                { node: "h3", text: engine.translate("Edit Schedule") },
                                {
                                    node: "form",
                                    events: {
                                        'submit': async e => {
                                            e.preventDefault();

                                            let start = document.querySelector('#schedule-dialog [name="start"]').value;
                                            let end = document.querySelector('#schedule-dialog [name="end"]').value;
                                            let benefactor = document.querySelector('#schedule-dialog [name="benefactor"]').value;

                                            let result = {
                                                id: template.id,
                                                created: template.created,
                                                name: document.querySelector('#schedule-dialog [name="name"]').value,
                                                benefactor: benefactor  === '' ? null : benefactor,
                                                amount: parseFloat(document.querySelector('#schedule-dialog [name="cost"]').value) * (income ? -1 : 1),
                                                startDate: start === "" ? null : new Date(start + "-01"),
                                                endDate: end === "" ? null : new Date(end + "-01"),
                                                recurrence: parseInt(document.querySelector('#schedule-dialog [name="recurrency"]').value),
                                                partial: income ? false : document.querySelector('#schedule-dialog [name="partial"]').checked
                                            };

                                            if (result.name + "" === "") {
                                                await dialogs.alert("Please provide a {0}.", engine.translate("Name"));
                                                return;
                                            }

                                            if (isNaN(result.amount) || result.amount === 0.0) {
                                                await dialogs.alert("Please provide a {0}.", income ? engine.translate("Value") : engine.translate("Cost"));
                                                return;
                                            }

                                            if (result.startDate !== null && result.endDate !== null && result.startDate > result.endDate) {
                                                await dialogs.alert("Date range is invalid.");
                                                return;
                                            }

                                            if (result.start === null && result.recurrence !== Recurrence.never && result.recurrence !== Recurrence.monthly) {
                                                await dialogs.alert("Cannot use this recurrency without a start date.");
                                                return;
                                            }

                                            resolve(new Template(result));
                                            e.target.closest('dialog').close();
                                            document.body.removeChild(e.target.closest('dialog'));
                                        },
                                        'reset': e => {
                                            e.preventDefault();
                                            resolve(null);
                                            e.target.closest('dialog').close();
                                            document.body.removeChild(e.target.closest('dialog'));
                                        }
                                    },
                                    children: [
                                        { node: "label", text: engine.translate("Name"), },
                                        { node: "input", name: "name", required: "", value: template.name },
                                        { node: "br" },
                                        { node: "label", text: engine.translate("Benefactor"), },
                                        { node: "input", name: "benefactor", value: template.benefactor === null ? '' : template.benefactor },
                                        { node: "br" },
                                        {
                                            node: "div",
                                            class: "input-group",
                                            children: [
                                                { node: "label", text: engine.translate("Cost"), class: "cost-label" },
                                                { node: "span", text: engine.currencySymbol, class: "before" },
                                                { node: "input", name: "cost", type: "number", step: "0.01", min: "0", required: "", value: template.amount },
                                                { node: "br" }
                                            ]
                                        },
                                        { node: "label", text: engine.translate("Start Date") },
                                        { node: "input", name: "start", type: "month", value: template.startDate ? template.startDate.toMonthString() : "" },
                                        { node: "br" },
                                        { node: "label", text: engine.translate("End Date") },
                                        { node: "input", name: "end", type: "month", value: template.endDate ? template.endDate.toMonthString() : "" },
                                        { node: "br" },
                                        { node: "label", text: engine.translate("Recurrence") },
                                        {
                                            node: "select",
                                            name: "recurrency",
                                            children: engine.recurrencies.map(r => { return {
                                                node: "option",
                                                value: r.id,
                                                text: r.name
                                            }}),
                                            value: template.recurrence
                                        },
                                        { node: "br" },
                                        {
                                            node: "label",
                                            text: engine.translate("Partial Payments"),
                                            children: [
                                                { node: "input", name: "partial", type: "checkbox" }
                                            ]
                                        },
                                        { node: "br" },
                                        {
                                            node: "div",
                                            class: "controls",
                                            children: [
                                                { node: "input", type: "submit", value: engine.translate('Save') },
                                                { node: "input", type: "reset", value: engine.translate('Cancel') },
                                                {
                                                    node: "button",
                                                    text: engine.translate("Delete"),
                                                    events: {
                                                        click: async e => {
                                                            e.preventDefault();
                                                            e.target.closest('dialog').close();
                                                            document.body.removeChild(e.target.closest('dialog'));

                                                            if (await dialogs.confirm("Are you sure you want to delete {0} and all it's payment history?", template.name)) {
                                                                engine.deleteTemplate(template);
                                                                resolve(null);
                                                            }
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        });

                        if (template.partial) {
                            dialog.querySelector('[name="partial"]').checked = true;
                        }

                        if (income) {
                            dialog.querySelector('h3').innerHTML = engine.translate("Edit Income");
                            dialog.querySelector('.cost-label').innerHTML = engine.translate("Value");
                            dialog.querySelector('[name="cost"]').value = template.amount * -1;

                            let partial = dialog.querySelector('[name="partial"]').parentElement,
                                elements = Array.from(partial.parentElement.children),
                                index = elements.indexOf(partial),
                                br = elements[index + 1];

                            partial.parentElement.removeChild(br);
                            partial.parentElement.removeChild(partial);
                        }

                        document.body.append(dialog);
                        dialog.showModal();
                    });

                    if (result instanceof Template) {
                        engine.addOrUpdateTemplate(result);
                    }
                }

                if (e.target.classList.contains("cancel")) {
                    let payments = [];
                    if (template === undefined) {
                        templateId = new Guid(templateId);
                        payments = [await engine.getPayments().then(result => result.find(p => p.id.equalTo(templateId)))];
                        template = { partial: false };
                    } else {
                        payments = await engine.getPayments().then(result => result.filter(p => p.templateId.equalTo(template.id)));
                    }
                    if (template.partial && payments.length > 1) {
                        let dialog = elementTemplate({
                            node: "dialog",
                            children: [
                                {
                                    node: "form",
                                    events: {
                                        submit: async e => {
                                            e.preventDefault();
                                            let value = Array.from(e.target.children).find(e => e.name === "payment").value;

                                            document.body.removeChild(dialog);
                                            await engine.undoPayment(value);
                                        },
                                        reset: e => {
                                            e.preventDefault();
                                            document.body.removeChild(dialog);
                                        }
                                    },
                                    children: [
                                        { node: "h3", text: engine.translate("Select payment to cancel.") },
                                        { node: "p", text: engine.translate("{0} is made of multiple sub-payments, please select which you want to cancel.", template.name) },
                                        {
                                            node: "select",
                                            name: "payment",
                                            children: payments.map(p => { return {
                                                node: "option",
                                                text: `${p.created.toDateString()} - ${engine.formatCurrency(p.amount)}`,
                                                value: p.id
                                            }})
                                        },
                                        { node: "br" },
                                        {
                                            node: "div",
                                            class: "controls",
                                            children: [
                                                {
                                                    node: "button",
                                                    text: engine.translate("Re-open"),
                                                    events: {
                                                        click: async e => {
                                                            e.preventDefault();
                                                            let payment = payments.find(p => p.closePartial);
                                                            if (payment !== undefined) {
                                                                payment.closePartial = false;
                                                                await engine.addPayment(payment);
                                                            }
                                                            document.body.removeChild(dialog);
                                                        }
                                                    }
                                                },
                                                { node: "input", type: "submit", value: engine.translate("Delete") },
                                                { node: "input", type: "reset", value: engine.translate("Cancel") }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        });

                        document.body.appendChild(dialog);
                        dialog.showModal();
                    } else if (await dialogs.confirm("Undo this payment?")) {
                        await engine.undoPayment(payments[0]);
                    }
                }
                return;
        }
    }
}));

document.querySelectorAll('button.unexpected').forEach(e => e.addEventListener('click', async e => {
    let income = e.target.classList.contains("income");
    await new Promise(resolve => {
        let dialog = elementTemplate({
            node: "dialog",
            children: [
                { node: "h3", text: engine.translate("Unexpected Bill") },
                {
                    node: "form",
                    events: {
                        submit: async e => {
                            e.preventDefault();
                            let name = e.target.querySelector('[name="name"]').value,
                                cost = e.target.querySelector('[name="cost"]').value;

                            if (name + "" === "") {
                                await dialogs.alert("Please provide a {0}.", engine.translate("Name"));
                                return;
                            }

                            if (isNaN(cost) || cost === 0.0) {
                                await dialogs.alert("Please provide a {0}.", income ? engine.translate("Cost") : engine.translate("Value"));
                                return;
                            }

                            if (income) {
                                cost = cost * -1;
                            }

                            engine.addUnexpected(name, cost);
                            e.target.closest('dialog').close();
                            document.body.removeChild(e.target.closest('dialog'));
                            resolve();
                        },
                        reset: async e => {
                            e.target.closest('dialog').close();
                            document.body.removeChild(e.target.closest('dialog'));
                        }
                    },
                    children: [
                        { node: "label", text: engine.translate("Name") },
                        { node: "input", name: "name" },
                        { node: "br" },
                        {
                            node: "div",
                            class: "input-group",
                            children: [
                                { node: "label", text: engine.translate("Cost"), class: "cost-label" },
                                { node: "span", text: engine.currencySymbol, class: "before" },
                                { node: "input", name: "cost", type: "number", step: "0.01", min: "0" },
                                { node: "br" }
                            ]
                        },
                        {
                            node: "div",
                            class: "controls",
                            children: [
                                { node: "input", type: "submit", value: engine.translate('Save') },
                                { node: "input", type: "reset", value: engine.translate('Cancel') }
                            ]
                        }
                    ]
                }
            ]
        });

        if (income) {
            dialog.querySelector('.cost-label').innerHTML = engine.translate("Value");
        }

        document.body.appendChild(dialog);
        dialog.showModal();
    });
}));

document.querySelectorAll('button.schedule').forEach(e => e.addEventListener('click', async e => {
    let income = e.target.classList.contains("income");
    let template = await new Promise(resolve => {
        let dialog = elementTemplate({
            node: "dialog",
            id: "schedule-dialog",
            children: [
                { node: "h3", text: engine.translate("Schedule Bill") },
                {
                    node: "form",
                    events: {
                        submit: async e => {
                            e.preventDefault();

                            let start = document.querySelector('#schedule-dialog [name="start"]').value;
                            let end = document.querySelector('#schedule-dialog [name="end"]').value;
                            let benefactor = document.querySelector('#schedule-dialog [name="benefactor"]').value;

                            let result = {
                                name: document.querySelector('#schedule-dialog [name="name"]').value,
                                benefactor: benefactor  === '' ? null : benefactor,
                                amount: parseFloat(document.querySelector('#schedule-dialog [name="cost"]').value),
                                startDate: start === "" ? null : new Date(start + "-01"),
                                endDate: end === "" ? null : new Date(end + "-01"),
                                recurrence: parseInt(document.querySelector('#schedule-dialog [name="recurrency"]').value),
                                partial: income ? false : document.querySelector('#schedule-dialog [name="partial"]').checked
                            };

                            if (result.name + "" === "") {
                                await dialogs.alert("Please provide a {0}.", engine.translate("Name"));
                                return;
                            }

                            if (isNaN(result.amount) || result.amount === 0.0) {
                                await dialogs.alert("Please provide a {0}.", income ? engine.translate("Cost") : engine.translate("Value"));
                                return;
                            }

                            if (income) {
                                result.amount = result.amount * -1;
                            }

                            if (result.startDate !== null && result.endDate !== null && result.startDate > result.endDate) {
                                await dialogs.alert("Date range is invalid.");
                                return;
                            }

                            if (result.start === null && result.recurrence !== Recurrence.never && result.recurrence !== Recurrence.monthly) {
                                await dialogs.alert("Cannot use this recurrency without a start date.");
                            }

                            resolve(new Template(result));
                            e.target.closest('dialog').close();
                            document.body.removeChild(e.target.closest('dialog'));
                        },
                        'reset': e => {
                            e.preventDefault();
                            resolve(null);
                            e.target.closest('dialog').close();
                            document.body.removeChild(e.target.closest('dialog'));
                        }
                    },
                    children: [
                        { node: "label", text: engine.translate("Name") },
                        { node: "input", name: "name", required: "" },
                        { node: "br" },
                        { node: "label", text: engine.translate("Benefactor") },
                        { node: "input", name: "benefactor" },
                        { node: "br" },
                        {
                            node: "div",
                            class: "input-group",
                            children: [
                                { node: "label", text: engine.translate("Cost"), class: "cost-label" },
                                { node: "span", text: engine.currencySymbol, class: "before" },
                                { node: "input", name: "cost", type: "number", step: "0.01", min: "0", required: "" },
                                { node: "br" }
                            ]
                        },
                        { node: "label", text: engine.translate("Start Date") },
                        { node: "input", name: "start", type: "month", value: document.getElementById('month').value },
                        { node: "br" },
                        { node: "label", text: engine.translate("End Date") },
                        { node: "input", name: "end", type: "month" },
                        { node: "br" },
                        { node: "label", text: engine.translate("Recurrence") },
                        {
                            node: "select",
                            name: "recurrency",
                            children: engine.recurrencies.map(r => { return {
                                node: "option",
                                value: r.id,
                                text: r.name
                            }})
                        },
                        { node: "br" },
                        {
                            node: "label",
                            text: engine.translate("Partial Payments"),
                            children: [
                                { node: "input", name: "partial", type: "checkbox" }
                            ]
                        },
                        { node: "br" },
                        {
                            node: "div",
                            class: "controls",
                            children: [
                                { node: "input", type: "submit", value: engine.translate('Save') },
                                { node: "input", type: "reset", value: engine.translate('Cancel') }
                            ]
                        }
                    ]
                }
            ]
        });

        if (income) {
            dialog.querySelector('h3').innerHTML = engine.translate("Schedule Income");
            dialog.querySelector('.cost-label').innerHTML = engine.translate("Value");

            let partial = dialog.querySelector('[name="partial"]').parentElement;

            partial.parentElement.removeChild(partial.nextSibling);
            partial.parentElement.removeChild(partial);
        }

        document.body.appendChild(dialog);
        dialog.showModal();
    });

    if (template instanceof Template) {
        engine.addOrUpdateTemplate(template);
    }
}));

document.querySelectorAll("#tab-picker a").forEach(e => e.addEventListener("click", e => {
    e.preventDefault();
    if (e.target.classList.contains("active")) {
        return;
    }

    let target = e.target.href.split('#')[1];
    window.location.hash = target;

    document.querySelectorAll("main section").forEach(e => e.setAttribute("hidden", ""));
    document.querySelectorAll("#tab-picker a.active").forEach(e => e.classList.remove('active'));
    e.target.classList.add("active");
    document.getElementById(target).removeAttribute("hidden");
    window.scrollTo(0, 0);
}));

document.querySelectorAll('.benefactor-selector').forEach(e => e.addEventListener("change", e => {
    let value = e.target.value;

    document.querySelectorAll('.benefactor-selector').forEach(e2 => e2.value = value);
    engine.benefactor = value === "" ? null : value;
}));

