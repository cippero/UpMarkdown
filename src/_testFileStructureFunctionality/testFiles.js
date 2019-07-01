"use strict";
/*
1. select mother directory and assign Path var to the name of the mother directory

2. recursively look for other directories, if exists go in and add name of directory to Path var

3. if not directory, assign name of file as key with the value as an object with Path var and
location in file of all links to update (what if two files in different locations have the same name?)

example fs:
dir1/file1
dir1/file2
dir1/dir2
dir1/dir2/file3
dir1/dir2/dir3
dir1/dir2/dir3/file4

- dir1 is mother directory, Path = "dir1"
- file1 is saved as file1 = {path: path, links: {fileName: (position, length)}}
file1.path -> "dir1"
file1.links.file2 -> (600, 32)


4. when done saving fs into an object/database, go into each file and update the links in the text.
*if using relative paths instead of absolute, another step after this one will require to update the
length value of each link reference*

example fs if file1 has references to both file2 and file3:
dir1/file1
dir1/file2
dir1/dir2/file3

file2 moved to dir2:
dir1/file1
dir1/dir2/file2
dir1/dir2/file3

first, scan and update the fs object:
file2.path updates from "dir1" to "dir1/dir2", based on Path var
file2.links stays the same
file1.path stays the same
file1.links.file2 stays the same

then, update links:
file2.path & file2.links stays the same
file1.path stays the same
file1 link to file2 in the text is updated based on new path of file2 minus current path
*file1.links.file2 is updated with the new length

*length doesn't need to be updated if only using absolute paths*

5. To convert app into continuously link updating, use fs.watch() to watch for files emitting the "rename" event:

"change" = file was edited => nothing
"rename" = file was renamed OR moved OR deleted => update references TO the file & FROM the file

*/
exports.__esModule = true;
var fs = require("fs");
var crypto = require("crypto");
var sampleIPath = {
    path: 'samplePath',
    hash: 'temp',
    links: {
        'sampleLink': {
            locationInFile: 1,
            lengthOfLink: 1
        }
    }
};
var dbSample = {
    'sampleFile': sampleIPath
};
var UpMarkdown = /** @class */ (function () {
    function UpMarkdown() {
        this.db = {};
    }
    UpMarkdown.prototype.printStorage = function () {
        console.log("***************************************\n" + JSON.stringify(this.db));
        for (var item in this.db) {
            console.log("######################################\n" + item);
        }
    };
    //scan for fs snapshot initially (and when a file is edited?)
    UpMarkdown.prototype.scanFiles = function (directory) {
        var _this = this;
        fs.readdir(directory, function (err, files) {
            if (err) {
                throw err;
            }
            // console.log(directory);
            // const currentDirectory = __dirname.replace(/.*\//, '');
            for (var i in files) {
                var currentFile = directory + '/' + files[i];
                if (fs.existsSync(currentFile)) {
                    var stats = fs.lstatSync(currentFile);
                    if (stats.isDirectory()) {
                        // console.log('###', currentFile);
                        _this.scanFiles(currentFile);
                    }
                    else if (stats.isFile() && /^.+\.md$/.test(currentFile)) {
                        // console.log('***', currentFile);
                        // this.extractLinks(currentFile);
                        _this.addFileToStorage(files[i], currentFile);
                    }
                }
            }
        });
    };
    //add or update the file's data in the fs snapshot
    UpMarkdown.prototype.addFileToStorage = function (fileName, filePath) {
        // file exists in db? update : add;
        // console.log(`file value is: "${file}"`);
        // console.log(`typeof: ${typeof db[file]}, value: ${db[file]}`);
        var hash = crypto.createHash('md5').update(fs.readFileSync(filePath, 'utf8')).digest("hex");
        if (typeof this.db[fileName] !== 'undefined') {
            if (this.db[fileName].hash !== hash) {
                this.updateLinks(filePath);
                // console.log(`2. Updated LINKS for: ${fileName}.`);
            }
            if (this.db[fileName].path !== filePath) {
                this.updatePath(fileName, filePath);
                // console.log(`2. Updated PATH for: ${fileName}.`);
            }
        }
        else {
            this.db[fileName] = this.createSnapshot(fileName, filePath, hash, this.extractLinks(filePath));
            // console.log(`2. Added ${fileName}.`);
            console.log('**************************');
            console.log(this.db);
        }
        // console.log(`2. ${fileName} wasn't modified. Didn't update.`);
    };
    UpMarkdown.prototype.updateLinks = function (filePath) {
    };
    UpMarkdown.prototype.updatePath = function (fileName, filePath) {
    };
    UpMarkdown.prototype.extractLinks = function (file) {
        // const data = fs.readFileSync(file, 'utf8');
        // const hash = crypto.createHash('md5').update(data).digest("hex");
        // console.log(file);
        // const links = data.match(/\[(.+)\])\[|\(/g);
        // console.log(file, hash);
        return {
            'link1': { locationInFile: 10, lengthOfLink: 11 },
            'link2': { locationInFile: 11, lengthOfLink: 12 }
        };
    };
    UpMarkdown.prototype.createSnapshot = function (fileName, path, hash, links) {
        return { path: path, hash: hash, links: links };
    };
    //watch for file edits
    UpMarkdown.prototype.watchFiles = function () {
        var _this = this;
        fs.watch(__dirname, { recursive: true }, function (eventType, filename) {
            if (filename) {
                console.log("1. " + filename + ": " + eventType);
                if (eventType === 'rename') {
                    _this.addFileToStorage('file1', sampleIPath.path);
                    console.log('3.', _this.db);
                }
            }
        });
    };
    return UpMarkdown;
}());
var uMd = new UpMarkdown();
uMd.scanFiles('/home/gilwein/code/temp/upmarkdown/src/_testFileStructureFunctionality');
uMd.printStorage();
