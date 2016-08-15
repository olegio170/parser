const mysql = require('mysql');
var request = require('request');
var cheerio = require("cheerio");
var SimpleNodeLogger = require('simple-node-logger');
var url_pattern = "http://stats.wogames.info/player/";

var opts = {
        logFilePath:'logfile.log',
        timestampFormat:'YYYY-MM-DD HH:mm:ss.SSS'
    };
var log = SimpleNodeLogger.createSimpleLogger( opts );


var databaseConfigObj  = {
    host     : 'localhost',
    user     : 'root',
    password : '123qwerty123',
    database : 'wog'
};

var database = mysql.createConnection(databaseConfigObj);

// die if database is offline
database.connect(function(err) {
    if(err != null) {
        log.info(err);
        throw err;
    }
});

function sendRequest (i, callback) {
    var url = url_pattern + i +"/";
    request(url, function (error, response, body) {
        var values = [];
        if (!error) {
            var $ = cheerio.load(body);

            var empty = $(".site-error").text();

            if(!empty) {
                var id = $(".action").attr('data-id');
                values.push(id);
                log.info("ID:" + id);

                var nickname = $("h3").text().slice(21);
                values.push(nickname);
                log.info(nickname);


                for (var i = 1; i <= 11; i++) {
                    var property = $("table[class != table-weapons] > tbody > tr:nth-child(" + i + ") > td").html();
                    if(property === null){
                        property = 0;
                    }
                    values.push(property);
                    log.info(property);
                }

                insertInToDatabase(values);
                log.info("----------------------------------");
            }
        } else {
            log.warn("Error: " + error);
            log.info("----------------------------------");
        }
        callback();
    });
}


function insertInToDatabase(values) {
    var sql = 'INSERT INTO players_stat (user_id,nickname,games,deaths,deaths_in_10_min,in_vehicle_deaths,' +
        'deaths_from_teammates,vitality,frags,killed_in_vehicle,frags_per_game,teamkills,teamkills_per_game) ' +
        'VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)';

    database.query(sql , values, function (err) {
        if (err != null) {
            log.error(err);
        }
        log.info('INSERTED SQL: ' + sql + '/n VALUES: ' + values);
    });
}

function asyncLoop(interations,func,callback) {
    var index = 0;
    var done = false;
    var loop = {
        next: function(){
            if(done) {
                return
            }

            if(index < interations) {
                index++;
                func(loop);
            }else {
                done = true;
                callback();
            }
        },

        iteration: function() {
            return index - 1;
        },
    };
    loop.next();
    return loop;
}

asyncLoop(10000, function(loop) {
        sendRequest(loop.iteration(),function(result) {

            log.info(loop.iteration);

            loop.next();
        })},
    function(){log.info('cycle ended')}
);
