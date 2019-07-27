# UpMarkdown

This VS Code extension lets users update cross-referencing local links between **Markdown** files. The extension scans the file structure under a specified directory and stores that information in storage. A trigger can then be used to update the links according to the stored information when files are moved. [ToDo: define *trigger*].

## Features

- Scans file structure, storing file and folder locations in relation to a root directory.

- Updates links in files if the locations of the referred files have changed.

<!-- ## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something
 -->

## How it works

1. Select the main directory that serves as the root for links. The extension recursively looks for sub-directories.

1. For any non-directory file, assigns the name of the file as a key with the value as an object detailing that file. For example:

    ```typescript
    'file0.md': {
        path: '/articles/file0.md',
        hash: '9366a95710845fef95979a2d2073b577',
        links: {
          'file5.md': { relativePath: 'dir1/ ', locationsInFile: [85], lengthOfLink: 14 },
          'image1.png': { relativePath: 'media/', locationsInFile: [116, 150], lengthOfLink: 14 }
        }
    }
    ```

1. when done saving file structure into storage, go into each file and update the links in the text if they're outdated. For example:

    1. **file1** has references to both **file2** and **file3** in the following file structure:  
        dir1/file1  
        dir1/file2  
        dir1/dir2/file3  

    1. **file2** is moved to **dir2**:  
        dir1/file1  
        dir1/dir2/file2  
        dir1/dir2/file3  

    1. The extension scans and update the storage object:
        **file2.path** updates from **dir1** to **dir1/dir2**  
        **file2.links** stays the same  
        **file1.path** stays the same  
        **file1.links.file2** stays the same  

    1. The extension updates links for each of the files:
        *file2 links to other files are updated to reflect the relative path change of **file2**  
        any files that refer to **file2** are updated  

        ***Note***: if using absolute paths there's no need to update the links that are referred from the file that was moved.

<!-- 1. To convert app into continuously link updating, use fs.watch() to watch for files emitting the "rename" event:

"change" = file was edited => nothing
"rename" = file was renamed OR moved OR deleted => update references TO the file & FROM the file

1. When refactoring for watching/automatic updates change db to obj for faster performance: updating specific files instead of linear speed looping.
[ToDo: refactor db object to set] -->

## Known Issues

- Before continuous updates is implemented, changing a file's name and content without scanning in between those actions
will result in a new snapshot being created in storage without removing the old one, and other issues.

- No tolerance for non-unique file names at the moment, needs to be implemented.

<!-- ## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z. -->
