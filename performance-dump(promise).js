//npm: mongodb, commander
let MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    fs = require('fs');
    // url = 'mongodb://localhost:3001/meteor';

let program = require('commander');
program
    .version('0.0.1')
    .option('-i, --integer <n>', 'An integer argument', parseInt)
    .option('-t, --time <time>', 'The start time of dumping')
    .option('-u, --url <url>', 'The url of the MongoDB to connect to')
    .option('-f, --file <file>', 'The name of output file')
    .parse(process.argv);

function getPerformancePromise(db, startTime, performanceNumbers) {
    return new Promise(function (resolve, reject) {
        db.collection('Performances').find({"updatedAt": {$gt: startTime}}, {limit: performanceNumbers}).sort({"updatedAt": 1}).toArray((err, performanceList) => {
            if (err) {
                reject(err);
            } else {
                resolve(performanceList);
            }
        });
    });
}

function getSensorDataPromise(db, performance) {
    return new Promise(function (resolve, reject) {
       db.collection('SensorDatas').findOne({_id: performance.sensorDataId}, {}, function(err, sensorData) {
           if (err) {
               reject(err);
           } else {
               delete performance.sensorDataId;
               performance.sensorData = sensorData;
               resolve(performance);
           }
       });
    });
}

let makePerformances = function() {

    let performanceNumbers = program.integer || null,
        startTime = new Date(program.time),
        outputFile = program.file,
        url = program.url;
    if (outputFile === undefined || outputFile === null)
        throw new Error("Please use -f to input the name of the output file!");
    if (url === null)
        throw new Error("Please use -u to input the url of MongoDB!");
    if (program.time === undefined)
        throw new Error("Please use -t to input the start time of dumping!");
    if (isNaN((startTime).getTime()))
        throw new Error("Check the format of the start time you've just inputted!");

    MongoClient.connect(url, function (err, db) {
        if (err) {
            throw new Error("MongoClient connect Error!");
        } else {
            getPerformancePromise(db, startTime, performanceNumbers).then(function (performanceList) {
                let performancePromises = [];
                for (let i of performanceList)
                    performancePromises.push(getSensorDataPromise(db, i));
                Promise.all(performancePromises).then(function (result) {
                    // console.log(result);
                    db.close();
                    let resultJSON = JSON.stringify(result);
                    fs.writeFileSync(outputFile, resultJSON);
                    // 生成一个日志，记录操作时间、实际转换数量、本次转换开始时间、下次转换开始时间
                    console.log(new Date() + ':  ' + 'dumped number: ' + result.length + '    startTime: ' + startTime + '    next_startTime: ' + result[result.length - 1].updatedAt.toISOString());
                }).catch(error => console.log(error));
            }).catch(error => console.log(error));
        }
    });
};

makePerformances();

