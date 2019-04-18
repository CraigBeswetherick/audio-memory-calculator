const mm = require('music-metadata');
const find = require('find');
const argv = require('yargs').argv;
const fs = require('fs');
const chalk = require('chalk');

const WARNING_THRESHOLD = 50; //mb

let totalMemoryUsage = 0;
let reportList = [];

const getFiles = () => {
    return find.fileSync(/\.wav$/, argv.path, function(files) {
        return files;
    });
}

const parseFiles = (audioFiles) => {
  
    const audioFile = audioFiles.shift();

    if (audioFile) {
        return mm.parseFile(audioFile).then(metadata => {

            // convert from bytes to MB
            const memoryUsage = Number((metadata.format.duration * metadata.format.bitrate * metadata.format.numberOfChannels / 1000000).toFixed(2));
            const fileReport = {
                duration: Math.round(metadata.format.duration) + ' seconds',
                bitrate: metadata.format.bitrate,
                numberOfChannels: metadata.format.numberOfChannels,
                sampleRate: metadata.format.sampleRate,
                path: audioFile,
                memoryUsage
            }

            reportList.push(fileReport);

            totalMemoryUsage += memoryUsage;

            return parseFiles(audioFiles);
        })
    }

    return Promise.resolve();
}

const calcPercent = () => {
    reportList.forEach((report) => {
        report.percentOfRamConsumed = (report.memoryUsage / totalMemoryUsage * 100).toFixed(2) + '%'
        // we also give the memoryUsage value a label here.
        report.memoryUsage = report.memoryUsage + 'MB';
    })
}

const inspectAudio = () => {

    const files = getFiles();

    parseFiles(files).then(() => {

        calcPercent();

        const data = JSON.stringify({
            'totalMemoryUsage': totalMemoryUsage.toString() + 'MB',
            'warning-threshold': WARNING_THRESHOLD,
            reportList
        }, null, 2);

        fs.writeFile(argv.path + 'report.txt', data, 'utf8', () => {
            const color = totalMemoryUsage <= WARNING_THRESHOLD ? chalk.green : chalk.red;
            const message = totalMemoryUsage > WARNING_THRESHOLD ? '!!!CONSIDER REDUCING MEMORY!!!' : '!!!MEMORY USAGE OK!!!';
            console.log(color('Total Audio Memory ' + totalMemoryUsage + ' MB ' + message) + '\n' + 'Report published at : ' + argv.path + 'report.txt');
        });
    })
}

module.export = inspectAudio;
