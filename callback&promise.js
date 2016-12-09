function plus1(a, b) {
    if (a == 0 || b == 0)
        throw new Error('a or b is empty!');
    return a + b;
}

function test1() {
    let a = 1;
    let b = 2;
    let c = 3;

    try {
        let tmp1 = plus1(a, b);
        let result = plus1(tmp1, c);
        console.log(result);
    } catch (e) {
        console.log(e);
    }
}


//callback(err,res)

function plus2(a, b, callback) {
    if (a == 0 || b == 0)
        callback('a or b is empty!', undefined);
    else
        callback(undefined, a + b);
}

function test2(callback){
    let a = 1;
    let b = 0;
    let c = 3;

    plus2(a, b, function(err,res){
        if (err){
            callback(err,undefined);
        } else{
            let tmp1 = res;
            plus2(tmp1, c, function(err,res){
                if (err){
                    callback(err,undefined);
                } else {
                    let result = res;
                    callback(undefine,result);
                }
            })
        }
    })
}

// test2(function(err,res){
//     if (err)
//         console.log(err);
//     else
//         console.log(res);
// });
//

function plus2Promise(a, b){
    return new Promise((resolve,reject) => {
        plus2(a, b, function(err, res){
            if (err)
                reject(err);
            else
                resolve(res);
        })
    });
}

function *test3(){
    let a = 1;
    let b = 2;
    let c = 3;

    try {
        let tmp1 = yield plus2Promise(a, b);
        let result = yield plus2Promise(tmp1, c);
        console.log(result);
    } catch (e) {
        console.log(e);
    }
}

const co = require('co');

co(test3);