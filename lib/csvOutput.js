var csv = require('tsv').CSV,
    fs = require('fs'),
    Q = require('q'),
    CsvOutput;

CsvOutput = function(data) {
    this.data = data;
    this.output = csv.stringify(data);
};

CsvOutput.prototype.saveTo = function(fileName) {
    return Q.nfcall(fs.writeFile, './' + fileName, this.output);
};

module.exports = CsvOutput;
