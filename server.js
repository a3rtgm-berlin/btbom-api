// 'use strict';

const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
// const mongoose = require("mongoose");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const session = require("express-session");
const passport = require("passport");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const http = require('http');

// Server Modules
const upload = require('./upload');
const projectHandler = require('./projectsHandler');
const createMaster = require('./createMaster');
const createRpn = require('./createRpn');
const utils = require('./utils');
const auth = require('./authorization');
const verifcation = require('./models/verification');

// Classes
const MovingFile = require('./movingFile');
const MultiBom = require('./multiBom');

// DB Models
const Bom = require("./models/bom");
const Project = require("./models/project");
const MasterBom = require('./models/masterBom');
const User = require("./models/user");
const ExcludeList = require("./models/exclude");
const ArbMatrix = require("./models/matrix");
const RPN = require("./models/rpn");
const Planogram = require("./models/planogram");

// Constants
const HOST = process.env.NODE_ENV === 'development' ? 'localhost' : '0.0.0.0';
const PORT = process.env.NODE_ENV === 'development' ? 8000 : 8080;

// App
const app = express();

// CORS
const corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200,
};

// Expess Session
app.use(session({
    secret:'secret',
    resave: true,
    saveUninitialized: true
}));

//Passport config
require('./passport')(passport);
app.use(passport.initialize());
app.use(passport.session());

// Connect Flash
app.use(flash());

//Global Variables 
app.use((req, res, next) => {
    res.locals.success_msg = req.flash('success_msg');
    res.locals.error_msg = req.flash('error_msg');
    res.locals.error = req.flash('error');
    next();
});

// Connect DB
function connectDB() {
    if (!process.env.DB_DATA) {;
        return console.error('DB credentials are not defined! Please start the app using "env DB_DATA=<user:pwd>".');
    }
    try {
        mongoose.connect('mongodb://' + process.env.DB_DATA + '@api.creative-collective.de:27017/fstnl-bom-mngr-2', { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true })
            .then(() => console.log('successfully connected to DB'));
        // mongoose.connect('mongodb://' + process.env.DB_DATA + '@api.creative-collective.de:27017/fstnl-bom-mngr-test', { useNewUrlParser: true, useFindAndModify: false, useUnifiedTopology: true })
        //     .then(() => console.log('successfully connected to DB'));
    }
    catch (e) {
        console.error(e);
        console.log('Attempt to log into DB failed. Trying again');
        connectDB();
    }
}
connectDB();

// Set server options
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Set routes
app.get('/', (req, res) => {
    User.find((e, data) => {
        console.log(data);
    });
    res.status(200).send("connected");
});

/**
 * @description Handles upload of ArbMatrix files
 * @param {*} file
 * @method POST
 */
app.post('/api/upload/matrix', upload.matrix);
app.post('/api/upload/exclude', upload.excludeList);

/**
 * @description gets the work station matrix
 * @method get
 * @returns {void}
 */
app.get('/api/matrix', (req, res) => auth.guard(req, res, () => {
    ArbMatrix.find((err, data) => {
        if (err) {
            res.sendStatus(404);
            return console.error(err);
        }
        res.send(data[0]);
    });
}));

/**
 * @description gets the exclude list
 * @method GET
 * @returns {void}
 */
app.get('/api/exclude', (req, res) => auth.guard(req, res, () => {
    ExcludeList.find((err, data) => {
        if (err) {
            res.sendStatus(404);
            return console.error(err);
        }
        res.send(data[0]);
    });
}));

/**
 * @description Handles uploaded consumption files
 * @param {*} file the consumption file uploaded
 * @method POST
 * @returns {void}
 */
app.post('/api/upload/consumption/:id', upload.consumption);

/**
 * @description Handles uploaded planogram files
 * @param {*} file the planogram file uploaded
 * @method POST
 * @returns {void}
 */
app.post('/api/upload/planogram/:id', upload.planogram);

/**
 * @description Handles uploaded BOM files
 * @param {*} file the BOM file uploaded
 * @method POST
 * @returns {void}
 */
app.post('/api/upload/bom', upload.bom);

/**
 * @description creates the RPN from the current master and project vals
 * @param id
 * @method get
 */
app.get('/api/rpn/:id', (req, res) => auth.guard(req, res, (role) => {
    const id = req.params.id;

    RPN.findOne({id: id}, (err, rpn) => {
        if (rpn) {
            res.send(rpn);
        } else {
            createRpn(req, res);
        }
    });
}));

app.get('/api/planogram/:type', (req, res) => auth.guard(req, res, () => {
    const type = req.params.type;

    try {
        Planogram.find().sort({updated: -1}).limit(1)
            .then((data) => {
                if (type !== 'all' && data) {
                    return res.json(data[0][type]);
                }
        
                return res.json(data[0]);
            });
    }
    catch (err) {
        res.status(500).send(err);
        return console.error(err);
    }

}));

app.get('/api/planogram/create/master/:id', (req, res) => auth.guard(req, res, async () => {
    const id = req.params.id;
    const matrix = await ArbMatrix.findOne({}).exec();
    const master = await MasterBom.findOne({id: id}).exec();
    const lastPlanogram = await Planogram.findOne({state: 'current'}).exec();
    console.log('stuff retrieved');
    const planogram = master.json.reduce((res, part) => {
        if (!res.find(item => item['Location'] === part['Location'])) {
            const location = matrix.json.find(row => row['Location'] === part['Location']);
            const wagonSize = location ? location.WagonSize : 60;
            const rows = wagonSize / 10;

            for (let i = 1; i <= part['Location Wagons']; i++) {
                for (let j = 1; j <= rows; j++) {
                    for (let k = 1; k <= wagonSize / rows; k++) {
                        const wagon = 'W' + i;
                        const bin = j + '-' + k;
                        let oldPart;
                       
                        if (lastPlanogram) {
                            oldPart = lastPlanogram.planogram.find(oldBin => 
                                oldBin.Wagon === wagon &&
                                oldBin.Bin === bin &&
                                oldBin.Location === part.Location
                            );
                        }

                        res.push({
                            Wagon: 'W' + i,
                            Bin: j + '-' + k,
                            Location: part.Location,
                            Part: oldPart ? oldPart.Part : '',
                            ROQ: oldPart ? oldPart.ROQ : '',
                            isNotOnBOM: ''
                        })
                    }
                }
            }
        }

        return res;
    }, []);

    console.log('creating mapping');
    const mapping = master.json.map(part => {
        const oldPos = lastPlanogram ? lastPlanogram.mapping.find(p => p['Location Index'] === part['Location Index']) : null;
        return {
            Part: part.Part,
            Location: part.Location,
            'Location Index': part['Location Index'],
            'Bin Location': oldPos ? oldPos['Bin Location'] || [] : [],
        }
    });
    
    console.log('saving');
    Planogram.findOneAndUpdate({}, {
        state: 'current',
        mapping: mapping,
        planogram: planogram,
        updated: new Date(),
    }, {
        upsert: true,
        new: true,
    }, (err, data) => {
        if (err) {
            res.sendStatus(500);
            console.error(err);
        }
        else {
            master.planogram = true;
            master.save();
            Planogram.findOneAndDelete({state: 'last'}, (err, data) => {
                console.log('oldest planogram deleted');
                if (lastPlanogram) {
                    lastPlanogram.state = 'last';
                    lastPlanogram.save((err, data) => {
                        console.log('old planogram updated');
                    });
                }
            });

            res.status(201).json(data);
            console.log(`Planogram ${id} created`);
        }
    });
}));

/**
 * @description todo
 * @param
 * @method
 */
app.get('/api/master/create/:id', createMaster);

/**
 * @description rebuilds the current master by ID
 * @param id the ID string of the current month
 * @method get
 */
app.get('/api/master/rebuild/:id', (req, res) => auth.guard(req, res, (role) => {
    if (role > 1) return res.sendStatus(401);

    const q = req.params.id;

    RPN.findOneAndDelete({id: q}, () => { console.log(`RPN ${q} deleted`)});
    Planogram.findOneAndDelete({id: q}, () => { console.log(`Planogram ${q} deleted`)});
    MasterBom.findOneAndDelete({id: q}, (err) => {
        if (err) {
            res.sendStatus(404);
            return console.error(err);
        }
        Bom.find({id: { $regex: q, $options: 'i' }}, (err, boms) => {
            utils.updateExcludesAndMatrix(boms).then(success => {
                if (success) {
                    createMaster(req, res);
                }
            });
        });
    });
}));

/**
 * @description todo
 * @param
 * @method
 */
app.get('/api/master', (req, res) => {
    MasterBom.find((err, data) => {
        if (err) throw err;
        if (data) return res.status(200).send(
            [data.sort((a, b) => {
                if (a.id < b.id) return 1;
                return -1;
            })[0]]
        );
        res.sendStatus(404);
    });
});

/**
 * @description todo
 * @param
 * @method
 */
app.get('/api/master/id', (req, res) => {
    MasterBom.find((err, data) => {
        if (err) throw err;
        if (data.length > 0) return res.status(200).send(
            [data.map(d => d.id).sort((a, b) => {
                if (a < b) return 1;
                return -1;
            })[0]]
        );
        res.status(200).send(['0000-00']);
    });
});

/**
 * @description returns all created Master BOMs
 * @todo ... for a selected project?
 * @returns {Bom[]}
 */
app.get('/api/master/all', (req, res) => auth.guard(req, res, () => {
    MasterBom.find((err, data) => {
        if (err) {
            res.sendStatus(500);
            return console.error(err);
        }
        res.send(data.map(master => ({
            id: master.id,
            movingFile: master.movingFile ? master.movingFile.meta.last : '-',
            date: master.date,
            projects: master.projects
        })));
    });
}));

/**
 * @description returns one selected list by date
 * @todo ... and project
 * @returns {Bom}
 */
app.get('/api/master/get/:id', (req, res) => auth.guard(req, res, () => {
    const q = req.params.id;

    MasterBom.findOne({id: q}, (err, data) => {
        if (err) return console.error(err);
        res.send(data);
    });
}));

/**
 * @description deletes a master by id
 * @todo ... and project
 * @returns {Bom}
 */
app.delete('/api/master/delete/:id', (req, res) => auth.guard(req, res, (role) => {
    if (role > 1) return res.sendStatus(401);

    const q = req.params.id;

    MasterBom.findOneAndDelete({id: q}, (err) => {
        if (err) {
            res.sendStatus(404)
            return console.error(err);
        }
        res.status(204).send('deleted');
    });
}));

/**
 * @description returns all uploaded BOM Lists
 * @todo ... for a selected project?
 * @returns {[Bom]}
 */
app.get('/api/lists', (req, res) => auth.guard(req, res, () => {
    Bom.find((err, data) => {
        if (err) return console.error(err);
        res.send(data);
    });
}));

/**
 * @description returns one selected list by date
 * @todo ... and project
 * @returns {Bom}
 */
app.get('/api/lists/:id', (req, res) => auth.guard(req, res, () => {
    const q = req.params.id;

    Bom.findOne({id: q}, (err, data) => {
        if (err) return console.error(err);
        res.send(data);
    });
}));

/**
 * @description deletes a list by ID (Project + Date)
 * @todo ... and project
 * @returns {void}
 */
app.delete('/api/lists/:id', (req, res) => auth.guard(req, res, (role) => {
    if (role > 2) return res.sendStatus(401);

    const q = req.params.id;

    if (q === 'delete-all') {
        Bom.deleteMany({}, (err) => {
            if (err) return console.error(err);
            res.sendStatus(204);
        })
    } else {
        Bom.findOneAndDelete({id: q}, (err) => {
            if (err) return console.error(err);
            console.log(q + ' deleted.');
    
            Project.findOne({tag: q.slice(0, q.indexOf('-'))}, (err, data) => {
                if (err) return console.error(err);
                
                if (data) {
                    data.boms = data.boms.filter(id => id !== q);
                    data.save();
                }
            });
    
            res.sendStatus(204);
        });
    }
}));

/**
 * @description returns all metas for the boms of a a project
 */
app.get('/api/project/meta/:tag', (req, res) => auth.guard(req, res, () => {
    const q = req.params.tag;

    Bom.find({project: q}, (err, boms) => {
        if (err) {
            res.sendStatus(500);
            return console.error(err);
        }
        const meta = boms.map(bom => {
            return {
                id: bom.id,
                name: bom.name,
                project: bom.project,
                date: bom.date,
                uploadDate: bom.uploadDate
            }
        });
        res.send(meta);
    });
}));

/**
 * @description returns all metas for a single bom
 */
app.get('/api/lists/meta/:id', (req, res) => auth.guard(req, res, () => {
    const q = req.params.id;

    Bom.findOne({id: q}, (err, bom) => {
        if (err) {
            res.sendStatus(500);
            return console.error(err);
        }
        res.send({
            id: bom.id,
            name: bom.name,
            project: bom.project,
            date: bom.date,
            uploadDate: bom.uploadDate
        });
    });
}));

/**
 * @description rebuilds a given project BOM file with the updated project values
 * @param {String} id the bom id
 * @returns {void}
 */
app.get('/api/lists/update/:id', (req, res) => auth.guard(req, res, (role) => {
    const q = req.params.id;

    Bom.findOne({id: q}, (err, bom) => {
        if (err) {
            res.sendStatus(404);
            return console.error(err);
        }
        utils.updateSingleBom(bom, res);
    });
}));

/**
 * @description overrides a list by date
 * @todo ... and project
 * @returns {void}
 */
app.put('/api/lists/:id', (req, res, next) => {
    const q = req.params.id,
        body = req.body;

    Bom.findOneAndUpdate({id: q}, req.body, (err) => {
        res.send(200);
    });
});

app.post('/api/lists/multibom', (req, res) => {
    Bom.find({id: {$in: req.body.lists}}, (err, data) => {
        if (err) {
            res.send(503);
            return console.error(err);
        }

        if (data) {
            const multiBom = new MultiBom(data);
            const dbModel = new Bom(multiBom.bom);
            dbModel.save((err) => {
                if (err) {
                    console.error(err);
                    res.sendStatus(500);
                }
        
                Project.findOne({tag: multiBom.bom.project}, (err, project) => {
                    if (err) throw err;
                    if (project) {
                        project.boms = project.boms.filter(id => !req.body.lists.includes(id));
                        project.boms.push(multiBom.bom.id);
                        project.save();
                    }
                });
            });

            res.status(201).send('updated');
        }
    });
});

app.post('/api/projects/:tag', (req, res, next) => {
    const q = req.params.tag

    Project.findOneAndUpdate({tag: q}, req.body, (err, data) => {
        if (err) {
            res.send(418);
        } else {
            res.sendStatus(200);
        }
    });
});


app.post('/api/newuser/', (req, res, next) => {
    const q = req.params.username;

    User.findOne({username: q}, req.body, (err, data) => {
        if(err) {
            return res.send(418);
        } 
        
        if (!data) {
            var validUserData = new User(req.body);
            validUserData.save()
            res.status(200).send(true);
        } else {
            console.log("User with name" + q + "is already exisiting");
            res.status(200).send(false);
        }
    });
});

app.post('/api/token/verify', (req, res) => {
    if (req.body.token) {
        const decoded = jwt.verify(req.body.token, verifcation.privateKey, verifcation.verifyOptions, (err, decoded) => {
            if (err) return res.status(401).send(false);
            return res.status(200).send(true);
        });
    } else {
        return res.status(204).send(false);
    }
});

app.post('/api/users/authenticate', passport.authenticate('local', {
    successMessage: 'you are now logged in',
    failureMessage: 'something went wrong',
    failureFlash: true
}), (req, res) => {
    let token = jwt.sign({
        "role": req.user.role,
    }, verifcation.privateKey, {
        expiresIn: '3h',
        algorithm: 'HS512',
        header: {
            alg: "HS512",
            typ: "JWT"
        }
    });

    res.json({
        success: true,
        token: token,
        user: {
            id:req.user._id,
            username: req.user.username,
            role: req.user.role
        }
    })
});

/**
 * @description manually adds a list (not necessary?)
 */
app.post('/api/lists', (req, res, next) => {
    const dbModel = new Bom(data);
    
    res.send(201, dbModel);
});

// /**
//  * @description compares two lists from DB and returns the result
//  * @param {string} id1
//  * @param {string} id2
//  * @returns {MovingFile}
//  */
// app.get('/api/master/compare/:id1/:id2', (req, res, next) => {
//     const q = req.params;
//     let movingFile;

//     MasterBom.find({id: {$in: [q.id1, q.id2]}}, (err, data) => {
//         if (err) return console.error(err);
//         movingFile = new MovingFile(data);
//         res.send(movingFile);
//     });
// });

/**
 * @description adds a project by form data
 * @returns {void}
 */
app.post('/api/projects', projectHandler.newProject);

/**
 * @description returns all projects from DB
 * @returns {[Project]}
 */
app.get('/api/projects', (req, res) => auth.guard(req, res, () => {
    Project.find((err, data) => {
        if (err) {
            res.sendStatus(418);
            return console.error(err);
        }
        res.send(data);
    });
}));

app.get('/api/allusers', (req, res, next) => {
    User.find((err, data) => {
        if (err) {
            res.sendStatus(418);
            return console.error(err);
        }
        res.send(data);
    }); 
})

/**
 * @description returns a projects by name
 * @returns {Project}
 */
app.get('/api/projects/:tag', (req, res, next) => {
    const q = req.params.tag;

    Project.findOne({tag: q}, (err, data) => {
        if (err) return console.error(err);
        res.send(data);
    });
});

/**
 * @description deletes project by name including all its BOM files
 * @returns {void}
 */
app.delete('/api/projects/:tag', (req, res, next) => {
    const q = req.params.tag;

    if (q === 'delete-all') {
        Project.deleteMany({}, (err) => {
            if (err) return console.error(err);
            res.sendStatus(204);
        });
    } else {
        Project.findOne({tag: q}, (err, data) => {
            if (err) return console.error(err);
            if (data) {
                data.boms.forEach((list) => {
                    Bom.findOneAndDelete({id: list}, (err) => {
                        if (err) return console.error(err);
                    });
                });
                data.remove();
                console.log(q + ' deleted.');
                return res.sendStatus(204);
            }
            res.sendStatus(404);
        });
    }
});

app.delete('/api/users/:username', (req, res, next) => {
    const q = req.params.username;
    console.log(q);
    User.findOneAndDelete({username: q}, (err) => {
        if(err) {
            res.sendStatus(418);
            return console.error(err);
        }
    });
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);