const Bom = require("./models/bom");
const MasterBom = require('./models/masterBom');
const MovingFile = require('./movingFile');
const ArbMatrix = require('./models/matrix');
const Planogram = require('./models/planogram');


const createMasterBom = function (req, res) {
    const id = req.params.id;

    Bom.find({id: { $regex: id, $options: 'i' }}, async (err, boms) => {
        if (err) {
            res.sendStatus(500);
            return console.error(err);
        }

        const newMaster = await combineLists(
            boms.map((bom) => bom.json.map((mat) => {
                mat.Boms = [bom.id];
                return mat;
            })),
            id,
            boms[0].date,
            boms.map(list => list.project));
        const dbModel = new MasterBom(newMaster);

        MasterBom.findOne({id: {$lt: id}}).sort({id: -1}).exec(async (err, lastMaster) => {
            if (err) {
                res.sendStatus(404);
                return console.error(err);
            }

            if (lastMaster) {
                const planogram = await Planogram.findOne({state: 'current'}).exec();

                // console.log(planogram.updated);
                if (lastMaster.id < id) {
                    let compare = new Promise((res, rej) => {
                        res(new MovingFile(dbModel, planogram ? {
                            json: planogram.mapping.filter(p => !p.isNotOnPOG),
                            id: `Planogram ${planogram.updated}`
                        } : lastMaster));
                    });
                    const movingFile = await compare;
                    dbModel.movingFile = movingFile;
                }
            }

            dbModel.save((err) => {
                if (err) {
                    res.sendStatus(500);
                    return console.error(err);
                }

                res.status(201).send([id]);
            });
        });
    });
};

async function combineLists(boms, id, date, projectTags) {
    var masterList = new Set([].concat(...boms));

    masterList.forEach((mat1, e1, i) => {
        masterList.forEach((mat2, e2, j) => {
            if (mat1.Location === mat2.Location && mat1.Part == mat2.Part && mat1.Boms[0] !== mat2.Boms[0]) {
                mat1['Quantity Total'] += mat2['Quantity Total'];
                mat1.Boms.push(mat2.Boms[0]);
                masterList.delete(mat2);
            }
        });
    });

    masterList = await calculateCarts(masterList);

    return {
        id: id,
        projects: projectTags,
        json: Array.from(masterList),
        movingFile: {},
        date: date,
        uploadDate: new Date(),
        rpn: false,
        planogram: false
    };
}

async function calculateCarts(list) {
    var locations, arbMatrix;

    arbMatrix = await ArbMatrix.findOne({}).exec();
    locations = Array.from(list).reduce((res, item) => {
        const location = res.find(el => el.Location === item.Location);

        if (location) {
            location.parts += 1;
            return res;
        } else {
            const newLocation = {
                Location: item.Location,
                parts: 1,
                wagons: 1,
                bins: 2
            }
            return [...res, newLocation];
        }
    }, [])
    locations.forEach(location => {
        const locationFromMatrix = arbMatrix.json.find(stat => stat.Location === location.Location);
        const wagonSize = locationFromMatrix ? locationFromMatrix.WagonSize : 60;

        location.wagons = Math.ceil(location.parts / wagonSize);
        location.bins = location.parts * 2;
    });

    list.forEach((mat1, e1, i) => {
        mat1['Location Parts'] = null;
        mat1['Location Wagons'] = null;
        mat1['Location Bins'] = null;

        if (mat1.location !== "No Location") {
            const location = locations.find(location => location.Location === mat1.Location);

            if (location) {
                mat1['Location Parts'] = location.parts;
                mat1['Location Wagons'] = location.wagons;
                mat1['Location Bins'] = location.bins;
            }
        }
    });
    
    return list;
}

module.exports = createMasterBom;