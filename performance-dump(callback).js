//npm: mongodb
let MongoClient = require('mongodb').MongoClient,
    assert = require('assert'),
    fs = require('fs');
    url = 'mongodb://localhost:3001/meteor';


let findPerformances = function(db, performanceNumbers, startTime, callback) {
    //这里的startTime是上次查询后最后一个的时间(updateAt)，因此本次查询需要大于这个时间
    let cursor = db.collection('Performances').find({"updatedAt": {$gt: startTime}}, {limit: performanceNumbers}).sort({"updatedAt": 1});
    cursor.count(function(err, numbers) {
        if(err) {
            console.error(err);
        } else {
            if(numbers === 0)
                callback(undefined, 0);
            cursor.each(function (err, doc) {
                assert.equal(err, null);
                if (doc != null) {
                    let sensorDataId = doc.sensorDataId;
                    db.collection('SensorDatas').findOne({_id: sensorDataId}, {}, function (err, result) {
                        if (err) {
                            console.error(err);
                        } else {
                            let performance = doc;
                            delete performance.sensorDataId;
                            performance.sensorData = result;
                            callback(performance, numbers);
                        }
                    });
                } else {
                    db.close();
                }
            });
        }
    });
};
let makePerformances = function(callback) {
    //前两个参数分别是node和程序位置，因此参数从第3个开始get
    let performanceNumbers = process.argv[2],
        startTime = process.argv[3],
        outputFile = process.argv[4],
        resultJSON;
    performanceNumbers = Number(performanceNumbers);
    if (performanceNumbers && isNaN(performanceNumbers)) {
        throw new Error("the first argument must be a number!");
    }
    MongoClient.connect(url, function (err, db) {
        let performances = [];
        assert.equal(null, err);
        findPerformances(db, performanceNumbers, new Date(startTime), function(performance, numbers) {
            //此处判断，如果Mongo里面没有新的数据，则提示：所有数据都已被转换
            if(numbers === 0) {
                let temporaryLog = new Date();
                temporaryLog += ': ';
                temporaryLog += 'All Performances Data in MongoDB have been transformed to JSON\n';
                console.log(temporaryLog);
                return;
            }
            performances.push(performance);
            if(performances.length === numbers) {
                resultJSON = JSON.stringify(performances);
                fs.writeFile(outputFile, resultJSON, (err) => {
                    if (err) {
                        throw err;
                        return;
                    }
                });
                //生成一个日志，记录操作时间、实际转换数量、本次转换开始时间、下次转换开始时间
                let temporaryLog = new Date();
                temporaryLog += ': ';
                temporaryLog += numbers;
                temporaryLog += '     startTime: ';
                temporaryLog += startTime;
                temporaryLog += '     next_startTime: ';
                temporaryLog += performance.updatedAt.toISOString();
                temporaryLog += '\n';
                console.log(temporaryLog);
            }
        });
    });
};

makePerformances();


