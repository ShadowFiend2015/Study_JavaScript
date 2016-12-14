//npm: co, colors, commander, mongodb
#!/usr/bin/env node
const MongoClient = require('mongodb').MongoClient,
      assert = require('assert'),
      fs = require('fs'),
      co = require('co'),
      colors = require('colors'),
      program = require('commander');

program
    .version('1.0.0')
    .option('-i, --integer <n>', 'The number of performances you want to dump', parseInt)
    .option('-t, --time <time>', '[required] The start time of dumping')
    .option('-u, --url <url>', '[required] The url of the MongoDB to connect to')
    .option('-f, --file <file>', '[required] The name of output file')
    .parse(process.argv);

function make_red(txt) {
    return colors.red(txt); //display the help text in red on the console
}

function getPerformancePromise(db, startTime, performanceNumbers) {
    return new Promise(function (resolve, reject) {
        db.collection('Performances').find({"updatedAt": {$gt: startTime}}, {limit: performanceNumbers})
            .sort({"updatedAt": 1}).toArray((err, performanceList) => {
            if (err)
                reject(err);
            else
                resolve(performanceList);
        });
    });
}

function getSensorDataPromise(db, performance) {
    return new Promise(function (resolve, reject) {
       db.collection('SensorDatas').findOne({_id: performance.sensorDataId}, {}, function(err, sensorData) {
           if (err)
               reject(err);
           else {
               delete performance.sensorDataId;
               performance.sensorData = sensorData;
               resolve(performance);
           }
       });
    });
}

function getResult(db, performanceList) {
    let promiseList = [];
    for(let i of performanceList)
        promiseList.push(getSensorDataPromise(db, i));
    return Promise.all(promiseList);
}

// url = 'mongodb://localhost:3001/meteor';
function connectMongoClient(url) {
    return new Promise(function (resolve, reject) {
        MongoClient.connect(url, function (err, db) {
            if (err)
                reject(err);
            else
                resolve(db);
        })
    })
}

function *makePerformances() {
    let performanceNumbers = program.integer || null,
        startTime = new Date(program.time),
        outputFile = program.file,
        url = program.url,
        db = undefined;
    try {
        if (outputFile === undefined || outputFile === null || url === null || program.time === undefined) {
            program.outputHelp(colors.red);
            throw new Error("Please read Options and input the required items!");
        }
        if (isNaN((startTime).getTime()))
            throw new Error("Check the format of the start time you've just inputted!");
        db = yield connectMongoClient(url);
        let performanceList = yield getPerformancePromise(db, startTime, performanceNumbers),
            result = yield getResult(db, performanceList);
        db.close();
        let resultJSON = JSON.stringify(result);
        fs.writeFileSync(outputFile, resultJSON);
        // 生成一个日志，记录操作时间、实际转换数量、本次转换开始时间、下次转换开始时间
        console.log('[' + new Date() + ']  ' + 'dumped number: ' + result.length + '    startTime: '
            + startTime + '    next_startTime: ' + result[result.length - 1].updatedAt.toISOString());
    } catch (e) {
        console.error(e);
    } finally {
        if(db)
            db.close();
    }
}

co(makePerformances());

