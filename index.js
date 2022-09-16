const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

const config = {
    fileDir: "files",
    destDir: "results",
    needles: [
        "SpGetSubjectByImageData",
        "CREATE_SHARED_ADHOC_INVESTIGATION"
    ]
}

// function to determine if a directory exists in the current directory
const ifDirExists = (dirNameStr) => {
    return fs.existsSync(path.join(__dirname, dirNameStr)) && fs.lstatSync(path.join(__dirname, dirNameStr)).isDirectory();
}

const getSplitLine = (lineStr) => {
    return lineStr.split(" ");
}

// function evaluates truthiness for finding needles in haystacks
const hasTrue = (haystack, conditionArray) => {
    let haystackArr = getSplitLine(haystack);
    let conditionEval = conditionArray.map((condition) => {
        return haystackArr.indexOf(condition) > 0;
    });
    for (i = 0; i < conditionEval.length; i++) {
        if (conditionEval[i] === true) return true;
    }
    return false;
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
    return fsPromises.readFile(path.join(__dirname, config.fileDir, fileName), 'utf8')
    .then((data) => {
        lineData = data.split('\n');
        whitespaceFilteredData = lineData.filter((line) => {
            return line.length > 1;
        });
        filteredData = whitespaceFilteredData.filter((line) => {
            return hasTrue(line, config.needles);
        });
        const result = {
            filename: path.join(__dirname, config.fileDir, fileName).replaceAll(/\\\\/g,'\\'),
            resultsFilename: path.join(__dirname,destinationDir,`${fileName}_resultsComplete`),
            logsInFile: whitespaceFilteredData.length,
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

// do the do
if (ifDirExists("files")) {
    if (!ifDirExists(config.destDir)) {
        fs.mkdirSync(path.join(__dirname, config.destDir));
    }
    const allResults = fileList()
    .then((data) => {
        data.dirFiles = data.map((value) => {
            return value.name;
        });
        return data;
    })
    .then((data) => {
        const allResults = data.dirFiles.map((fileName) => {
            return fileOps(fileName, config.destDir).then((result) => { return result});
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
        console.log("Log read and result write complete")
        return(data);
    })
    .catch((err) => {
        console.error(err);
    });

    allResults.then((data) => {
        const writeData = {
            files: data,
            fileNames: data.dirFiles,
            allResults: data.allResults,
            summary: data.summary
        }
        fs.writeFile(path.join(__dirname, config.destDir, "finalResults.txt"), JSON.stringify(writeData, null, 2).replaceAll(/\\\\/g,'\\'), (err) => {
            if (err) throw err;
        });
        console.log("Final Results file write complete");
    });
}