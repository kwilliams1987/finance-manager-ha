# THIS CODE IS BROKEN

This addon is in development, and is not fit for use yet.

You have been warned.

# Home Assistant Finances

This is a port of my Finances Manager progressive web app, bundled as an addon to Home Assistant.

It functionals mostly the same, except it stores the account data on the Homee Assistant instance as an SQLite database using Home Assistant's login as implicit authentication.

This means the data is "synced" to any device which can access the Home Assistant instance.

Select a scheduled bill name in the Pending Bills or Paid Bills tab to view monthly totals of its recorded payments and a smoothed trend line. Partial payments are combined by month; previous changes to a scheduled amount are not available as history.

The **Expensive Bills** tab lists scheduled bills that were paid over the configured excess-payment threshold in every observed payment month, requiring at least two observed months within the six-month window ending on the selected month. Months without a payment are not observations. Bills are sorted by average percentage over the scheduled amount; the total overrun column shows the sum of actual payments minus their scheduled amounts across those observed months, formatted in the configured currency.

## AI code disclosure

Much of this project's porting infrastructure was done with the assistance of an LLM, make of that what you will.