"use strict";

class Recurrence {
    /**
     * This template never recurs.
     */
    static get never() { return 0; }

    /**
     * This template recurs every month from start to end.
     */
    static get monthly() { return 1; }

    /**
     * This template recurs every two months from start to end.
     */
    static get bimonthly() { return 2; }

    /**
     * This template recurs every three months from start to end.
     */
    static get quarterly() { return 3; }

    /**
     * This template recurs every six months from start to end.
     */
    static get biannually() { return 4; }

    /**
     * This template recurs every twelve months from start to end.
     */
    static get annually() { return 5; }
}

export { Recurrence };