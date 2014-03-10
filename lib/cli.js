var winston = require('winston'),
    _ = require('lodash'),
    inquirer = require('inquirer'),
    Table = require('cli-table'),
    moment = require('moment'),
    Burnhub = require('./burnhub'),
    github = require('./githubAdapter'),
    CsvOutput = require('./csvOutput'),
    HtmlOutput = require('./htmlOutput'),
    HTML_TEMPLATE = 'template/index.html',
    me = module.exports,
    config;

require('./StringExtras');

me.onReceivedIssues = function(issues) {
    var niceName = config.milestone.toLowerCase().replace(' ', '_'),
        csvFileName = niceName + '.csv',
        htmlFileName = niceName + '.html',
        table = new Table(),
        burnhub, csvOutput, htmlOutput, pointsPerDay;

    config.issues = issues;
    burnhub = new Burnhub(config);
    pointsPerDay = burnhub.calculatePointsPerDay();
    inquirer.prompt([{
        type: 'checkbox',
        message: 'Do you want to...',
        name: 'what',
        choices: [{
            name: 'create a csv (' + csvFileName + ')',
            value: 'csv'
        }, {
            name: 'create a html (' + htmlFileName + ')',
            value: 'html'
        }]
    }], function(answers) {
        var what = answers.what;
        if (_.contains(what, 'csv')) {
            csvOutput = new CsvOutput(pointsPerDay);
            csvOutput.saveTo(csvFileName)
                .then(function() {
                    winston.info(csvFileName, 'written');
                }).fail(me.onFail);
        }
        if (_.contains(what, 'html')) {
            htmlOutput = new HtmlOutput(HTML_TEMPLATE);
            htmlOutput.apply({
                milestone: config.milestone,
                pointsPerDay: pointsPerDay
            }).then(function() {
                htmlOutput.saveTo(htmlFileName);
            }).then(function() {
                winston.info(htmlFileName, 'written');
            }).fail(me.onFail);
        }

        table.push(['Date', 'Total points', 'Remaining points']);
        _.forEach(pointsPerDay, function(item) {
            table.push([item.date, item.totalPoints, item.remaining]);
        });
        winston.data('========================\n' + table.toString());
        winston.data('========================');
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
            name: 'labelPrefix',
            message: 'Enter the prefix for the storypoints label',
            default: 'story-points-'
        }, {
            type: 'input',
            name: 'startDate',
            message: 'When did the sprint start (mm.dd.yy)',
            default: moment().subtract(3, 'weeks').format('MM.DD.YYYY'),
            validate: function(value) {
                return moment(value).isValid();
            }
        }, {
            type: 'input',
            name: 'endDate',
            message: 'When will/did the sprint end (mm.dd.yy)',
            default: moment().format('MM.DD.YYYY'),
            validate: function(value) {
                return moment(value).isValid();
            }
        }],
        function(answers) {
            winston.info('retrieving data from github...');
            config = {
                user: answers.user,
                repo: answers.repo,
                milestone: answers.milestone,
                labelPrefix: answers.labelPrefix,
                startDate: moment(answers.startDate),
                endDate: moment(answers.endDate)
            };
            github.getIssues(config.user, config.repo)
                .then(me.onReceivedIssues)
                .fail(me.onFail);
        }
    );
};


me.start = function() {
    winston.cli();
    me.askForUserAndRepo();
};
