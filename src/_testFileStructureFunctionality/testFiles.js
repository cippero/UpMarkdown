"use strict";
exports.__esModule = true;
var fs = require("fs");
var crypto = require("crypto");
// const sampleIPath: IPath = {
//   path: '/home/gilwein/code/temp/upmarkdown/src/_testFileStructureFunctionality/file0.md',
//   hash: '9366a95710845fef95979a2d2073b577',
//   links: {
//     'file10.md': { absPath: '', relPath: 'dir1 / ', locationsInFile: [85], lengthOfLink: 14 },
//     'test.png': { absPath: '', relPath: 'media/', locationsInFile: [116], lengthOfLink: 14 }
//   }
// };
// let dbSample: IPaths = {
//   'file0.md': sampleIPath
// };
var UpMarkdown = /** @class */ (function () {
    function UpMarkdown(dirInput, dbInput) {
        this._RE = new RegExp(/\[.+?\](\(|:\s)(?!https?|www|ftps?)([^\)|\s]+)/, 'g');
        this.db = dbInput || {};
        // this.set = new Set();
        this.rootDirectory = dirInput;
    }
    //scan for fs snapshot initially (and when a file is edited?)
    UpMarkdown.prototype.scanFiles = function (directory) {
        var _this = this;
        if (directory === '') {
            throw new Error('No input directory specified.');
        }
        fs.readdir(directory, function (err, files) {
            if (err) {
                throw err;
            }
            for (var i in files) {
                var currentFile = directory + '/' + files[i];
                if (fs.existsSync(currentFile)) {
                    var stats = fs.lstatSync(currentFile);
                    if (stats.isDirectory()) {
                        _this.scanFiles(currentFile);
                    }
                    else if (stats.isFile() && /^.+\.md$/.test(currentFile)) {
                        _this.SaveOrUpdateFile(files[i], currentFile);
                        // console.log(`fileName: ${files[i]} \nfilePath: ${currentFile}`);
                    }
                }
            }
        });
    };
    //save or update the file's data in storage
    UpMarkdown.prototype.SaveOrUpdateFile = function (fileName, filePath) {
        // file exists in db? update : add;
        var hash = crypto.createHash('md5').update(fs.readFileSync(filePath, 'utf8')).digest("hex");
        if (typeof this.db[fileName] !== 'undefined') {
            console.log("2. " + fileName + " already exists in storage.");
            if (this.db[fileName].hash !== hash) {
                this.db[fileName].links = this.extractLinks(filePath);
                console.log("  Updated $LINKS for " + fileName + ".");
                // } else {
                // console.log(`  Didn't update $LINKS for ${fileName} - hash hasn't changed:\n
                // old: ${this.db[fileName].hash}\n
                // new: ${hash}`);
            }
            if (this.db[fileName].path !== filePath) {
                this.db[fileName].path = filePath;
                console.log("  Updated $PATH for " + fileName + ".");
                this.updateRefs(fileName, filePath);
                // } else {
                //   console.log(`  Didn't update $PATH for ${fileName} - path hasn't changed:\n
                //   old: ${this.db[fileName].path}\n
                //   new: ${filePath}`);
            }
        }
        else {
            console.log('**************************');
            console.log("2. Adding " + fileName + ".");
            this.db[fileName] = {
                hash: hash,
                path: filePath,
                links: this.extractLinks(filePath)
            };
            console.log("2. Added " + fileName + ".");
            console.log('**************************');
            // console.log(this.db);
        }
        // console.log(`2. ${fileName} wasn't modified. Didn't update.`);
    };
    UpMarkdown.prototype.extractLinks = function (filePath) {
        console.log("---Extracting links for file \"" + filePath.substring(filePath.lastIndexOf("/") + 1) + "\".");
        var data = fs.readFileSync(filePath, 'utf8');
        var match, matches = {};
        do {
            match = this._RE.exec(data);
            if (match !== null) {
                var fileName = match[2].substring(match[2].lastIndexOf("/") + 1);
                console.log("link: " + fileName);
                matches[fileName].path = this.db[fileName].path;
                matches[fileName].linkInstances.push({
                    locationInFile: match.index,
                    lengthOfLink: match[2].length
                });
                console.log("---In file \"" + filePath.substring(filePath.lastIndexOf("/") + 1) + "\": Found a link to file \"" + fileName + "\" at index " + match.index + ".");
            }
        } while (match);
        // while ((match = this._RE.exec(data)) !== null) {
        //   // console.log(this._RE.exec(data));
        //   // console.log('here');
        //   // console.log(`Iteration ${iterations++} - RE matches in "${file}": \n  ${match}`);
        //   const fileName: string = match[2].substring(match[2].lastIndexOf("/") + 1);
        //   // const relPath: string = match[2];
        //   console.log(`link: ${fileName}`);
        //   matches[fileName].path = this.db[fileName].path;
        //   matches[fileName].linkInstances.push({
        //     locationInFile: match.index,
        //     lengthOfLink: match[2].length,
        //   });
        //   console.log(`---In file "${filePath.substring(filePath.lastIndexOf("/") + 1)}": Found a link to file "${fileName}" at index ${match.index}.`);
        // }
        return matches;
    };
    //update references to current file
    UpMarkdown.prototype.updateRefs = function (fileName, filePath) {
        // loop through db, for any file that has links to this file, update its relative path
        for (var file in this.db) {
            for (var link in this.db[file].links) {
                if (link === fileName) {
                    var newPath = ''; // resolve based on currentPath and filePath
                    this.db[file].links[link].path = newPath;
                    //   this.db[file].links[link] = {
                    //     absPath: '',
                    //     relPath: 'dir1/',
                    //     locationsInFile: [85],
                    //     lengthOfLink: 5
                    //   };
                    // for (let loc in this.db[file].links[link].locationsInFile) {
                    //   // edit file content with new link
                    // }
                }
            }
        }
    };
    return UpMarkdown;
}());
exports.UpMarkdown = UpMarkdown;
var Umd = new UpMarkdown(__dirname);
Umd.scanFiles(Umd.rootDirectory);
exports.printLinks = function (db) {
    var links = 0;
    setTimeout(function () {
        console.log('------------------------');
        for (var file in db) {
            links += Object.keys(db[file].links).length;
            var fileName = db[file].path.slice(db[file].path.lastIndexOf('/') + 1);
            console.log("----" + fileName + ":");
            console.log(db[file].links);
            //   const fileLinks: number = Object.keys(uMd.db[file].links).length;
            //   if (fileLinks > 0) { links += fileLinks; }
        }
        console.log(links + " links found");
        console.log('------------------------');
    }, 100);
};
// printLinks(uMd.db);
/* ------------------------ToDoS
1. Fix logic not picking up all files/links atm
*/
