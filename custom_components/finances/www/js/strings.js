"use strict";

const internal = Symbol("internal");
const DEBUG = true;

class ITranslate {
    /**
     * Attempt to translate the provided text into the users language.
     *
     * @param {String} string
     * @param {...String} placeholders
     */
    translate(string, ...placeholders) {
        placeholders.forEach((value, index) => string = string.replace(new RegExp('\\{' + index + '\\}', 'gi'), value));
        return string;
    }

    /**
     * Format the provided number based on the current Storage set locale and currency.
     *
     * @param {Number} amount
     */
    formatCurrency(amount) {
        throw new Error("Not implemented.");
    }
}

class Strings {
    static get currencies() {
        return [
            { code: "EUR", name: "Euroes" },
            { code: "USD", name: "US Dollars" },
            { code: "GBP", name: "British Pounds" }
        ]
    }

    static get locales() {
        return Object.keys(Strings[internal]).map(prop => {
            return { locale: prop, name: "" + Strings[internal][prop]["__NAME__"] };
        });
    }

    /**
     * Try to translate the provided text into the locale.
     *
     * Returns original value if the locale doesn't have a translation.
     *
     * @param {String} locale
     * @param {String} string
     *
     * @returns {String}
     */
    static tryTranslate(locale, string) {
        if (Strings[internal][locale] !== undefined && Strings[internal][locale][string] !== undefined) {
            return Strings[internal][locale][string];
        } else if (DEBUG) {
            console.warn(`${locale} is missing a translation for "${string}".`);
            return "$" + string;
        } else {
            return string;
        }
    }
}

Strings[internal] = {
    "en-GB": {
        "__CURRENCY__": "GBP",
        "__NAME__": "English (UK)",
        "Finances": "Finances",
        "Overview": "Overview",
        "Settings": "Settings",
        "Payments": "Payments",
        "Month": "Month",
        "Expected": "Expected",
        "Paid": "Paid",
        "Remaining": "Remaining",
        "Pending Bills": "Pending Bills",
        "Name": "Name",
        "Budgetted": "Budgeted",
        "Expected": "Expected",
        "Received": "Received",
        "Unexpected Income": "Unexpected Income",
        "Paid Bills": "Paid Bills",
        "Expected Cost": "Expected Cost",
        "Actual Cost": "Actual Cost",
        "Undo": "&#9100;",
        "Pay": "&#128176;",
        "Ignore": "&#10060;",
        "Cancel": "Cancel",
        "Total cost:": "Total cost:",
        "Total received:": "Total received:",
        // {0} = name of bill.
        "Close the {0} bill?": "Close the {0} bill?",
        // {0} = name of bill.
        "Ignore {0} for this cycle?": "Ignore {0} for this cycle?",
        "Language:": "Language:",
        "Planned Income": "My Income",
        "Unexpected Bill": "Unexpected Bill",
        "Schedule Bill": "Schedule Bill",
        "Schedule Income": "Schedule income",
        "Currency:": "Currency:",
        "Switch to local currency {0}?": "Switch to local currency {0}?",
        "Create Backup": "Create Backup",
        "Restore Backup": "Restore Backup",
        "Please provide a password:": "Please provide a password:",
        "Your browser doesn't support encryption": "Your browser doesn't support encryption",
        "Export failed: {0}.": "Backup failed: {0}.",
        "Import failed: {0}.": "Restore failed: {0}.",
        "Restoring a backup will overwrite your existing data, continue?": "Restoring a backup will overwrite your existing data, continue?",
        "Backup password:": "Backup password:",
        "Invalid backup password": "Invalid backup password",
        "Invalid backup selected": "Invalid backup selected",
        "Close": "Close",
        "Yes": "Yes",
        "No": "No",
        "Okay": "Okay",
        "Cost": "Cost",
        "Start Date": "Start Date",
        "End Date": "End Date",
        "Recurrence": "Recurrence",
        "Never": "Never",
        "Monthly": "Monthly",
        "Bi-Monthly": "Bi-Monthly",
        "Quarterly": "Quarterly",
        "Bi-Annually": "Bi-Annually",
        "Annually": "Annually",
        "Save": "Save",
        "Edit": "&#128393;",
        "Partial Payments": "Partial Payments",
        "Edit Schedule": "Edit Schedule",
        "Delete": "Delete",
        "Are you sure you want to delete {0} and all it's payment history?": "Are you sure you want to delete {0} and all it's payment history?",
        "You must provide a valid amount.": "You must provide a valid amount.",
        "No pending bills!": "No open bills.",
        "No pending income!": "No expected income.",
        "No paid bills!": "No paid bills.",
        "Undo this payment?": "Undo this payment?",
        "Select payment to cancel.": "Select payment to cancel.",
        "{0} is made of multiple sub-payments, please select which you want to cancel.": "{0} is made of multiple sub-payments, please select which you want to cancel.",
        "Re-open": "Re-open",
        "Data restored successfully (v{0}).": "Data restored successfully (v{0}).",
        "Backups": "Backups",
        "All backups are encrypted with 256 bit AES-GCM encryption. You must provide a minimum 6 character password.": "All backups are encrypted with 256 bit AES-GCM encryption. You must provide a minimum 6 character password.",
        "Please keep your backup passwords safe, they are not stored anywhere and your backup is useless without it.": "Please keep your backup passwords safe, they are not stored anywhere and your backup is useless without it.",
        "Remaining Budget":  "Remaining Budget",
        "Excess Payment Margin:": "Excessive Payments:",
        "Value": "Value",
        "Please enter a date in the format: YYYY-MM.": "Please enter a date in the format: YYYY-MM.",
        "Password must be at least {0} characters.": "Password must be at least {0} characters.",
        "Please provide a filename:": "Please provide a filename:",
        "Please provide a valid backup name.": "Please provide a valid backup name.",
        "Offline mode is not available.": "Offline mode is not available.",
        "Benefactor": "Benefactors",
        "All Benefactors": "All Benefactors",
        "Statistics": "Statistics",
        "Start Range": "Start Range",
        "End Range": "End Range",
        "Scheduled Only": "Scheduled only",
        "Expenses by Month": "Expenses by Month",
        "Expenses by Category": "Expenses by Category",
        "Summarise Small": "Group small payments",
        "Other Payments": "Other Payments"
    },
    "en-US": {
        "__CURRENCY__": "USD",
        "__NAME__": "English (US)",
        "Finances": "Finances",
        "Overview": "Overview",
        "Settings": "Settings",
        "Payments": "Payments",
        "Month": "Month",
        "Expected": "Expected",
        "Paid": "Paid",
        "Remaining": "Remaining",
        "Pending Bills": "Pending Bills",
        "Name": "Name",
        "Budgetted": "Budgeted",
        "Expected": "Expected",
        "Received": "Received",
        "Unexpected Income": "Unexpected Income",
        "Paid Bills": "Paid Bills",
        "Expected Cost": "Expected Cost",
        "Actual Cost": "Actual Cost",
        "Undo": "&#9100;",
        "Pay": "&#128176;",
        "Ignore": "&#10060;",
        "Cancel": "Cancel",
        "Total cost:": "Total cost:",
        "Total received:": "Total received:",
        // {0} = name of bill.
        "Close the {0} bill?": "Close the {0} bill?",
        // {0} = name of bill.
        "Ignore {0} for this cycle?": "Ignore {0} for this cycle?",
        "Language:": "Language:",
        "Planned Income": "My Income",
        "Unexpected Bill": "Unexpected Bill",
        "Schedule Bill": "Schedule Bill",
        "Schedule Income": "Schedule income",
        "Currency:": "Currency:",
        "Switch to local currency {0}?": "Switch to local currency {0}?",
        "Create Backup": "Create Backup",
        "Restore Backup": "Restore Backup",
        "Please provide a password:": "Please provide a password:",
        "Your browser doesn't support encryption": "Your browser doesn't support encryption",
        "Export failed: {0}.": "Backup failed: {0}.",
        "Import failed: {0}.": "Restore failed: {0}.",
        "Restoring a backup will overwrite your existing data, continue?": "Restoring a backup will overwrite your existing data, continue?",
        "Backup password:": "Backup password:",
        "Invalid backup password": "Invalid backup password",
        "Invalid backup selected": "Invalid backup selected",
        "Close": "Close",
        "Yes": "Yes",
        "No": "No",
        "Okay": "Okay",
        "Cost": "Cost",
        "Start Date": "Start Date",
        "End Date": "End Date",
        "Recurrence": "Recurrence",
        "Never": "Never",
        "Monthly": "Monthly",
        "Bi-Monthly": "Bi-Monthly",
        "Quarterly": "Quarterly",
        "Bi-Annually": "Bi-Annually",
        "Annually": "Annually",
        "Save": "Save",
        "Edit": "&#128393;",
        "Partial Payments": "Partial Payments",
        "Edit Schedule": "Edit Schedule",
        "Delete": "Delete",
        "Are you sure you want to delete {0} and all it's payment history?": "Are you sure you want to delete {0} and all it's payment history?",
        "You must provide a valid amount.": "You must provide a valid amount.",
        "No pending bills!": "No open bills.",
        "No pending income!": "No expected income.",
        "No paid bills!": "No paid bills.",
        "Undo this payment?": "Undo this payment?",
        "Select payment to cancel.": "Select payment to cancel.",
        "{0} is made of multiple sub-payments, please select which you want to cancel.": "{0} is made of multiple sub-payments, please select which you want to cancel.",
        "Re-open": "Re-open",
        "Data restored successfully (v{0}).": "Data restored successfully (v{0}).",
        "Backups": "Backups",
        "All backups are encrypted with 256 bit AES-GCM encryption. You must provide a minimum 6 character password.": "All backups are encrypted with 256 bit AES-GCM encryption. You must provide a minimum 6 character password.",
        "Please keep your backup passwords safe, they are not stored anywhere and your backup is useless without it.": "Please keep your backup passwords safe, they are not stored anywhere and your backup is useless without it.",
        "Remaining Budget":  "Remaining Budget",
        "Excess Payment Margin:": "Excessive Payments:",
        "Value": "Value",
        "Please enter a date in the format: YYYY-MM.": "Please enter a date in the format: YYYY-MM.",
        "Password must be at least {0} characters.": "Password must be at least {0} characters.",
        "Please provide a filename:": "Please provide a filename:",
        "Please provide a valid backup name.": "Please provide a valid backup name.",
        "Offline mode is not available.": "Offline mode is not available.",
        "Benefactor": "Benefactors",
        "All Benefactors": "All Benefactors",
        "Statistics": "Statistics",
        "Start Range": "Start Range",
        "End Range": "End Range",
        "Scheduled Only": "Scheduled only",
        "Expenses by Month": "Expenses by Month",
        "Expenses by Category": "Expenses by Category",
        "Summarise Small": "Group small payments",
        "Other Payments": "Other Payments"
    },
    "nl-NL": {
        "__CURRENCY__": "EUR",
        "__NAME__": "Nederlands",
        "Finances": "Finances",
        "Overview": "Overzicht",
        "Settings": "Instellingen",
        "Payments": "Betaalingen",
        "Month": "Maand",
        "Expected": "Verwacht",
        "Paid": "Betaald",
        "Remaining": "Resterende",
        "Pending Bills": "Te betalen",
        "Name": "Naam",
        "Budgetted": "Begroot",
        "Expected": "Expected",
        "Received": "Ontvangen",
        "Unexpected Income": "Onverwacht Inkomen",
        "Paid Bills": "Betaalde",
        "Expected Cost": "Verwachte kosten",
        "Actual Cost": "Werkelijke kosten",
        "Undo": "&#9100;",
        "Pay": "&#128176;",
        "Ignore": "&#10060;",
        "Cancel": "Annuleren",
        "Total cost:": "Totale kosten:",
        "Total received:": "Totaal ontvangen:",
        // {0} = name of bill.
        "Close the {0} bill?": "Sluit de factuur {0}?",
        // {0} = name of bill.
        "Ignore {0} for this cycle?": "{0} negeren voor deze cyclus?",
        "Language:": "Taal:",
        "Planned Income": "Betaalingen",
        "Unexpected Bill": "Onverwachte kost",
        "Schedule Bill": "Plan nieuwe betaling",
        "Schedule Income": "Plan nieuwe inkomst",
        "Currency:": "Valuta:",
        "Switch to local currency {0}?": "Overschakelen naar lokale valuta {0}?",
        "Create Backup": "Back-up maken",
        "Restore Backup": "Back-up terugzetten",
        "Please provide a password:": "Kies een wachtwoord:",
        "Your browser doesn't support encryption": "Uw browser ondersteund encryptie niet",
        "Export failed: {0}.": "Back-up mislukt: {0}.",
        "Import failed: {0}.": "Herstel mislukt: {0}.",
        "Restoring a backup will overwrite your existing data, continue?": "Als u een back-up herstelt, worden uw bestaande gegevens overschreven, gaat u verder?",
        "Backup password:": "Backup wachtwoord:",
        "Invalid backup password": "De back-up wachtwoord klopt niet",
        "Invalid backup selected": "Ongeldige back-up geselecteerd",
        "Close": "Sluiten",
        "Yes": "Ja",
        "No": "Nee",
        "Okay": "Okay",
        "Cost": "Kosten",
        "Start Date": "Vanaf",
        "End Date": "t/m",
        "Recurrence": "Herhaling",
        "Never": "Nooit",
        "Monthly": "Maandelijks",
        "Bi-Monthly": "Tweemaandelijks",
        "Quarterly": "Per kwartaal",
        "Bi-Annually": "Tweejaarlijks",
        "Annually": "Jaarlijks",
        "Save": "Opslaan",
        "Edit": "&#128393;",
        "Partial Payments": "In delen betaalen",
        "Edit Schedule": "Betaling wijzigen",
        "Delete": "Verwijder",
        "Are you sure you want to delete {0} and all it's payment history?": "Weet u zeker dat u {0} en als zijn betalingsgeschiedenis wilt verwijderen?",
        "You must provide a valid amount.": "Dit is geen geldige valuta.",
        "No pending bills!": "Geen openstaand betalingen.",
        "No pending income!": "Geen openstaand inkomsten.",
        "No paid bills!": "Geen betaald betalingen.",
        "Undo this payment?": "Verwijder dit betaaling?",
        "Select payment to cancel.": "Kies een betaaling om te verwijderen.",
        "{0} is made of multiple sub-payments, please select which you want to cancel.": "{0} is gemaakt van meerdere subbetalingen. Selecteer wat u wilt annuleren.",
        "Re-open": "Heropenen",
        "Data restored successfully (v{0}).": "Uw gegevens zijn succesvol hersteld (v{0}).",
        "Backups": "Back-ups",
        "All backups are encrypted with 256 bit AES-GCM encryption. You must provide a minimum 6 character password.": "Alle back-ups zijn gecodeerd met 256-bits AES-GCM-codering. U moet een wachtwoord van minimaal 6 tekens opgeven.",
        "Please keep your backup passwords safe, they are not stored anywhere and your backup is useless without it.": "Bewaar uw back-upwachtwoorden veilig, ze worden nergens opgeslagen en uw back-up is onbruikbaar zonder deze.",
        "Remaining Budget": "Resterende",
        "Excess Payment Margin:": "Te veel betalingspercentage:",
        "Value": "Valuta",
        "Please enter a date in the format: YYYY-MM.": "Voer een datum in met het volgende formaat: JJJJ-MM.",
        "Password must be at least {0} characters.": "Wachtwoord moet ten minste {0} tekens bevatten.",
        "Please provide a filename:": "Kies en bestandsnaam:",
        "Please provide a valid backup name.": "Dit is geen geldige bestandsnaam",
        "Offline mode is not available.": "Offline-modus is niet beschikbaar.",
        "Benefactor": "Bij betrokken",
        "All Benefactors": "Allemaal",
        "Statistics": "Statistieken",
        "Start Range": "Begin datum",
        "End Range": "Einddatum",
        "Scheduled Only": "Allen geplanned",
        "Expenses by Month": "Uitgaven per maand",
        "Expenses by Category": "Uitgaven per categorie",
        "Summarise Small": "Groep kleine betalingen",
        "Other Payments": "Andere betaalingen"
    },
}

export { Strings, ITranslate };