var winston = require('winston'),
    _ = require('lodash'),
    inquirer = require('inquirer'),
    moment = require('moment'),
    Burnhub = require('./burnhub'),
    github = require('./githubAdapter'),
    CsvOutput = require('./csvOutput'),
    HtmlOutput = require('./htmlOutput'),
    HTML_TEMPLATE = 'template/index.html',
    me = module.exports,
    user, repo, milestone, prefix, issues, pointsPerDay, start, end;

require('./StringExtras');

me.onReceivedIssues = function(receivedIssues) {
    var niceName = milestone.toLowerCase().replace(' ', '_'),
        csvFileName = niceName + '.csv',
        htmlFileName = niceName + '.html',
        burnhub,
        csvOutput, htmlOutput;

    issues = _.filter(receivedIssues, me.isInMilestone());
    burnhub = new Burnhub({
        milestone: milestone,
        issues: issues,
        labelPrefix: prefix,
        startDate: start,
        endDate: end
    });
    pointsPerDay = burnhub.calculatePointsPerDay();

    htmlOutput = new HtmlOutput(HTML_TEMPLATE);
    htmlOutput.apply({
        milestone: milestone,
        pointsPerDay: pointsPerDay
    }).then(function() {
        htmlOutput.saveTo(htmlFileName);
    }).then(function() {
        winston.info(htmlFileName, 'written');
    }).fail(me.onFail);

    csvOutput = new CsvOutput(pointsPerDay);
    csvOutput.saveTo(csvFileName)
        .then(function() {
            winston.info(csvFileName, 'written');
        }).fail(me.onFail);
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
            github.getIssues(user, repo)
                .then(me.onReceivedIssues)
                .fail(me.onFail);
        }
    );
};


me.start = function() {
    winston.cli();
    me.askForUserAndRepo();
};
