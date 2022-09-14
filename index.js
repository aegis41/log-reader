const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// function to determine if a directory exists in the current directory
const ifDirExists = (dirNameStr) => {
    return fs.existsSync(path.join(__dirname, dirNameStr)) && fs.lstatSync(path.join(__dirname, dirNameStr)).isDirectory();
}

// reads the content of the given directory and returns a list of files
const fileList = async () => {
    const options = {
        encoding: 'utf8',
        withFileTypes: true
    }
    return await fsPromises.readdir(path.join(__dirname,"files"), options)
    .then((files) => {
        const fileArray = [];
        for (const file of files)
            fileArray.push(file);
        return fileArray;
    })
    .catch((err) => {
        console.error(err);
    });
};

// reads the files returned by the file list, checks them for search logs, dumps the search logs in a file, drops results in the file
const fileOps = (fileName, destinationDir) => {
    return fsPromises.readFile(path.join(__dirname,'files', fileName), 'utf8')
    .then((data) => {
        lineData = data.split('\n');
        filteredData = lineData.filter((value) => {
            return value.indexOf('SpGetSubjectByImageData') > 0 && value.length > 1;
        });
        const result = {
            filename: path.join(__dirname,'files', fileName).replaceAll(/\\\\/g,'\\'),
            resultsFilename: path.join(__dirname,destinationDir,`${fileName}_resultsComplete`),
            logsInFile: Math.floor(lineData.length / 2),
            searchLogsInFile: filteredData.length
        };
        return result;
    })
    .then((result) => {
        fsPromises.writeFile(path.join(__dirname, destinationDir,`${fileName}_results`), filteredData)
        .then(() => {
            fsPromises.appendFile(path.join(__dirname, destinationDir,`${fileName}_results`), JSON.stringify(result, null, 2).replaceAll(/\\\\/g,'\\'))
            .then(() => {
                fsPromises.rename(path.join(__dirname, destinationDir,`${fileName}_results`), path.join(__dirname,destinationDir,`${fileName}_resultsComplete`))
            })
        })
        return result;
    })
    .then((result) => {
        return result;
    }).catch ((err) => {
        console.error(err);
    })
}

// set the result directory
let destinationDir = "results";

// do the do
if (ifDirExists("files")) {
    if (!ifDirExists(destinationDir)) {
        fs.mkdirSync(path.join(__dirname, destinationDir));
    }
    const logReadResults = fileList()
    .then((data) => {
        data.dirFiles = data.map((value) => {
            return value.name;
        });
        return data;
    })
    .then((data) => {
        const allResults = data.dirFiles.map((fileName) => {
            return fileOps(fileName, destinationDir).then((result) => { return result});
        });
        return Promise.all(allResults).then((resolvedPromises) => {
            data.allResults = resolvedPromises;
            return data;
        })
    })
    .then((data) => {
        return(data);
    })
    .then((data) => {
        data.summary = {
            logsProcessed: 0,
            searchLogsFound: 0
        };
        data.allResults.forEach((result) => {
            data.summary.logsProcessed += result.logsInFile;
            data.summary.searchLogsFound += result.searchLogsInFile;
        });
        console.log(data);
        return(data);
    })
    .catch((err) => {
        console.error(err);
    });
}