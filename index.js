var github = require('octonode'),
    winston = require('winston'),
    _ = require('lodash'),
    fs = require('fs'),
    path = require('path'),
    Q = require('q'),
    inquirer = require('inquirer'),
    csv = require('tsv').CSV,
    moment = require('moment'),
    Mustache = require('Mustache'),
    Burnhub = require('./lib/burnhub'),
    client = github.client(),
    me = module.exports,
    user, repo, milestone, prefix, issues, pointsPerDay, start, end;

require('./lib/StringExtras');

me.getIssues = function() {
    var q = Q.defer(),
        ghrepo = client.repo(user + '/' + repo);
    ghrepo.issues({
        state: 'all'
    }, function(error, issues) {
        if (error) {
            q.reject(error);
        } else {
            q.resolve(issues);
        }
    });
    return q.promise;
};

me.onReceivedIssues = function(receivedIssues) {
    var filename = milestone.toLowerCase().replace(' ', '_') + '.csv',
        burnhub;

    issues = _.filter(receivedIssues, me.isInMilestone());
    burnhub = new Burnhub({
        milestone: milestone,
        issues: issues,
        labelPrefix: prefix,
        startDate: start,
        endDate: end
    });
    pointsPerDay = burnhub.calculatePointsPerDay();
    winston.info('Milestone:', milestone);
    winston.info('creating csv...');
    var tsvString = csv.stringify(pointsPerDay);
    winston.data('========================\n' + tsvString);
    winston.data('========================');
    inquirer.prompt([{
        type: 'expand',
        message: 'Write csv to ' + filename + '?',
        name: 'write',
        choices: [{
            key: 'y',
            name: 'write the file',
            value: true
        }, {
            key: 'n',
            name: 'don\'t write',
            value: false
        }]
    }], function(answers) {
        if (answers.write) {
            winston.info('write', filename, '...');
            fs.writeFile('./' + filename, tsvString, function(err) {
                if (err) {
                    winston.error(err);
                } else {
                    winston.info('The file was saved!');
                }
            });
        }


        filename = milestone.toLowerCase().replace(' ', '_') + '.html';
        inquirer.prompt([{
            type: 'expand',
            message: 'Write html with chart to ' + filename + '?',
            name: 'write',
            choices: [{
                key: 'y',
                name: 'write the file',
                value: true
            }, {
                key: 'n',
                name: 'don\'t write',
                value: false
            }]
        }], function(answers) {
            if (answers.write) {
                winston.info('write', filename, '...');
                fs.writeFile('./' + filename, tsvString, function(err) {
                    if (err) {
                        winston.error(err);
                    } else {
                        winston.info('The file was saved!');
                    }
                });
                Q.nfcall(fs.readFile, 'template/index.html')
                    .then(function(file) {
                        var data = {
                            milestone: milestone,
                            pointsPerDay: pointsPerDay
                        };

                        var output = Mustache.render(file.toString(), data);
                        return output;
                    })
                    .then(function(output) {
                        return Q.nfcall(fs.writeFile, filename, output);
                    })
                    .then(function(output) {
                        winston.info('The file was saved!');
                    })
                    .fail(me.onFail);

            }
        });
    });
};

me.isInMilestone = function() {
    return function(issue) {
        if (issue.milestone) {
            return issue.milestone.title === milestone;
        } else {
            return false;
        }
    };
};

me.hasStorypointLabel = function() {
    return function(issue) {
        if (issue.labels) {
            issue.labels = _.filter(issue.labels, function(label) {
                return label.name.startsWith(prefix);
            });
            return issue.labels.length > 0;
        } else {
            return false;
        }
    };
};

me.calculatePoints = function() {
    var days = [],
        totalPoints,
        done;
    pointsPerDay = [];
    for (var day = start; day.isBefore(end); day.add('days', 1)) {
        days.push(moment(day.format()));
    }
    days.push(moment(end.format()));
    done = 0;
    totalPoints = 0;
    _.forEach(days, function(day) {
        _.forEach(issues, function(issue) {
            _.forEach(issue.labels, function(label) {
                var points = parseInt(label.name.replace(prefix, ''));
                if (moment(issue.closed_at).format('MM.DD.YY') === day.format('MM.DD.YY')) {
                    done += points;
                }
                if (moment(issue.created_at).format('MM.DD.YY') === day.format('MM.DD.YY')) {
                    totalPoints += points;
                }
            });
        });
        pointsPerDay.push({
            date: moment(day).format('MM.DD.YYYY'),
            totalPoints: totalPoints,
            done: done,
            remaining: totalPoints - done
        });
    });

    me.calculateIdealLine();
};

me.calculateIdealLine = function() {
    _.forEach(pointsPerDay, function(item, key) {
        item.ideal = Math.floor((1 - (key+1) / pointsPerDay.length) * item.totalPoints);
    });
};

me.onFail = function(error) {
    console.error(error);
};

me.askForUserAndRepo = function() {
    inquirer.prompt([{
            type: 'input',
            name: 'user',
            message: 'Enter the name of the repo owner',
            validate: function(value) {
                return value !== '';
            }
        }, {
            type: 'input',
            name: 'repo',
            message: 'Enter a repo of the user',
            validate: function(value) {
                return value !== '';
            }
        }, {
            type: 'input',
            name: 'milestone',
            message: 'Enter the name of a milestone',
            validate: function(value) {
                return value !== '';
            }
        }, {
            type: 'input',
            name: 'prefix',
            message: 'Enter the prefix for the storypoints label',
            default: 'story-points-'
        }, {
            type: 'input',
            name: 'start',
            message: 'When did the sprint start (mm.dd.yy)',
            default: moment().subtract(3, 'weeks').format('MM.DD.YYYY'),
            validate: function(value) {
                return moment(value).isValid();
            }
        }, {
            type: 'input',
            name: 'end',
            message: 'When will/did the sprint end (mm.dd.yy)',
            default: moment().format('MM.DD.YYYY'),
            validate: function(value) {
                return moment(value).isValid();
            }
        }],
        function(answers) {
            winston.info('retrieving data from github...');
            user = answers.user;
            repo = answers.repo;
            milestone = answers.milestone;
            prefix = answers.prefix;
            start = moment(answers.start);
            end = moment(answers.end);
            me.getIssues()
                .then(me.onReceivedIssues)
                .fail(me.onFail);
        }
    );
};


me.start = function() {
    winston.cli();
    me.askForUserAndRepo();
};
