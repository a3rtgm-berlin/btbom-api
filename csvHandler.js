const d3 = require('../node_modules/d3');
const ArbMatrix = require('./models/matrix');
const ExcludeList = require('./models/exclude');
const Part = require('./models/part');
const dsv = d3.dsvFormat(";");
const getTrainsRemaining = require('./projectsHandler').getTrainsRemaining;
const getTrainsCount = require('./projectsHandler').getTrainsCount;

async function csvToJson (csv, project) {
    var trainsPending = await getTrainsCount(project),
        arbMatrix = await ArbMatrix.findOne({}).exec(),
        excludeList = await ExcludeList.findOne({}).exec();

    const json = dsv.parse(csv, (d) => {
        return filterData(d, arbMatrix.json, excludeList.exclude, trainsPending);
    });

    return json.reduce((cleanJson, part) => {
        match = cleanJson.find(_part => _part['Location Index'] === part['Location Index']);
        if (match) {
            match['Quantity Total'] += part['Quantity Total'];
            match['Quantity Per Train'] += part['Quantity Per Train'];
            return cleanJson;
        } else {
            return [...cleanJson, part];
        }
    }, []);
}

function filterData (d, arbMatrix, excludeList, trainsPending) {
    var catId = "",
        catName = "";

    if (d.ArbPlatz === "INV") {
        catId = d["MaterialP"];
        catName = d["Objektkurztext"];
    } else {
        if (!excludeList.map(row => row.Part).includes(d["MaterialP"])) {
            if (d.SchGut === "X") {
                if (d.MArt === "ROH" || d.MArt === "HALB") {
                    return new Part(d, catId, catName, arbMatrix, trainsPending);
                }
            }
        }
    }
    return;
}

module.exports = { csvToJson };