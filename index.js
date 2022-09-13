const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');

// function to determine if a directory exists in the current directory
const ifDirExists = (dirNameStr) => {
    return fs.existsSync(path.join(__dirname, dirNameStr)) && fs.lstatSync(path.join(__dirname, dirNameStr)).isDirectory();
}

// reads the content of the given directory and returns a list of files
const fileList = async () => {
    try {
        const options = {
            encoding: 'utf8',
            withFileTypes: true
        }
        const files = await fsPromises.readdir(path.join(__dirname,"files"), options);
        const fileArray = [];
        for (const file of files)
            fileArray.push(file);
        return fileArray;
        } catch (err) {
        console.error(err);
    }
}

// reads the files returned by the file list, checks them for search logs, dumps the search logs in a file, drops results in the file
const fileOps = async (fileName, destinationDir) => {
    try {
        const data = await fsPromises.readFile(path.join(__dirname,'files', fileName), 'utf8');
        lineData = data.split('\n');
        filteredData = lineData.filter((value) => {
            return value.indexOf('SpGetSubjectByImageData') > 0 && value.length > 1;
        });
        
        let result = {
            filename: path.join(__dirname,'files', fileName).replaceAll(/\\\\/g,'\\'),
            resultsFilename: path.join(__dirname,destinationDir,`${fileName}_resultsComplete`),
            logsInFile: Math.floor(lineData.length / 2),
            searchLogsInFile: filteredData.length
        }

        await fsPromises.writeFile(path.join(__dirname, destinationDir,`${fileName}_results`), filteredData);
        await fsPromises.appendFile(path.join(__dirname, destinationDir,`${fileName}_results`), JSON.stringify(result, null, 2).replaceAll(/\\\\/g,'\\'));
        await fsPromises.rename(path.join(__dirname, destinationDir,`${fileName}_results`), path.join(__dirname,destinationDir,`${fileName}_resultsComplete`));

        return result;
    } catch (err) {
        console.error(err);
    }
}


// set the result directory
let destinationDir = "results";

// do the do
if (ifDirExists("files")) {
    if (!ifDirExists(destinationDir)) {
        fs.mkdirSync(path.join(__dirname, destinationDir));
    }
    fileList()
    .then((data) => {
        data.dirFiles = data.map((value) => {
            return value.name;
        });
        return data;
    })
    .then((data) => {
        const results = [];
        data.dirFiles.forEach((fileName) => {
            results.push(fileOps(fileName, destinationDir));
        });
        data.allResults = results;
        return data;
    })
    .then((data) => {
        console.log(data);
    });
}

/*

    .then((data) => {
        data.allResults = data.dirFiles.map((fileName) => {
            return fileOps(fileName, destinationDir);
        });
        return data;
    })
    .then((data) => {
        console.log(data.allResults);
    });
}
*/