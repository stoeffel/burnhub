var Mustache = require('Mustache'),
    Q = require('q'),
    fs = require('fs'),
    HtmlOutput;

HtmlOutput = function(template) {
    this.template = template;
};

HtmlOutput.prototype.apply = function(data) {
    var q = Q.defer(),
        me = this;
    Q.nfcall(fs.readFile, this.template)
        .then(function(template) {
            me.output = Mustache.render(template.toString(), data);
            q.resolve();
        });
    return q.promise;
};

HtmlOutput.prototype.saveTo = function(fileName) {
    return Q.nfcall(fs.writeFile, './' + fileName, this.output);
};

module.exports = HtmlOutput;
