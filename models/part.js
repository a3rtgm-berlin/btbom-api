const utils = require('../utils');

module.exports = class Part {
    /**
     * constructs a new Material Object from the csv data
     * All not necessary properties have been commented for potential later use
     * @param {string} d - csv-row as string
     * @param {*} catId - "Material P" of the last INV-row
     * @param {*} catName - "Objektkurztext" of the last INV-row
     */
    constructor (d, catId, catName, arbMatrix, trainsPending) {
        // Keep category from last INV-row
        // this.Kategorie = catName;
        // this.KatID = catId;

        // relevant rows from csv
        this['Part'] = utils.formatPart(d["MaterialP"] || d["MaterialPos."]); // Part# <== FALLBACK IF COLUMN IS NAMED INCONSISTENTLY
        this['Description'] = d["Objektkurztext"]; // Description
        this['Quantity Per Train'] = utils.convertLocaleStringToNumber(d["Menge"]); // Quantity Per Train
        this['Quantity Total'] = this['Quantity Per Train'] * trainsPending; // Total Quantity
        this['Unit'] = d["ME"]; // Unit
        this['ArbPlatz'] = d["ArbPlatz"];
        this['Location'] = d["ArbPlatz"] ? utils.mapMatrix(d["ArbPlatz"], arbMatrix) : "No Location"; // Location
        this['Location Index'] = this['Location'] + this['Part']; // Location Index
        // this.Material = d["MaterialP"]; // Part#
        // this.Objektkurztext = d["Objektkurztext"]; // Description
        // this.MengeProZug = this.convertLocaleStringToNumber(d["Menge"]); // Quantity Per Train
        // this.Menge = this.MengeProZug * trainsPending; // Total Quantity
        // this.ME = d["ME"]; // Unit
        // this.MArt = d["MArt"];
        // this.ArbPlatz = d["ArbPlatz"];
        // this.Station = d["ArbPlatz"] ? this.mapMatrix(d["ArbPlatz"], arbMatrix) : "No Location"; // Location
        // this.id = this.Station + this.Material; // Location Index

        // CHECK FOR MISSING COLUMNS
        let missingCols = [];

        if (!this['Part']) {
            missingCols.push('Material P');
        }
        if (!d['Menge']) {
            missingCols.push('Menge');
        }
        if (!this['Unit']) {
            missingCols.push('ME');
        }

        if (missingCols.length > 0) {
            throw new Error('Following required Columns are undefined: ' + missingCols.join(', ') + '. File is incompatible.');
        }
    }
};
