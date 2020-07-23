const IncomingForm = require('../node_modules/formidable').IncomingForm;
const Project = require("./models/project");

const newProject = function(req, res, next) {
    let form = new IncomingForm();

    form.parse(req, (err, fields) => {
        if (err) return console.error(err);
        if (fields) {
            const dbModel = new Project(fields);
            dbModel.save();

            res.status(201).send([fields]);
        } else {
            res.sendStatus(500);
        }
    });
};

const getTrainsRemaining = async function (projectTag) {
    const getProject = Promise.resolve(Project.findOne({tag: projectTag}));
    const project = await getProject;
    const totalDuration = project.deadline - project.created;
    const remainingDuration = project.deadline - new Date();
    const percentRemaining = remainingDuration / totalDuration;
    const trainsRemaining = Math.ceil(project.trainsCount * percentRemaining);

    return trainsRemaining;
};

const getTrainsCount = async function (projectTag) {
    const getProject = Promise.resolve(Project.findOne({tag: projectTag}));
    const project = await getProject;

    return project.trainsCount;
}

module.exports = { newProject, getTrainsRemaining, getTrainsCount };